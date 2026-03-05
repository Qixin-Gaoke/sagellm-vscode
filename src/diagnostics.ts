/**
 * diagnostics.ts
 *
 * Automatic health checks and self-repair for common SageLLM setup problems:
 *   1. Incomplete / corrupt model downloads  (.incomplete blobs in HF cache)
 *   2. Outdated isagellm / isagellm-core pip packages
 *
 * Public surface used by extension.ts and serverLauncher.ts:
 *   - isModelDownloadCorrupt(modelId)
 *   - offerRepairIfCorrupt(modelId)          → called before serve
 *   - repairModelDownload(modelId)            → called from diagnostics panel
 *   - checkPackagesIfDue(context)             → background check, once/day
 *   - runFullDiagnostics(modelIds)            → full scan for the command
 *   - showDiagnosticsPanel(result, context)   → interactive repair QuickPick
 */

import * as vscode from "vscode";
import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as https from "https";

// ─────────────────────────────────────────────────────────────────────────────
// HF cache helpers
// ─────────────────────────────────────────────────────────────────────────────

function hfCacheDir(): string {
  return (
    process.env["HF_HOME"] ??
    path.join(os.homedir(), ".cache", "huggingface", "hub")
  );
}

function hfDirName(modelId: string): string {
  return "models--" + modelId.replace(/\//g, "--");
}

// ─────────────────────────────────────────────────────────────────────────────
// Incomplete-download detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return all `.incomplete` blob paths for a cached model.
 *
 * huggingface_hub writes `<sha>.incomplete` while a shard is downloading and
 * renames it on completion.  If the process is killed mid-shard the stub file
 * is left behind, causing `safetensors` / `transformers` to crash at load time
 * with a "file too small" or "unexpected EOF" error.
 *
 * Returns [] when the model cache is clean or the directory does not exist.
 */
export function findIncompleteBlobs(modelId: string): string[] {
  const dir = path.join(hfCacheDir(), hfDirName(modelId), "blobs");
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".incomplete"))
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

/** True when the model cache exists AND has at least one `.incomplete` shard. */
export function isModelDownloadCorrupt(modelId: string): boolean {
  return findIncompleteBlobs(modelId).length > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repair: remove stubs and resume download
// ─────────────────────────────────────────────────────────────────────────────

/**
 * If the model has corrupt blobs, show a modal asking the user to repair.
 *
 * Returns:
 *   - `true`  → safe to proceed (clean cache, user chose "skip", or repair OK)
 *   - `false` → repair was attempted but failed — do NOT start the engine
 */
export async function offerRepairIfCorrupt(modelId: string): Promise<boolean> {
  const incomplete = findIncompleteBlobs(modelId);
  if (incomplete.length === 0) return true;

  const choice = await vscode.window.showWarningMessage(
    `SageLLM: "${modelId}" 下载不完整（${incomplete.length} 个文件损坏）。` +
      `加载时会报错，建议修复后再启动。`,
    { modal: true },
    "修复下载",
    "跳过（可能失败）"
  );

  if (choice !== "修复下载") return true; // user consciously proceeds
  return repairModelDownload(modelId, incomplete);
}

/**
 * Remove `.incomplete` stubs, then run `huggingface-cli download --resume-download`.
 * Shows a cancellable VS Code progress notification with live speed / ETA.
 */
export async function repairModelDownload(
  modelId: string,
  knownIncomplete?: string[]
): Promise<boolean> {
  const files = knownIncomplete ?? findIncompleteBlobs(modelId);

  // Deleting the stubs forces huggingface_hub to re-download those shards
  for (const f of files) {
    try {
      fs.unlinkSync(f);
    } catch {
      /* already gone — ignore */
    }
  }

  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `SageLLM: 修复 ${modelId} — ${files.length} 个文件`,
      cancellable: true,
    },
    (progress, token) =>
      new Promise<boolean>((resolve) => {
        const proc = cp.spawn(
          "huggingface-cli",
          ["download", modelId, "--resume-download"],
          { env: { ...process.env } }
        );

        let lastPct = 0;
        const parseLine = (line: string) => {
          const m = line.match(/(\d+)%\|/);
          if (!m) return;
          const pct = parseInt(m[1], 10);
          const inc = pct - lastPct;
          if (inc > 0) {
            lastPct = pct;
            const speed = line.match(/[\d.]+\s*[MG]B\/s/)?.[0] ?? "";
            const eta = line.match(/<([\d:]+),/)?.[1] ?? "";
            progress.report({
              increment: inc,
              message: `${pct}%${speed ? "  " + speed : ""}${
                eta ? "  ETA " + eta : ""
              }`,
            });
          }
        };

        proc.stderr.on("data", (d: Buffer) =>
          d.toString().split(/\r?\n/).forEach(parseLine)
        );
        proc.stdout.on("data", (d: Buffer) =>
          d.toString().split(/\r?\n/).forEach(parseLine)
        );

        proc.on("close", (code) => {
          if (code === 0) {
            progress.report({ increment: 100 - lastPct, message: "完成 ✓" });
            vscode.window.showInformationMessage(
              `✅ SageLLM: ${modelId} 修复完成`
            );
            resolve(true);
          } else if (token.isCancellationRequested) {
            resolve(false);
          } else {
            vscode.window.showErrorMessage(`SageLLM: 修复失败 (exit ${code})`);
            resolve(false);
          }
        });

        proc.on("error", (err) => {
          vscode.window.showErrorMessage(
            `SageLLM: 无法运行 huggingface-cli — ${err.message}`
          );
          resolve(false);
        });

        token.onCancellationRequested(() => {
          proc.kill("SIGTERM");
          resolve(false);
        });
      })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Package version checks
// ─────────────────────────────────────────────────────────────────────────────

export interface PackageVersionInfo {
  name: string;
  installed: string;
  latest: string;
  needsUpgrade: boolean;
}

/** `pip show <pkg>` → installed version, or "" if not found. */
function getInstalledVersion(pkg: string): string {
  try {
    const out = cp
      .execSync(`pip show ${pkg} 2>/dev/null`, { timeout: 8000 })
      .toString();
    return out.match(/^Version:\s*(.+)$/m)?.[1]?.trim() ?? "";
  } catch {
    return "";
  }
}

/** Hit the PyPI JSON API to get the current latest release version. */
function getLatestPyPIVersion(pkg: string): Promise<string> {
  return new Promise((resolve) => {
    const req = https.get(
      `https://pypi.org/pypi/${encodeURIComponent(pkg)}/json`,
      { timeout: 8000 },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve((JSON.parse(data) as { info?: { version?: string } }).info?.version ?? "");
          } catch {
            resolve("");
          }
        });
      }
    );
    req.on("error", () => resolve(""));
    req.on("timeout", () => {
      req.destroy();
      resolve("");
    });
  });
}

/** True if version string `a` is strictly newer than `b` (dot-separated ints). */
function isNewer(a: string, b: string): boolean {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const va = pa[i] ?? 0,
      vb = pb[i] ?? 0;
    if (va > vb) return true;
    if (va < vb) return false;
  }
  return false;
}

const WATCHED_PACKAGES = ["isagellm", "isagellm-core"];

/**
 * Query installed + PyPI versions for all watched packages.
 * Skips packages that are not installed; silently skips on PyPI timeout.
 */
export async function checkPackageVersions(): Promise<PackageVersionInfo[]> {
  const results: PackageVersionInfo[] = [];
  for (const pkg of WATCHED_PACKAGES) {
    const installed = getInstalledVersion(pkg);
    if (!installed) continue;
    const latest = await getLatestPyPIVersion(pkg);
    if (!latest) continue;
    results.push({
      name: pkg,
      installed,
      latest,
      needsUpgrade: isNewer(latest, installed),
    });
  }
  return results;
}

/**
 * Background package-version check, throttled to once every 24 hours.
 * On outdated packages: shows a single notification with an "立即升级" button.
 * Never throws — safe to fire-and-forget.
 */
export function checkPackagesIfDue(context: vscode.ExtensionContext): void {
  const KEY = "sagellm.lastPackageCheckTs";
  const last = context.globalState.get<number>(KEY, 0);
  const ONE_DAY = 24 * 60 * 60 * 1000;
  if (Date.now() - last < ONE_DAY) return;

  context.globalState.update(KEY, Date.now());
  checkPackageVersions()
    .then((pkgs) => {
      const outdated = pkgs.filter((p) => p.needsUpgrade);
      if (outdated.length === 0) return;
      const lines = outdated
        .map((p) => `${p.name} ${p.installed}→${p.latest}`)
        .join(", ");
      vscode.window
        .showWarningMessage(
          `SageLLM: 有新版本可用 — ${lines}`,
          "立即升级",
          "稍后"
        )
        .then((choice) => {
          if (choice === "立即升级") upgradePackagesInTerminal(outdated);
        });
    })
    .catch(() => {
      /* network unavailable — silent */
    });
}

/** Open a terminal and run pip install -U for the given outdated packages. */
export function upgradePackagesInTerminal(
  packages: PackageVersionInfo[]
): void {
  const names = packages.filter((p) => p.needsUpgrade).map((p) => p.name);
  if (names.length === 0) return;
  const term = vscode.window.createTerminal({
    name: "SageLLM: Upgrade",
    isTransient: true,
  });
  term.sendText(`pip install -U ${names.join(" ")}`);
  term.show(true);
}

// ─────────────────────────────────────────────────────────────────────────────
// Full scan + interactive repair panel
// ─────────────────────────────────────────────────────────────────────────────

export interface DiagnosticsResult {
  corruptModels: Array<{ modelId: string; count: number }>;
  outdatedPackages: PackageVersionInfo[];
}

/**
 * Scan every known model ID for `.incomplete` blobs AND check pip packages.
 * Runs inside a VS Code progress notification (supply `modelIds` from catalog).
 */
export async function runFullDiagnostics(
  modelIds: string[]
): Promise<DiagnosticsResult> {
  const corruptModels: Array<{ modelId: string; count: number }> = [];
  for (const id of modelIds) {
    const blobs = findIncompleteBlobs(id);
    if (blobs.length > 0) corruptModels.push({ modelId: id, count: blobs.length });
  }
  const outdatedPackages = await checkPackageVersions();
  return { corruptModels, outdatedPackages };
}

/**
 * Show an interactive QuickPick that lists all detected issues and lets the
 * user pick one to repair inline.  Loops so the user can fix multiple issues
 * in a single session.
 */
export async function showDiagnosticsPanel(
  result: DiagnosticsResult
): Promise<void> {
  const { corruptModels, outdatedPackages } = result;
  const outdated = outdatedPackages.filter((p) => p.needsUpgrade);

  if (corruptModels.length === 0 && outdated.length === 0) {
    vscode.window.showInformationMessage(
      "SageLLM: ✅ 未发现问题，环境配置正常"
    );
    return;
  }

  // Re-scan loop so user can clear issues one by one (max 20 iterations)
  for (let _pass = 0; _pass < 20; _pass++) {
    const SEP = vscode.QuickPickItemKind.Separator;
    const items: (vscode.QuickPickItem & { _action?: string })[] = [];

    const stillCorrupt = corruptModels.filter(
      ({ modelId }) => isModelDownloadCorrupt(modelId)
    );

    if (stillCorrupt.length > 0) {
      items.push({ label: "模型下载问题", kind: SEP });
      for (const { modelId, count } of stillCorrupt) {
        items.push({
          label: `$(warning) ${modelId}`,
          description: `${count} 个文件损坏 — 点击修复`,
          detail: modelId,
          _action: `fix:${modelId}`,
        });
      }
    }

    const stillOutdated = outdated.filter((p) => p.needsUpgrade);
    if (stillOutdated.length > 0) {
      items.push({ label: "pip 包版本过旧", kind: SEP });
      for (const pkg of stillOutdated) {
        items.push({
          label: `$(arrow-up) ${pkg.name}`,
          description: `${pkg.installed} → ${pkg.latest}`,
          _action: "upgrade",
        });
      }
      items.push({
        label: `$(terminal) 升级所有过旧包`,
        description: stillOutdated.map((p) => p.name).join(", "),
        _action: "upgrade",
      });
    }

    if (items.filter((i) => i.kind !== SEP).length === 0) {
      vscode.window.showInformationMessage(
        "SageLLM: ✅ 所有问题已修复"
      );
      return;
    }

    const issueCount = stillCorrupt.length + (stillOutdated.length > 0 ? 1 : 0);
    const picked = (await vscode.window.showQuickPick(items, {
      title: "SageLLM 诊断 — 选择问题以修复",
      placeHolder: `发现 ${issueCount} 个问题，选择任意一项立即修复`,
    })) as (vscode.QuickPickItem & { _action?: string }) | undefined;

    if (!picked?._action) return; // dismissed

    if (picked._action.startsWith("fix:")) {
      const modelId = picked._action.slice(4);
      await repairModelDownload(modelId);
    } else if (picked._action === "upgrade") {
      upgradePackagesInTerminal(stillOutdated);
      return; // upgrade runs in terminal — exit panel
    }
  }
}
