/**
 * serverLauncher.ts
 * Handles hardware detection, backend/model selection, download, and gateway launch.
 */
import * as vscode from "vscode";
import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { checkHealth, fetchModels } from "./gatewayClient";
import { StatusBarManager } from "./statusBar";
import { DEFAULT_GATEWAY_PORT } from "./sagePorts";
import { isModelDownloadCorrupt, offerRepairIfCorrupt } from "./diagnostics";

// ─────────────────────────────────────────────────────────────────────────────
// Model catalog
// ─────────────────────────────────────────────────────────────────────────────

interface CatalogModel {
  id: string;       // HuggingFace repo ID
  size: string;     // human-readable param count
  vram: string;     // minimum VRAM / RAM needed
  tags: string[];   // e.g. ["chat","fast","cpu-ok"]
  desc: string;     // one-line description
}

let modelDownloadInProgress = false;

export function isModelDownloadInProgress(): boolean {
  return modelDownloadInProgress;
}

export const MODEL_CATALOG: CatalogModel[] = [
  // ── Tiny / CPU-friendly ──────────────────────────────────────────────────
  { id: "Qwen/Qwen2.5-0.5B-Instruct",              size: "0.5B", vram: "~1 GB",  tags: ["chat","cpu-ok","fast"],   desc: "Tiny Qwen chat, runs on CPU" },
  { id: "Qwen/Qwen2.5-Coder-0.5B-Instruct",        size: "0.5B", vram: "~1 GB",  tags: ["code","cpu-ok","fast"],   desc: "Tiny code assistant" },
  { id: "TinyLlama/TinyLlama-1.1B-Chat-v1.0",      size: "1.1B", vram: "~2 GB",  tags: ["chat","cpu-ok"],          desc: "Lightweight general chat" },
  // ── Small (1–3 B) ────────────────────────────────────────────────────────
  { id: "Qwen/Qwen2.5-1.5B-Instruct",              size: "1.5B", vram: "~3 GB",  tags: ["chat","fast"],            desc: "Fast Qwen chat" },
  { id: "Qwen/Qwen2.5-Coder-1.5B-Instruct",        size: "1.5B", vram: "~3 GB",  tags: ["code","fast"],            desc: "Fast code assistant" },
  { id: "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B",size:"1.5B", vram: "~3 GB",  tags: ["chat","reasoning"],       desc: "DeepSeek-R1 distilled, strong reasoning" },
  { id: "Qwen/Qwen2.5-3B-Instruct",                size: "3B",   vram: "~6 GB",  tags: ["chat"],                   desc: "Balanced Qwen chat" },
  { id: "Qwen/Qwen2.5-Coder-3B-Instruct",          size: "3B",   vram: "~6 GB",  tags: ["code"],                   desc: "Balanced code assistant" },
  // ── Medium (7 B) ─────────────────────────────────────────────────────────
  { id: "Qwen/Qwen2.5-7B-Instruct",                size: "7B",   vram: "~14 GB", tags: ["chat","powerful"],        desc: "Powerful Qwen chat (needs GPU)" },
  { id: "Qwen/Qwen2.5-Coder-7B-Instruct",          size: "7B",   vram: "~14 GB", tags: ["code","powerful"],        desc: "Powerful code assistant (needs GPU)" },
  { id: "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B", size: "7B",   vram: "~14 GB", tags: ["chat","reasoning","powerful"], desc: "DeepSeek-R1 distilled 7B" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Local HF cache helpers
// ─────────────────────────────────────────────────────────────────────────────

function hfCacheDir(): string {
  return path.join(os.homedir(), ".cache", "huggingface", "hub");
}

function hfDirName(modelId: string): string {
  return "models--" + modelId.replace(/\//g, "--");
}

function expandHomeDir(input: string): string {
  if (!input) return input;
  if (input.startsWith("~/")) {
    return path.join(os.homedir(), input.slice(2));
  }
  return input;
}

function hasModelWeights(dir: string): boolean {
  try {
    const stack = [dir];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
        const full = path.join(cur, entry.name);
        if (entry.isDirectory()) {
          stack.push(full);
          continue;
        }
        if (
          entry.name.endsWith(".safetensors") ||
          entry.name.endsWith(".gguf") ||
          entry.name.endsWith(".bin")
        ) {
          return true;
        }
      }
    }
  } catch { /* ignore */ }
  return false;
}

/** Cached result of workstationModelDirs(), cleared when workspace folders change. */
let _workstationDirsCache: string[] | null = null;
vscode.workspace.onDidChangeWorkspaceFolders(() => { _workstationDirsCache = null; });

function workstationModelDirs(): string[] {
  if (_workstationDirsCache) return _workstationDirsCache;
  const dirs = new Set<string>();
  dirs.add(path.join(os.homedir(), "Downloads", "sagellm-models"));

  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const wsPath = folder.uri.fsPath;
    if (path.basename(wsPath) !== "sagellm-workstation") continue;

    const ini = path.join(wsPath, "config.ini");
    try {
      const txt = fs.readFileSync(ini, "utf8");
      const m = txt.match(/^\s*models_dir\s*=\s*(.+)\s*$/m);
      if (m && m[1]) {
        dirs.add(expandHomeDir(m[1].trim()));
      }
    } catch { /* ignore */ }
  }

  _workstationDirsCache = [...dirs];
  return _workstationDirsCache;
}

function localWorkstationModelPath(modelId: string): string | undefined {
  const shortId = modelId.split("/").pop() ?? modelId;
  const candidates = [modelId, shortId];

  for (const baseDir of workstationModelDirs()) {
    for (const candidate of candidates) {
      const modelDir = path.join(baseDir, candidate);
      if (fs.existsSync(modelDir) && hasModelWeights(modelDir)) {
        return modelDir;
      }
    }
  }
  return undefined;
}

interface WorkstationLocalModel {
  idOrPath: string;
  display: string;
  description: string;
}

function discoverWorkstationLocalModels(): WorkstationLocalModel[] {
  const out: WorkstationLocalModel[] = [];
  const seen = new Set<string>();

  const byShort = new Map<string, string>();
  for (const model of MODEL_CATALOG) {
    const short = model.id.split("/").pop() ?? model.id;
    byShort.set(short, model.id);
  }

  for (const baseDir of workstationModelDirs()) {
    if (!fs.existsSync(baseDir)) continue;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(baseDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const full = path.join(baseDir, entry.name);
      if (!hasModelWeights(full)) continue;

      const mapped = byShort.get(entry.name);
      if (mapped) {
        if (!seen.has(mapped)) {
          seen.add(mapped);
          out.push({
            idOrPath: mapped,
            display: mapped,
            description: "workstation local",
          });
        }
        continue;
      }

      if (!seen.has(full)) {
        seen.add(full);
        out.push({
          idOrPath: full,
          display: entry.name,
          description: "workstation local path",
        });
      }
    }
  }

  return out;
}

export function isModelDownloaded(modelId: string): boolean {
  if (localWorkstationModelPath(modelId)) {
    return true;
  }
  const dir = path.join(hfCacheDir(), hfDirName(modelId));
  return fs.existsSync(dir);
}

/** Return all model IDs that are already in the HF cache. */
function localModelIds(): Set<string> {
  const set = new Set<string>();
  try {
    for (const entry of fs.readdirSync(hfCacheDir())) {
      if (entry.startsWith("models--")) {
        set.add(entry.slice("models--".length).replace(/--/g, "/"));
      }
    }
  } catch { /* ignore */ }

  // Also treat workstation-local catalog models as downloaded.
  for (const model of discoverWorkstationLocalModels()) {
    if (!model.idOrPath.startsWith("/")) {
      set.add(model.idOrPath);
    }
  }

  return set;
}

// ─────────────────────────────────────────────────────────────────────────────
// Model download with VS Code progress bar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Collect candidate Python executables in priority order.
 * Result is cached for the lifetime of the extension host (conda envs don't
 * change while VS Code is open).
 */
let _candidatePythonsCache: string[] | null = null;
function candidatePythons(): string[] {
  if (_candidatePythonsCache) return _candidatePythonsCache;
  const candidates: string[] = [];
  const home = os.homedir();

  // Active conda / venv prefix (present when VS Code is launched from a conda shell)
  for (const envVar of ["CONDA_PREFIX", "VIRTUAL_ENV"]) {
    const prefix = process.env[envVar];
    if (prefix) {
      candidates.push(path.join(prefix, "bin", "python"));
    }
  }

  // Enumerate all envs under common conda base directories
  for (const baseName of ["miniforge3", "miniconda3", "anaconda3", "mambaforge", "micromamba"]) {
    const base = path.join(home, baseName);
    if (!fs.existsSync(base)) { continue; }
    // base env
    candidates.push(path.join(base, "bin", "python"));
    // all named envs
    const envsDir = path.join(base, "envs");
    try {
      for (const envName of fs.readdirSync(envsDir)) {
        candidates.push(path.join(envsDir, envName, "bin", "python"));
      }
    } catch { /* envs dir may not exist */ }
  }

  // ~/.local/bin (pip install --user)
  candidates.push(path.join(home, ".local", "bin", "python3"));
  candidates.push(path.join(home, ".local", "bin", "python"));

  // System fallback (last resort)
  candidates.push("python3", "python");

  _candidatePythonsCache = [...new Set(candidates)];
  return _candidatePythonsCache;
}

/**
 * huggingface_hub >= 1.0 moved the CLI to huggingface_hub.cli.hf
 * huggingface_hub < 1.0 used huggingface_hub.commands.huggingface_cli
 * Try both so we work across versions.
 */
const HF_MODULE_CANDIDATES = [
  "huggingface_hub.cli.hf",             // >= 1.0
  "huggingface_hub.commands.huggingface_cli",  // < 1.0
];

/**
 * Resolve the huggingface-cli executable.
 *
 * Strategy (in order):
 *   1. huggingface-cli binary in PATH or any conda env bin dir
 *   2. python -m <hf_module> using the first Python that has huggingface_hub
 *
 * Returns null if nothing works; caller must show an actionable error.
 */
async function resolveHfCli(): Promise<{ cmd: string; prefixArgs: string[] } | null> {
  const home = os.homedir();

  // ── 1. Binary search ────────────────────────────────────────────────────
  //   a) system PATH
  const whichCmd = process.platform === "win32" ? "where huggingface-cli" : "which huggingface-cli";
  const found = await execQuick(whichCmd, 3000);
  if (found) {
    return { cmd: found.split(/\r?\n/)[0].trim(), prefixArgs: [] };
  }

  //   b) bin dirs alongside every candidate Python
  const binDirs = [
    path.join(home, ".local", "bin"),
    ...candidatePythons()
      .filter((p) => path.isAbsolute(p))
      .map((p) => path.dirname(p)),
  ];
  for (const dir of [...new Set(binDirs)]) {
    const cli = path.join(dir, "huggingface-cli");
    if (fs.existsSync(cli)) {
      return { cmd: cli, prefixArgs: [] };
    }
  }

  // ── 2. Python module fallback ────────────────────────────────────────────
  for (const py of candidatePythons()) {
    if (path.isAbsolute(py) && !fs.existsSync(py)) { continue; }
    // Quick import check
    const canImport = await execQuick(
      `"${py}" -c "import huggingface_hub" 2>/dev/null && echo ok`,
      5000
    );
    if (!canImport.includes("ok")) { continue; }

    // Find the first module path that actually works with this Python
    for (const mod of HF_MODULE_CANDIDATES) {
      const modOk = await execQuick(
        `"${py}" -m ${mod} --help 2>/dev/null && echo ok`,
        5000
      );
      if (modOk.includes("ok")) {
        return { cmd: py, prefixArgs: ["-m", mod] };
      }
    }
  }

  return null; // nothing found
}

/**
 * Download a HuggingFace model using huggingface-cli (with automatic PATH resolution).
 * Shows a cancellable VS Code progress notification.
 * Returns true on success, false if cancelled or failed.
 */
export async function downloadModel(modelId: string): Promise<boolean> {
  modelDownloadInProgress = true;
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `SageCoder: Downloading ${modelId}`,
      cancellable: true,
    },
    async (progress, token) => {
      const cfg = vscode.workspace.getConfiguration("sagellm");
      const hfEndpoint = cfg.get<string>("huggingface.endpoint", "").trim();
      const hfCli = await resolveHfCli();
      if (!hfCli) {
        const action = await vscode.window.showErrorMessage(
          "SageCoder: 未找到 huggingface_hub。请在 sage conda 环境中运行：\n" +
          "  pip install \"huggingface_hub>=1.0.0\"",
          "复制安装命令"
        );
        if (action === "复制安装命令") {
          vscode.env.clipboard.writeText('pip install "huggingface_hub>=1.0.0"');
        }
        modelDownloadInProgress = false;
        return false;
      }
      const { cmd, prefixArgs } = hfCli;

      // Resolve the destination directory inside workstation's models_dir
      const shortName = modelId.split("/").pop() ?? modelId;
      const primaryModelsDir = workstationModelDirs()[0];
      const localDir = path.join(primaryModelsDir, shortName);
      try {
        fs.mkdirSync(localDir, { recursive: true });
      } catch { /* ignore */ }

      const downloadArgs = [
        ...prefixArgs,
        "download",
        modelId,
        "--local-dir", localDir,
        "--include", "*.safetensors",
        "--include", "*.safetensors.index.json",
        "--include", "*.gguf",
        "--include", "*.json",
        "--include", "tokenizer.model",
        "--include", "*.tiktoken",
        "--include", "*.txt",
        "--exclude", "*.bin",
        "--exclude", "*.pt",
        "--exclude", "*.h5",
        "--exclude", "*.ot",
        "--exclude", "*.msgpack",
        "--exclude", "*.onnx",
        "--exclude", "*.ckpt",
        "--exclude", "*.tar",
        "--exclude", "*.zip",
        "--exclude", "*.md",
        "--exclude", "*.png",
        "--exclude", "*.jpg",
        "--exclude", "*.jpeg",
        "--exclude", "*.webp",
      ];
      return new Promise<boolean>((resolve) => {
        const proc = cp.spawn(
          cmd,
          downloadArgs,
          {
            env: {
              ...process.env,
              HF_HUB_OFFLINE: "0",
              TRANSFORMERS_OFFLINE: "0",
              HF_HUB_ETAG_TIMEOUT: "10",
              HF_HUB_DOWNLOAD_TIMEOUT: "30",
              ...(hfEndpoint ? { HF_ENDPOINT: hfEndpoint } : {}),
            },
          }
        );

        let lastPct = 0;

        // Parse tqdm-style progress:  "  45%|████▌     | 1.12G/2.47G [01:23<01:40,  9.3MB/s]"
        const parseLine = (line: string) => {
          const m = line.match(/(\d+)%\|/);
          if (m) {
            const pct = parseInt(m[1], 10);
            const increment = pct - lastPct;
            if (increment > 0) {
              lastPct = pct;
              // Extract speed/ETA for the message
              const speed = line.match(/[\d.]+\s*[MG]B\/s/)?.[0] ?? "";
              const eta   = line.match(/<([\d:]+),/)?.[1] ?? "";
              progress.report({
                increment,
                message: `${pct}%${speed ? "  " + speed : ""}${eta ? "  ETA " + eta : ""}`,
              });
            }
          } else if (line.includes("Downloading")) {
            // Show file name being downloaded
            const file = line.match(/Downloading (.+?):/)?.[1];
            if (file) progress.report({ message: file });
          }
        };

        let stderr = "";
        proc.stderr.on("data", (d: Buffer) => {
          const text = d.toString();
          stderr += text;
          for (const line of text.split(/\r?\n/)) parseLine(line);
        });
        proc.stdout.on("data", (d: Buffer) => {
          for (const line of d.toString().split(/\r?\n/)) parseLine(line);
        });

        proc.on("close", (code) => {
          if (code === 0) {
            progress.report({ increment: 100 - lastPct, message: "完成 ✓" });
            modelDownloadInProgress = false;
            resolve(true);
          } else if (token.isCancellationRequested) {
            modelDownloadInProgress = false;
            resolve(false);
          } else {
            if (stderr.includes("LocalEntryNotFoundError")) {
              vscode.window.showErrorMessage(
                "SageCoder: 无法访问 Hugging Face（可能网络受限或离线模式开启）。请在设置中填写 sagellm.huggingface.endpoint（例如 https://hf-mirror.com），或先在终端运行 `hf auth login` 后重试。"
              );
            }
            vscode.window.showErrorMessage(
              `SageCoder: 下载失败 (exit ${code}).\n${stderr.slice(-300)}`
            );
            modelDownloadInProgress = false;
            resolve(false);
          }
        });

        proc.on("error", (err) => {
          vscode.window.showErrorMessage(`SageCoder: 无法运行 huggingface-cli: ${err.message}`);
          modelDownloadInProgress = false;
          resolve(false);
        });

        token.onCancellationRequested(() => {
          proc.kill("SIGTERM");
          modelDownloadInProgress = false;
          resolve(false);
        });
      });
    }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Backend detection  —  direct hardware queries (not parsing `sagellm info`)
// ─────────────────────────────────────────────────────────────────────────────

export interface BackendInfo {
  id: string;
  label: string;
  detected: boolean;
  description: string;
}

/** Run a shell command and return trimmed stdout, or "" on error/timeout. */
function execQuick(cmd: string, timeoutMs = 6000): Promise<string> {
  return new Promise((resolve) => {
    cp.exec(cmd, { timeout: timeoutMs }, (_err, stdout) =>
      resolve((stdout ?? "").trim())
    );
  });
}

/**
 * Probe for CUDA via nvidia-smi (fastest, no Python needed).
 * Returns a human-readable GPU name string, or "" if no CUDA GPU found.
 */
async function detectCuda(): Promise<string> {
  // nvidia-smi: one GPU name per line
  const names = await execQuick(
    "nvidia-smi --query-gpu=name --format=csv,noheader,nounits 2>/dev/null"
  );
  if (names) {
    const first = names.split("\n")[0].trim();
    const count = names.split("\n").filter(Boolean).length;
    return count > 1 ? `${first} (+${count - 1} more)` : first;
  }
  return "";
}

/**
 * Probe for Ascend NPU via torch_npu.
 * Returns a device description string, or "" if not present.
 */
async function detectAscend(): Promise<string> {
  const out = await execQuick(
    `python -c "import torch_npu; n=torch_npu.npu.device_count(); print(f'{n} NPU(s)')" 2>/dev/null`,
    8000
  );
  return out.match(/^\d+\s*NPU/i) ? out : "";
}

/**
 * Detect all available backends by querying hardware directly.
 * CPU is always present.  CUDA and Ascend are detected in parallel.
 *
 * This replaces the previous approach of parsing `sagellm info` text output,
 * which was unreliable because Rich adds box-drawing chars / ANSI codes.
 */
export async function detectBackendsFromCLI(): Promise<BackendInfo[]> {
  const [cudaDesc, ascendDesc] = await Promise.all([
    detectCuda(),
    detectAscend(),
  ]);

  const backends: BackendInfo[] = [
    {
      id: "cpu",
      label: "$(circuit-board) CPU",
      detected: true,
      description: "Always available",
    },
  ];
  if (cudaDesc) {
    backends.push({
      id: "cuda",
      label: "$(zap) CUDA (GPU)",
      detected: true,
      description: cudaDesc,
    });
  }
  if (ascendDesc) {
    backends.push({
      id: "ascend",
      label: "$(hubot) Ascend (昇腾 NPU)",
      detected: true,
      description: ascendDesc,
    });
  }
  return backends;
}

// ─────────────────────────────────────────────────────────────────────────────
// Model picker items
// ─────────────────────────────────────────────────────────────────────────────

/** Try fetching models from an already-running gateway (non-throwing). */
async function tryFetchGatewayModels(): Promise<string[]> {
  try {
    const models = await fetchModels();
    return models.map((m) => m.id);
  } catch { return []; }
}

/**
 * Build the full QuickPick item list:
 *   1. Separator: Running gateway  (if server up)
 *   2. Separator: Downloaded  (local HF cache + catalog overlap + extras)
 *   3. Separator: Recommended – auto-download  (catalog items not yet local)
 *   4. Enter manually
 */
export async function buildModelPickerItems(
  recentModels: string[],
  savedModel: string
): Promise<vscode.QuickPickItem[]> {
  const SEP = vscode.QuickPickItemKind.Separator;

  const [gatewayIds, localIds] = await Promise.all([
    tryFetchGatewayModels(),
    Promise.resolve(localModelIds()),
  ]);
  const workstationLocals = discoverWorkstationLocalModels();

  const seen = new Set<string>();
  const items: vscode.QuickPickItem[] = [];

  const add = (item: vscode.QuickPickItem & { detail?: string }) => {
    const key = item.detail ?? item.label;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  // ── Section 0: last used ───────────────────────────────────────────────
  if (savedModel) {
    const local = localIds.has(savedModel);
    add({ label: `$(star-full) ${savedModel}`, description: local ? "✅ last used" : "☁️ last used (not cached)", detail: savedModel });
  }

  // ── Section 1: running gateway ─────────────────────────────────────────
  if (gatewayIds.length) {
    items.push({ label: "Running on gateway", kind: SEP });
    for (const id of gatewayIds) {
      add({ label: `$(server) ${id}`, description: "✅ serving now", detail: id });
    }
  }

  // ── Section 2: downloaded ──────────────────────────────────────────────
  const downloadedCatalog = MODEL_CATALOG.filter((m) => localIds.has(m.id));
  const downloadedExtra   = [...localIds].filter((id) => !MODEL_CATALOG.some((m) => m.id === id));
  const recentDownloaded  = recentModels.filter((id) => localIds.has(id));

  const downloadedItems: vscode.QuickPickItem[] = [];
  const addDownloaded = (id: string, desc: string) => {
    if (seen.has(id)) return; seen.add(id);
    const corrupt = !id.startsWith("/") && isModelDownloadCorrupt(id);
    downloadedItems.push({
      label: corrupt ? `$(warning) ${id}` : `$(database) ${id}`,
      description: corrupt ? `⚠️ 下载损坏，选择后可修复 — ${desc}` : `✅ ${desc}`,
      detail: id,
    });
  };
  downloadedCatalog.forEach((m) => addDownloaded(m.id, `${m.size} · ${m.vram} · ${m.desc}`));
  recentDownloaded.forEach((id) => addDownloaded(id, "recent"));
  downloadedExtra.forEach((id) => addDownloaded(id, "local cache"));
  for (const local of workstationLocals) {
    if (local.idOrPath.startsWith("/")) {
      if (seen.has(local.idOrPath)) continue;
      seen.add(local.idOrPath);
      downloadedItems.push({
        label: `$(database) ${local.display}`,
        description: `✅ ${local.description}`,
        detail: local.idOrPath,
      });
    }
  }

  if (downloadedItems.length) {
    items.push({ label: "Downloaded", kind: SEP });
    items.push(...downloadedItems);
  }

  // ── Section 3: recommended (not yet downloaded) ────────────────────────
  const recommendedItems: vscode.QuickPickItem[] = [];
  for (const m of MODEL_CATALOG) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    const tagStr = m.tags.includes("cpu-ok") ? "runs on CPU · " : "";
    recommendedItems.push({
      label: `$(cloud-download) ${m.id}`,
      description: `☁️ ${m.size} · ${m.vram}  —  ${tagStr}${m.desc}`,
      detail: m.id,
    });
  }
  if (recommendedItems.length) {
    items.push({ label: "Recommended  (will auto-download)", kind: SEP });
    items.push(...recommendedItems);
  }

  // ── Section 4: recent not yet listed ──────────────────────────────────
  const extraRecent = recentModels.filter((id) => !seen.has(id));
  if (extraRecent.length) {
    items.push({ label: "Recent", kind: SEP });
    for (const id of extraRecent) {
      seen.add(id);
      items.push({ label: `$(history) ${id}`, description: "recent", detail: id });
    }
  }

  // ── Section 5: manual entry ────────────────────────────────────────────
  items.push({ label: "", kind: SEP });
  items.push({ label: "$(edit) Enter model path / HuggingFace ID…", description: "", detail: "__custom__" });
  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

/** Prompt user to pick backend + model (with optional auto-download), then start. */
export async function promptAndStartServer(
  context: vscode.ExtensionContext,
  sb: StatusBarManager | null
): Promise<void> {
  const cfg  = vscode.workspace.getConfiguration("sagellm");
  const port = cfg.get<number>("gateway.port", DEFAULT_GATEWAY_PORT);

  // ── 1. Detect backends ────────────────────────────────────────────────────
  sb?.setConnecting();
  const backends = await detectBackendsFromCLI();

  const savedBackend = cfg.get<string>("backend", "");

  // If the saved backend is no longer detected (e.g. GPU driver removed),
  // warn the user so they don't silently downgrade to CPU.
  if (
    savedBackend &&
    savedBackend !== "cpu" &&
    !backends.some((b) => b.id === savedBackend)
  ) {
    vscode.window.showWarningMessage(
      `SageCoder: 上次使用的 "${savedBackend}" 后端未检测到，请重新选择。`
    );
  }

  // If only CPU is available, skip the picker — nothing to choose.
  let backendId: string;
  if (backends.length === 1) {
    backendId = "cpu";
    await cfg.update("backend", "cpu", vscode.ConfigurationTarget.Global);
  } else {
    const backendItems = backends.map((b) => {
      const isSaved = b.id === savedBackend;
      return {
        label: isSaved ? `$(star-full) ${b.label}` : b.label,
        description: `${isSaved ? "上次使用  " : ""}${b.description}`,
        detail: b.id,
      };
    });
    // Pre-sort: saved backend first, then by preference (GPU > CPU)
    const savedIdx = backendItems.findIndex((i) => i.detail === savedBackend);
    if (savedIdx > 0) {
      backendItems.unshift(...backendItems.splice(savedIdx, 1));
    } else if (!savedBackend) {
      backendItems.reverse(); // prefer GPU when nothing saved
    }

    const pickedBackend = (await vscode.window.showQuickPick(backendItems, {
      title: "SageCoder: 选择推理后端",
      placeHolder: "$(star-full) 上次使用  · $(zap) GPU  · $(circuit-board) CPU",
    })) as vscode.QuickPickItem | undefined;
    if (!pickedBackend) {
      sb?.setGatewayStatus(false);
      return;
    }
    backendId = pickedBackend.detail!;
    await cfg.update("backend", backendId, vscode.ConfigurationTarget.Global);
  }

  // ── 2. Pick model ─────────────────────────────────────────────────────────
  const recentModels = context.globalState.get<string[]>("sagellm.recentModels", []);
  const savedModel   = cfg.get<string>("preloadModel", "").trim();

  const modelItems = await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "SageCoder: Scanning models…", cancellable: false },
    () => buildModelPickerItems(recentModels, savedModel)
  );

  const totalDownloadable = MODEL_CATALOG.filter((m) => !isModelDownloaded(m.id)).length;
  const pickedModel = await vscode.window.showQuickPick(modelItems, {
    title: `SageCoder: Select Model  (☁️ ${totalDownloadable} available to download)`,
    placeHolder: "✅ downloaded · ☁️ will auto-download · $(edit) custom path",
    matchOnDescription: true,
    matchOnDetail: false,
  }) as vscode.QuickPickItem | undefined;
  if (!pickedModel) { sb?.setGatewayStatus(false); return; }

  let modelId = pickedModel.detail!;
  if (modelId === "__custom__") {
    modelId = (await vscode.window.showInputBox({
      title: "SageCoder: Model Path or HuggingFace ID",
      prompt: "e.g.  Qwen/Qwen2.5-7B-Instruct  or  /models/my-model",
      value: savedModel,
      ignoreFocusOut: true,
    })) ?? "";
    if (!modelId.trim()) { sb?.setGatewayStatus(false); return; }
    modelId = modelId.trim();
  }

  let launchModel = modelId;

  // ── 3. Check cache integrity / download if not cached ────────────────────
  if (!modelId.startsWith("/")) {
    const localWsPath = localWorkstationModelPath(modelId);
    if (localWsPath) {
      launchModel = localWsPath;
      vscode.window.showInformationMessage(`SageCoder: 使用本地模型目录 ${localWsPath}`);
    } else if (isModelDownloaded(modelId)) {
      // Model is in HF cache — verify no shards are still .incomplete from a
      // previously-interrupted download (would cause a load-time crash).
      const repairOk = await offerRepairIfCorrupt(modelId);
      if (!repairOk) { sb?.setGatewayStatus(false); return; }
    } else {
      const choice = await vscode.window.showInformationMessage(
        `"${modelId}" 尚未下载。是否现在下载？`,
        { modal: true },
        "下载", "取消"
      );
      if (choice !== "下载") { sb?.setGatewayStatus(false); return; }

      const ok = await downloadModel(modelId);
      if (!ok) { sb?.setGatewayStatus(false); return; }
      vscode.window.showInformationMessage(`✅ ${modelId} 下载完成`);
    }
  }

  // ── 4. Persist choices ────────────────────────────────────────────────────
  await cfg.update("preloadModel", modelId, vscode.ConfigurationTarget.Global);
  await context.globalState.update(
    "sagellm.recentModels",
    [modelId, ...recentModels.filter((m) => m !== modelId)].slice(0, 10)
  );

  // ── 5. Launch server ──────────────────────────────────────────────────────
  const baseCmd = cfg.get<string>("gatewayStartCommand", "sagellm serve");
  const cmd     = `${baseCmd} --backend ${backendId} --model ${launchModel} --port ${port}`;
  const terminal = vscode.window.createTerminal({
    name: "SageCoder Server",
    isTransient: false,
    // Disable preflight canary — it loads the model via `transformers` BEFORE the
    // engine starts, doubling memory usage and adding 2–10 min to startup time.
    // The engine's own startup canary (SAGELLM_STARTUP_CANARY) still validates
    // output quality after the engine is healthy.
    env: { SAGELLM_PREFLIGHT_CANARY: "0" },
  });
  terminal.sendText(cmd);
  terminal.show(false);
  vscode.window.showInformationMessage(`SageCoder: Starting ${backendId.toUpperCase()} · ${modelId}…`);

  // ── 6. Poll until healthy (up to 5 min — model loading can be slow) ───────
  let attempts = 0;
  const maxPollAttempts = 100; // 100 × 3s = 5 minutes
  const poll = setInterval(async () => {
    attempts++;
    if (await checkHealth()) {
      clearInterval(poll);
      sb?.setGatewayStatus(true);
      vscode.window.showInformationMessage(`SageCoder: Server ready ✓  (${backendId} · ${modelId})`);
    } else if (attempts >= maxPollAttempts) {
      clearInterval(poll);
      sb?.setError("Server start timed out");
      vscode.window
        .showWarningMessage(
          "SageCoder: Server 5 分钟内未响应。",
          "运行诊断",
          "查看终端"
        )
        .then((choice) => {
          if (choice === "运行诊断") {
            vscode.commands.executeCommand("sagellm.runDiagnostics");
          }
        });
    } else if (attempts % 20 === 0) {
      // Notify user every minute so they know it's still loading
      const elapsed = Math.round(attempts * 3 / 60);
      vscode.window.setStatusBarMessage(`SageCoder: Loading model… (${elapsed} min elapsed)`, 5000);
    }
  }, 3000);
}

