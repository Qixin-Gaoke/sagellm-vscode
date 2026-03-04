/**
 * serverLauncher.ts
 * Handles hardware detection, backend/model selection, and gateway launch.
 */
import * as vscode from "vscode";
import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { checkHealth, fetchModels } from "./gatewayClient";
import { StatusBarManager } from "./statusBar";

export interface BackendInfo {
  id: string;
  label: string;
  detected: boolean;
  description: string;
}

/** Parse `sagellm info` stdout to detect available backends. */
export function detectBackends(infoOutput: string): BackendInfo[] {
  const backends: BackendInfo[] = [
    { id: "cpu", label: "$(circuit-board) CPU", detected: true, description: "Always available" },
  ];

  const hasCuda = /CUDA.*✅|✅.*CUDA|✅.*\d+\s*device/i.test(infoOutput);
  const hasAscend = /Ascend.*✅|✅.*Ascend|✅.*torch_npu/i.test(infoOutput);

  // Extract CUDA device name if present
  const cudaMatch = infoOutput.match(/CUDA[^\n]*✅[^\n]*?-\s*(.+)|✅\s*\d+\s*device[^-]*-\s*(.+)/i);
  const cudaName = cudaMatch ? (cudaMatch[1] || cudaMatch[2] || "").trim().split("\n")[0] : "";

  if (hasCuda) {
    backends.push({
      id: "cuda",
      label: "$(zap) CUDA (GPU)",
      detected: true,
      description: cudaName || "NVIDIA GPU detected",
    });
  }
  if (hasAscend) {
    backends.push({
      id: "ascend",
      label: "$(hubot) Ascend (昇腾 NPU)",
      detected: true,
      description: "Ascend NPU detected",
    });
  }

  return backends;
}

// ─────────────────────────────────────────────────────────────────────────────
// Model discovery
// ─────────────────────────────────────────────────────────────────────────────

export interface ModelSource {
  id: string;
  label: string;
  description: string;
  detail: string; // the actual model ID to pass to sagellm
}

/** Scan ~/.cache/huggingface/hub/ for downloaded models. */
export function discoverHuggingFaceModels(): ModelSource[] {
  const hubDir = path.join(os.homedir(), ".cache", "huggingface", "hub");
  const results: ModelSource[] = [];
  try {
    if (!fs.existsSync(hubDir)) return results;
    for (const entry of fs.readdirSync(hubDir)) {
      if (!entry.startsWith("models--")) continue;
      // models--Qwen--Qwen2.5-7B-Instruct  →  Qwen/Qwen2.5-7B-Instruct
      const modelId = entry.slice("models--".length).replace(/--/g, "/");
      results.push({
        id: modelId,
        label: `$(database) ${modelId}`,
        description: "local HF cache",
        detail: modelId,
      });
    }
  } catch {
    // ignore permission / missing dir errors
  }
  return results;
}

/** Try fetching models from an already-running gateway (non-throwing). */
export async function tryFetchGatewayModels(): Promise<ModelSource[]> {
  try {
    const models = await fetchModels();
    return models.map((m) => ({
      id: m.id,
      label: `$(server) ${m.id}`,
      description: "running gateway",
      detail: m.id,
    }));
  } catch {
    return [];
  }
}

/**
 * Build the full model list for the picker:
 *   1. Gateway models (if server already running)
 *   2. Local HuggingFace cache
 *   3. Recent history (deduped)
 *   4. "Enter manually…" fallback
 */
export async function buildModelPickerItems(
  recentModels: string[],
  savedModel: string
): Promise<vscode.QuickPickItem[]> {
  const [gatewayModels, hfModels] = await Promise.all([
    tryFetchGatewayModels(),
    Promise.resolve(discoverHuggingFaceModels()),
  ]);

  const seen = new Set<string>();
  const items: vscode.QuickPickItem[] = [];

  // Helper to push if not already seen
  const push = (src: ModelSource) => {
    if (seen.has(src.detail)) return;
    seen.add(src.detail);
    items.push({ label: src.label, description: src.description, detail: src.detail });
  };

  // Pin saved model first
  if (savedModel) {
    items.push({
      label: `$(star-full) ${savedModel}`,
      description: "last used",
      detail: savedModel,
    });
    seen.add(savedModel);
  }

  gatewayModels.forEach(push);

  // Recent history
  for (const m of recentModels) {
    if (!seen.has(m)) {
      push({ id: m, label: `$(history) ${m}`, description: "recent", detail: m });
    }
  }

  hfModels.forEach(push);

  items.push({ label: "$(edit) Enter model path / HuggingFace ID…", description: "", detail: "__custom__" });
  return items;
}

/** Run `sagellm info` and return detected backends. */
export async function detectBackendsFromCLI(): Promise<BackendInfo[]> {
  return new Promise((resolve) => {
    cp.exec("sagellm info", { timeout: 15000 }, (err, stdout) => {
      try {
        resolve(detectBackends(stdout ?? ""));
      } catch {
        resolve([{ id: "cpu", label: "$(circuit-board) CPU", detected: true, description: "Always available" }]);
      }
    });
  });
}

/** Prompt user to pick a backend, then enter a model, then start the server. */
export async function promptAndStartServer(
  context: vscode.ExtensionContext,
  sb: StatusBarManager | null
): Promise<void> {
  const cfg = vscode.workspace.getConfiguration("sagellm");
  const port = cfg.get<number>("gateway.port", 8901);

  // ── 1. Detect backends ────────────────────────────────────────────────────
  sb?.setConnecting();
  const backends = await detectBackendsFromCLI();

  const backendItems: vscode.QuickPickItem[] = backends.map((b) => ({
    label: b.label,
    description: b.detected ? `✅ ${b.description}` : b.description,
    detail: b.id,
  }));

  // Pre-select the saved backend if valid (put it first)
  const savedBackend = cfg.get<string>("backend", "");
  if (savedBackend) {
    const idx = backendItems.findIndex((i) => i.detail === savedBackend);
    if (idx > 0) backendItems.unshift(...backendItems.splice(idx, 1));
  } else {
    // prefer last item (highest-capability, e.g. GPU)
    backendItems.reverse();
  }

  const pickedBackend = await vscode.window.showQuickPick(backendItems, {
    title: "SageLLM: Select Inference Backend",
    placeHolder: "Choose hardware backend to use",
  }) as vscode.QuickPickItem | undefined;
  if (!pickedBackend) {
    sb?.setGatewayStatus(false);
    return;
  }
  const backendId = pickedBackend.detail!;
  await cfg.update("backend", backendId, vscode.ConfigurationTarget.Global);

  // ── 2. Pick model ─────────────────────────────────────────────────────────
  const recentModels: string[] = context.globalState.get<string[]>("sagellm.recentModels", []);
  const savedModel = cfg.get<string>("preloadModel", "").trim();

  // Build list asynchronously (gateway probe + local HF scan run in parallel)
  const modelItems = await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "SageLLM: Scanning available models…", cancellable: false },
    () => buildModelPickerItems(recentModels, savedModel)
  );

  const pickedModel = await vscode.window.showQuickPick(modelItems, {
    title: `SageLLM: Select Model  (${modelItems.length - 1} found)`,
    placeHolder: "Pick a model or enter a custom path / HuggingFace ID",
    matchOnDescription: true,
    matchOnDetail: false,
  }) as vscode.QuickPickItem | undefined;
  if (!pickedModel) {
    sb?.setGatewayStatus(false);
    return;
  }

  let modelId = pickedModel.detail!;
  if (modelId === "__custom__") {
    modelId =
      (await vscode.window.showInputBox({
        title: "SageLLM: Model Path or HuggingFace ID",
        prompt: "e.g.  Qwen/Qwen2.5-7B-Instruct  or  /models/my-model",
        value: savedModel,
        ignoreFocusOut: true,
      })) ?? "";
    if (!modelId.trim()) {
      sb?.setGatewayStatus(false);
      return;
    }
    modelId = modelId.trim();
  }

  // Persist model choice
  await cfg.update("preloadModel", modelId, vscode.ConfigurationTarget.Global);
  const updated = [modelId, ...recentModels.filter((m) => m !== modelId)].slice(0, 10);
  await context.globalState.update("sagellm.recentModels", updated);

  // ── 3. Build & run command ────────────────────────────────────────────────
  const baseCmd = cfg.get<string>("gatewayStartCommand", "sagellm serve");
  const cmd = `${baseCmd} --backend ${backendId} --model ${modelId} --port ${port}`;

  const terminal = vscode.window.createTerminal({ name: "SageLLM Server", isTransient: false });
  terminal.sendText(cmd);
  terminal.show(false);

  vscode.window.showInformationMessage(
    `SageLLM: Starting ${backendId.toUpperCase()} backend with model "${modelId}"…`
  );

  // ── 4. Poll until healthy ─────────────────────────────────────────────────
  let attempts = 0;
  const poll = setInterval(async () => {
    attempts++;
    const healthy = await checkHealth();
    if (healthy) {
      clearInterval(poll);
      sb?.setGatewayStatus(true);
      vscode.window.showInformationMessage(`SageLLM: Server ready ✓  (${backendId} · ${modelId})`);
    } else if (attempts >= 20) {
      // 60s
      clearInterval(poll);
      sb?.setError("Server start timed out");
      vscode.window.showWarningMessage("SageLLM: Server did not respond within 60s. Check the terminal.");
    }
  }, 3000);
}
