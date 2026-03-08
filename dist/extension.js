"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode9 = __toESM(require("vscode"));
var cp2 = __toESM(require("child_process"));

// src/modelManager.ts
var vscode3 = __toESM(require("vscode"));

// src/gatewayClient.ts
var https = __toESM(require("https"));
var http = __toESM(require("http"));
var vscode = __toESM(require("vscode"));

// src/sagePorts.ts
var SAGE_PORTS = {
  // ── Platform services ──────────────────────────────────────────────────────
  STUDIO_FRONTEND: 5173,
  // Vite dev server (sage-studio)
  STUDIO_BACKEND: 8765,
  // Studio FastAPI backend
  // ── sageLLM Gateway (OpenAI-compatible API entry point) ───────────────────
  SAGELLM_GATEWAY: 8889,
  // sagellm-gateway standalone process
  EDGE_DEFAULT: 8899,
  // sage-edge aggregator shell
  // ── sageLLM full-stack (sagellm serve = gateway + engine) ─────────────────
  // Instance 1 (primary)
  SAGELLM_SERVE_PORT: 8901,
  // sagellm serve --port          (shell / proxy)
  SAGELLM_ENGINE_PORT: 8902,
  // sagellm serve --engine-port   (real backend)
  // Instance 2 (secondary)
  SAGELLM_SERVE_PORT_2: 8903,
  SAGELLM_ENGINE_PORT_2: 8904,
  // ── Embedding services ────────────────────────────────────────────────────
  EMBEDDING_DEFAULT: 8090,
  // Primary embedding server
  EMBEDDING_SECONDARY: 8091,
  // ── Benchmark & testing ───────────────────────────────────────────────────
  BENCHMARK_EMBEDDING: 8950,
  BENCHMARK_API: 8951
};
var DEFAULT_GATEWAY_PORT = SAGE_PORTS.SAGELLM_SERVE_PORT;

// src/gatewayClient.ts
var GatewayConnectionError = class extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = "GatewayConnectionError";
  }
};
function getConfig() {
  const cfg = vscode.workspace.getConfiguration("sagellm");
  const host = cfg.get("gateway.host", "localhost");
  const port = cfg.get("gateway.port", DEFAULT_GATEWAY_PORT);
  const apiKey = cfg.get("gateway.apiKey", "");
  const tls = cfg.get("gateway.tls", false);
  const baseUrl = `${tls ? "https" : "http"}://${host}:${port}`;
  return { baseUrl, apiKey };
}
function makeRequest(method, url, apiKey, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === "https:";
    const lib = isHttps ? https : http;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        ...body ? { "Content-Length": Buffer.byteLength(body) } : {}
      }
    };
    const req = lib.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => resolve({ statusCode: res.statusCode ?? 0, data }));
    });
    req.on(
      "error",
      (err) => reject(new GatewayConnectionError(`Network error: ${err.message}`))
    );
    req.setTimeout(3e4, () => {
      req.destroy();
      reject(new GatewayConnectionError("Request timed out after 30s"));
    });
    if (body) {
      req.write(body);
    }
    req.end();
  });
}
async function fetchModels() {
  const { baseUrl, apiKey } = getConfig();
  try {
    const { statusCode, data } = await makeRequest(
      "GET",
      `${baseUrl}/v1/models`,
      apiKey
    );
    if (statusCode !== 200) {
      throw new GatewayConnectionError(
        `Gateway returned HTTP ${statusCode}`,
        statusCode
      );
    }
    const resp = JSON.parse(data);
    return resp.data ?? [];
  } catch (err) {
    if (err instanceof GatewayConnectionError) {
      throw err;
    }
    throw new GatewayConnectionError(
      `Failed to reach sagellm-gateway at ${baseUrl}: ${String(err)}`
    );
  }
}
async function checkHealth() {
  const { baseUrl, apiKey } = getConfig();
  try {
    const { statusCode } = await makeRequest(
      "GET",
      `${baseUrl}/v1/models`,
      apiKey
    );
    return statusCode === 200;
  } catch {
    return false;
  }
}
async function streamChatCompletion(request, onChunk, signal) {
  const { baseUrl, apiKey } = getConfig();
  const body = JSON.stringify({ ...request, stream: true });
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Aborted"));
      return;
    }
    const parsed = new URL(`${baseUrl}/v1/chat/completions`);
    const isHttps = parsed.protocol === "https:";
    const lib = isHttps ? https : http;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        "Content-Length": Buffer.byteLength(body)
      }
    };
    let fullText = "";
    let buffer = "";
    const req = lib.request(options, (res) => {
      if (res.statusCode !== 200) {
        let errData = "";
        res.on("data", (c) => errData += c);
        res.on(
          "end",
          () => reject(
            new GatewayConnectionError(
              `Gateway returned HTTP ${res.statusCode}: ${errData}`,
              res.statusCode
            )
          )
        );
        return;
      }
      res.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") {
            continue;
          }
          if (trimmed.startsWith("data: ")) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const delta = json.choices?.[0]?.delta?.content ?? "";
              if (delta) {
                fullText += delta;
                onChunk(delta);
              }
            } catch {
            }
          }
        }
      });
      res.on("end", () => resolve(fullText));
      res.on(
        "error",
        (err) => reject(new GatewayConnectionError(err.message))
      );
    });
    req.on(
      "error",
      (err) => reject(new GatewayConnectionError(`Network error: ${err.message}`))
    );
    req.setTimeout(12e4, () => {
      req.destroy();
      reject(new GatewayConnectionError("Chat request timed out after 120s"));
    });
    if (signal) {
      signal.addEventListener("abort", () => {
        req.destroy();
        resolve(fullText);
      });
    }
    req.write(body);
    req.end();
  });
}
async function rawTextCompletion(request) {
  const { baseUrl, apiKey } = getConfig();
  const body = JSON.stringify({ ...request, stream: false });
  const { statusCode, data } = await makeRequest(
    "POST",
    `${baseUrl}/v1/completions`,
    apiKey,
    body
  );
  if (statusCode === 404) {
    throw new GatewayConnectionError("Endpoint /v1/completions not available", 404);
  }
  if (statusCode !== 200) {
    throw new GatewayConnectionError(
      `Gateway returned HTTP ${statusCode}: ${data}`,
      statusCode
    );
  }
  const resp = JSON.parse(data);
  return resp.choices?.[0]?.text ?? "";
}
async function chatCompletion(request) {
  const { baseUrl, apiKey } = getConfig();
  const body = JSON.stringify({ ...request, stream: false });
  const { statusCode, data } = await makeRequest(
    "POST",
    `${baseUrl}/v1/chat/completions`,
    apiKey,
    body
  );
  if (statusCode !== 200) {
    throw new GatewayConnectionError(
      `Gateway returned HTTP ${statusCode}: ${data}`,
      statusCode
    );
  }
  const resp = JSON.parse(data);
  return resp.choices?.[0]?.message?.content ?? "";
}
async function chatCompletionFull(request) {
  const { baseUrl, apiKey } = getConfig();
  const body = JSON.stringify({ ...request, stream: false });
  const { statusCode, data } = await makeRequest(
    "POST",
    `${baseUrl}/v1/chat/completions`,
    apiKey,
    body
  );
  if (statusCode !== 200) {
    throw new GatewayConnectionError(
      `Gateway returned HTTP ${statusCode}: ${data}`,
      statusCode
    );
  }
  const resp = JSON.parse(data);
  const choice = resp.choices?.[0];
  return {
    message: choice?.message ?? { role: "assistant", content: "" },
    finishReason: choice?.finish_reason ?? "stop"
  };
}

// src/serverLauncher.ts
var vscode2 = __toESM(require("vscode"));
var cp = __toESM(require("child_process"));
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var os = __toESM(require("os"));
var MODEL_CATALOG = [
  // ── Tiny / CPU-friendly ──────────────────────────────────────────────────
  { id: "Qwen/Qwen2.5-0.5B-Instruct", size: "0.5B", vram: "~1 GB", tags: ["chat", "cpu-ok", "fast"], desc: "Tiny Qwen chat, runs on CPU" },
  { id: "Qwen/Qwen2.5-Coder-0.5B-Instruct", size: "0.5B", vram: "~1 GB", tags: ["code", "cpu-ok", "fast"], desc: "Tiny code assistant" },
  { id: "TinyLlama/TinyLlama-1.1B-Chat-v1.0", size: "1.1B", vram: "~2 GB", tags: ["chat", "cpu-ok"], desc: "Lightweight general chat" },
  // ── Small (1–3 B) ────────────────────────────────────────────────────────
  { id: "Qwen/Qwen2.5-1.5B-Instruct", size: "1.5B", vram: "~3 GB", tags: ["chat", "fast"], desc: "Fast Qwen chat" },
  { id: "Qwen/Qwen2.5-Coder-1.5B-Instruct", size: "1.5B", vram: "~3 GB", tags: ["code", "fast"], desc: "Fast code assistant" },
  { id: "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B", size: "1.5B", vram: "~3 GB", tags: ["chat", "reasoning"], desc: "DeepSeek-R1 distilled, strong reasoning" },
  { id: "Qwen/Qwen2.5-3B-Instruct", size: "3B", vram: "~6 GB", tags: ["chat"], desc: "Balanced Qwen chat" },
  { id: "Qwen/Qwen2.5-Coder-3B-Instruct", size: "3B", vram: "~6 GB", tags: ["code"], desc: "Balanced code assistant" },
  // ── Medium (7 B) ─────────────────────────────────────────────────────────
  { id: "Qwen/Qwen2.5-7B-Instruct", size: "7B", vram: "~14 GB", tags: ["chat", "powerful"], desc: "Powerful Qwen chat (needs GPU)" },
  { id: "Qwen/Qwen2.5-Coder-7B-Instruct", size: "7B", vram: "~14 GB", tags: ["code", "powerful"], desc: "Powerful code assistant (needs GPU)" },
  { id: "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B", size: "7B", vram: "~14 GB", tags: ["chat", "reasoning", "powerful"], desc: "DeepSeek-R1 distilled 7B" }
];
function hfCacheDir() {
  return path.join(os.homedir(), ".cache", "huggingface", "hub");
}
function hfDirName(modelId) {
  return "models--" + modelId.replace(/\//g, "--");
}
function isModelDownloaded(modelId) {
  const dir = path.join(hfCacheDir(), hfDirName(modelId));
  return fs.existsSync(dir);
}
function localModelIds() {
  const set = /* @__PURE__ */ new Set();
  try {
    for (const entry of fs.readdirSync(hfCacheDir())) {
      if (entry.startsWith("models--")) {
        set.add(entry.slice("models--".length).replace(/--/g, "/"));
      }
    }
  } catch {
  }
  return set;
}
async function downloadModel(modelId) {
  return vscode2.window.withProgress(
    {
      location: vscode2.ProgressLocation.Notification,
      title: `SageLLM: Downloading ${modelId}`,
      cancellable: true
    },
    async (progress, token) => {
      return new Promise((resolve) => {
        const proc = cp.spawn(
          "huggingface-cli",
          ["download", modelId, "--resume-download"],
          { env: { ...process.env } }
        );
        let lastPct = 0;
        const parseLine = (line) => {
          const m = line.match(/(\d+)%\|/);
          if (m) {
            const pct = parseInt(m[1], 10);
            const increment = pct - lastPct;
            if (increment > 0) {
              lastPct = pct;
              const speed = line.match(/[\d.]+\s*[MG]B\/s/)?.[0] ?? "";
              const eta = line.match(/<([\d:]+),/)?.[1] ?? "";
              progress.report({
                increment,
                message: `${pct}%${speed ? "  " + speed : ""}${eta ? "  ETA " + eta : ""}`
              });
            }
          } else if (line.includes("Downloading")) {
            const file = line.match(/Downloading (.+?):/)?.[1];
            if (file)
              progress.report({ message: file });
          }
        };
        let stderr = "";
        proc.stderr.on("data", (d) => {
          const text = d.toString();
          stderr += text;
          for (const line of text.split(/\r?\n/))
            parseLine(line);
        });
        proc.stdout.on("data", (d) => {
          for (const line of d.toString().split(/\r?\n/))
            parseLine(line);
        });
        proc.on("close", (code) => {
          if (code === 0) {
            progress.report({ increment: 100 - lastPct, message: "\u5B8C\u6210 \u2713" });
            resolve(true);
          } else if (token.isCancellationRequested) {
            resolve(false);
          } else {
            vscode2.window.showErrorMessage(
              `SageLLM: \u4E0B\u8F7D\u5931\u8D25 (exit ${code}).
${stderr.slice(-300)}`
            );
            resolve(false);
          }
        });
        proc.on("error", (err) => {
          vscode2.window.showErrorMessage(`SageLLM: \u65E0\u6CD5\u8FD0\u884C huggingface-cli: ${err.message}`);
          resolve(false);
        });
        token.onCancellationRequested(() => {
          proc.kill("SIGTERM");
          resolve(false);
        });
      });
    }
  );
}
function detectBackends(infoOutput) {
  const backends = [
    { id: "cpu", label: "$(circuit-board) CPU", detected: true, description: "Always available" }
  ];
  const hasCuda = /CUDA.*✅|✅.*CUDA|✅.*\d+\s*device/i.test(infoOutput);
  const hasAscend = /Ascend.*✅|✅.*Ascend|✅.*torch_npu/i.test(infoOutput);
  const cudaMatch = infoOutput.match(/CUDA[^\n]*✅[^\n]*?-\s*(.+)|✅\s*\d+\s*device[^-]*-\s*(.+)/i);
  const cudaName = cudaMatch ? (cudaMatch[1] || cudaMatch[2] || "").trim().split("\n")[0] : "";
  if (hasCuda)
    backends.push({ id: "cuda", label: "$(zap) CUDA (GPU)", detected: true, description: cudaName || "NVIDIA GPU detected" });
  if (hasAscend)
    backends.push({ id: "ascend", label: "$(hubot) Ascend (\u6607\u817E NPU)", detected: true, description: "Ascend NPU detected" });
  return backends;
}
async function detectBackendsFromCLI() {
  return new Promise((resolve) => {
    cp.exec("sagellm info", { timeout: 15e3 }, (_err, stdout) => {
      try {
        resolve(detectBackends(stdout ?? ""));
      } catch {
        resolve([{ id: "cpu", label: "$(circuit-board) CPU", detected: true, description: "Always available" }]);
      }
    });
  });
}
async function tryFetchGatewayModels() {
  try {
    const models = await fetchModels();
    return models.map((m) => m.id);
  } catch {
    return [];
  }
}
async function buildModelPickerItems(recentModels, savedModel) {
  const SEP2 = vscode2.QuickPickItemKind.Separator;
  const [gatewayIds, localIds] = await Promise.all([
    tryFetchGatewayModels(),
    Promise.resolve(localModelIds())
  ]);
  const seen = /* @__PURE__ */ new Set();
  const items = [];
  const add = (item) => {
    const key = item.detail ?? item.label;
    if (seen.has(key))
      return;
    seen.add(key);
    items.push(item);
  };
  if (savedModel) {
    const local = localIds.has(savedModel);
    add({ label: `$(star-full) ${savedModel}`, description: local ? "\u2705 last used" : "\u2601\uFE0F last used (not cached)", detail: savedModel });
  }
  if (gatewayIds.length) {
    items.push({ label: "Running on gateway", kind: SEP2 });
    for (const id of gatewayIds) {
      add({ label: `$(server) ${id}`, description: "\u2705 serving now", detail: id });
    }
  }
  const downloadedCatalog = MODEL_CATALOG.filter((m) => localIds.has(m.id));
  const downloadedExtra = [...localIds].filter((id) => !MODEL_CATALOG.some((m) => m.id === id));
  const recentDownloaded = recentModels.filter((id) => localIds.has(id));
  const downloadedItems = [];
  const addDownloaded = (id, desc) => {
    if (seen.has(id))
      return;
    seen.add(id);
    downloadedItems.push({ label: `$(database) ${id}`, description: `\u2705 ${desc}`, detail: id });
  };
  downloadedCatalog.forEach((m) => addDownloaded(m.id, `${m.size} \xB7 ${m.vram} \xB7 ${m.desc}`));
  recentDownloaded.forEach((id) => addDownloaded(id, "recent"));
  downloadedExtra.forEach((id) => addDownloaded(id, "local cache"));
  if (downloadedItems.length) {
    items.push({ label: "Downloaded", kind: SEP2 });
    items.push(...downloadedItems);
  }
  const recommendedItems = [];
  for (const m of MODEL_CATALOG) {
    if (seen.has(m.id))
      continue;
    seen.add(m.id);
    const tagStr = m.tags.includes("cpu-ok") ? "runs on CPU \xB7 " : "";
    recommendedItems.push({
      label: `$(cloud-download) ${m.id}`,
      description: `\u2601\uFE0F ${m.size} \xB7 ${m.vram}  \u2014  ${tagStr}${m.desc}`,
      detail: m.id
    });
  }
  if (recommendedItems.length) {
    items.push({ label: "Recommended  (will auto-download)", kind: SEP2 });
    items.push(...recommendedItems);
  }
  const extraRecent = recentModels.filter((id) => !seen.has(id));
  if (extraRecent.length) {
    items.push({ label: "Recent", kind: SEP2 });
    for (const id of extraRecent) {
      seen.add(id);
      items.push({ label: `$(history) ${id}`, description: "recent", detail: id });
    }
  }
  items.push({ label: "", kind: SEP2 });
  items.push({ label: "$(edit) Enter model path / HuggingFace ID\u2026", description: "", detail: "__custom__" });
  return items;
}
async function promptAndStartServer(context, sb) {
  const cfg = vscode2.workspace.getConfiguration("sagellm");
  const port = cfg.get("gateway.port", DEFAULT_GATEWAY_PORT);
  sb?.setConnecting();
  const backends = await detectBackendsFromCLI();
  const backendItems = backends.map((b) => ({
    label: b.label,
    description: b.detected ? `\u2705 ${b.description}` : b.description,
    detail: b.id
  }));
  const savedBackend = cfg.get("backend", "");
  if (savedBackend) {
    const idx = backendItems.findIndex((i) => i.detail === savedBackend);
    if (idx > 0)
      backendItems.unshift(...backendItems.splice(idx, 1));
  } else {
    backendItems.reverse();
  }
  const pickedBackend = await vscode2.window.showQuickPick(backendItems, {
    title: "SageLLM: Select Inference Backend",
    placeHolder: "Choose hardware backend to use"
  });
  if (!pickedBackend) {
    sb?.setGatewayStatus(false);
    return;
  }
  const backendId = pickedBackend.detail;
  await cfg.update("backend", backendId, vscode2.ConfigurationTarget.Global);
  const recentModels = context.globalState.get("sagellm.recentModels", []);
  const savedModel = cfg.get("preloadModel", "").trim();
  const modelItems = await vscode2.window.withProgress(
    { location: vscode2.ProgressLocation.Notification, title: "SageLLM: Scanning models\u2026", cancellable: false },
    () => buildModelPickerItems(recentModels, savedModel)
  );
  const totalDownloadable = MODEL_CATALOG.filter((m) => !isModelDownloaded(m.id)).length;
  const pickedModel = await vscode2.window.showQuickPick(modelItems, {
    title: `SageLLM: Select Model  (\u2601\uFE0F ${totalDownloadable} available to download)`,
    placeHolder: "\u2705 downloaded \xB7 \u2601\uFE0F will auto-download \xB7 $(edit) custom path",
    matchOnDescription: true,
    matchOnDetail: false
  });
  if (!pickedModel) {
    sb?.setGatewayStatus(false);
    return;
  }
  let modelId = pickedModel.detail;
  if (modelId === "__custom__") {
    modelId = await vscode2.window.showInputBox({
      title: "SageLLM: Model Path or HuggingFace ID",
      prompt: "e.g.  Qwen/Qwen2.5-7B-Instruct  or  /models/my-model",
      value: savedModel,
      ignoreFocusOut: true
    }) ?? "";
    if (!modelId.trim()) {
      sb?.setGatewayStatus(false);
      return;
    }
    modelId = modelId.trim();
  }
  if (!isModelDownloaded(modelId) && !modelId.startsWith("/")) {
    const choice = await vscode2.window.showInformationMessage(
      `"${modelId}" \u5C1A\u672A\u4E0B\u8F7D\u3002\u662F\u5426\u73B0\u5728\u4E0B\u8F7D\uFF1F`,
      { modal: true },
      "\u4E0B\u8F7D",
      "\u53D6\u6D88"
    );
    if (choice !== "\u4E0B\u8F7D") {
      sb?.setGatewayStatus(false);
      return;
    }
    const ok = await downloadModel(modelId);
    if (!ok) {
      sb?.setGatewayStatus(false);
      return;
    }
    vscode2.window.showInformationMessage(`\u2705 ${modelId} \u4E0B\u8F7D\u5B8C\u6210`);
  }
  await cfg.update("preloadModel", modelId, vscode2.ConfigurationTarget.Global);
  await context.globalState.update(
    "sagellm.recentModels",
    [modelId, ...recentModels.filter((m) => m !== modelId)].slice(0, 10)
  );
  const baseCmd = cfg.get("gatewayStartCommand", "sagellm serve");
  const cmd = `${baseCmd} --backend ${backendId} --model ${modelId} --port ${port}`;
  const terminal = vscode2.window.createTerminal({
    name: "SageLLM Server",
    isTransient: false,
    // Disable preflight canary — it loads the model via `transformers` BEFORE the
    // engine starts, doubling memory usage and adding 2–10 min to startup time.
    // The engine's own startup canary (SAGELLM_STARTUP_CANARY) still validates
    // output quality after the engine is healthy.
    env: { SAGELLM_PREFLIGHT_CANARY: "0" }
  });
  terminal.sendText(cmd);
  terminal.show(false);
  vscode2.window.showInformationMessage(`SageLLM: Starting ${backendId.toUpperCase()} \xB7 ${modelId}\u2026`);
  let attempts = 0;
  const maxPollAttempts = 100;
  const poll = setInterval(async () => {
    attempts++;
    if (await checkHealth()) {
      clearInterval(poll);
      sb?.setGatewayStatus(true);
      vscode2.window.showInformationMessage(`SageLLM: Server ready \u2713  (${backendId} \xB7 ${modelId})`);
    } else if (attempts >= maxPollAttempts) {
      clearInterval(poll);
      sb?.setError("Server start timed out");
      vscode2.window.showWarningMessage("SageLLM: Server did not respond within 5 minutes. Check the terminal.");
    } else if (attempts % 20 === 0) {
      const elapsed = Math.round(attempts * 3 / 60);
      vscode2.window.setStatusBarMessage(`SageLLM: Loading model\u2026 (${elapsed} min elapsed)`, 5e3);
    }
  }, 3e3);
}

// src/modelManager.ts
var SEP = vscode3.QuickPickItemKind.Separator;
var ModelManager = class {
  constructor(context) {
    this.context = context;
    this.selectedModel = vscode3.workspace.getConfiguration("sagellm").get("model", "") || context.globalState.get("sagellm.selectedModel", "");
  }
  models = [];
  selectedModel = "";
  _onDidChangeModels = new vscode3.EventEmitter();
  onDidChangeModels = this._onDidChangeModels.event;
  get currentModel() {
    return this.selectedModel;
  }
  getModels() {
    return this.models;
  }
  async refresh() {
    try {
      this.models = await fetchModels();
      this._onDidChangeModels.fire(this.models);
      return this.models;
    } catch (err) {
      if (err instanceof GatewayConnectionError) {
        throw err;
      }
      throw new Error(String(err));
    }
  }
  async selectModelInteractive() {
    let loadedModels = [];
    try {
      loadedModels = await this.refresh();
    } catch {
    }
    const loadedIds = new Set(loadedModels.map((m) => m.id));
    const items = [];
    if (loadedModels.length > 0) {
      items.push({ label: "Running in gateway", kind: SEP });
      for (const m of loadedModels) {
        items.push({
          label: `$(check) ${m.id}`,
          description: "\u25CF active",
          detail: m.id
        });
      }
    }
    const downloadedLocal = MODEL_CATALOG.filter(
      (m) => isModelDownloaded(m.id) && !loadedIds.has(m.id)
    );
    if (downloadedLocal.length > 0) {
      items.push({ label: "Downloaded \u2014 restart gateway to load", kind: SEP });
      for (const m of downloadedLocal) {
        items.push({
          label: `$(package) ${m.id}`,
          description: `${m.size} \xB7 ${m.vram}`,
          detail: m.id
        });
      }
    }
    const downloadable = MODEL_CATALOG.filter(
      (m) => !isModelDownloaded(m.id) && !loadedIds.has(m.id)
    );
    if (downloadable.length > 0) {
      items.push({ label: "Available to download", kind: SEP });
      for (const m of downloadable) {
        items.push({
          label: `$(cloud-download) ${m.id}`,
          description: `${m.size} \xB7 ${m.vram} \xB7 ${m.desc}`,
          detail: m.id
        });
      }
    }
    items.push({ label: "", kind: SEP });
    items.push({
      label: "$(edit) Enter model path / HuggingFace ID\u2026",
      description: "",
      detail: "__custom__"
    });
    const picked = await vscode3.window.showQuickPick(items, {
      placeHolder: "$(check) active  $(package) local  $(cloud-download) downloadable",
      title: "SageLLM: Select Model",
      matchOnDescription: true
    });
    if (!picked || picked.kind === SEP)
      return void 0;
    let modelId = picked.detail ?? "";
    if (modelId === "__custom__") {
      modelId = await vscode3.window.showInputBox({
        title: "SageLLM: Model Path or HuggingFace ID",
        prompt: "e.g.  Qwen/Qwen2.5-7B-Instruct  or  /models/my-model",
        value: this.selectedModel,
        ignoreFocusOut: true
      }) ?? "";
      if (!modelId.trim())
        return void 0;
      modelId = modelId.trim();
    }
    await this.setModel(modelId);
    if (!loadedIds.has(modelId)) {
      await vscode3.workspace.getConfiguration("sagellm").update("preloadModel", modelId, vscode3.ConfigurationTarget.Global);
      const choice = await vscode3.window.showInformationMessage(
        `"${modelId}" is not currently loaded. Restart gateway to use it?`,
        "Restart Gateway",
        "Later"
      );
      if (choice === "Restart Gateway") {
        vscode3.commands.executeCommand("sagellm.restartGateway");
      }
    }
    return modelId;
  }
  async setModel(modelId) {
    this.selectedModel = modelId;
    await this.context.globalState.update("sagellm.selectedModel", modelId);
    vscode3.workspace.getConfiguration("sagellm").update("model", modelId, vscode3.ConfigurationTarget.Global);
  }
  /** Ensure a model is selected, prompting if not */
  async ensureModel() {
    if (this.selectedModel) {
      return this.selectedModel;
    }
    return this.selectModelInteractive();
  }
  dispose() {
    this._onDidChangeModels.dispose();
  }
};
var ModelsTreeProvider = class {
  constructor(modelManager) {
    this.modelManager = modelManager;
    modelManager.onDidChangeModels(() => this._onDidChangeTreeData.fire());
  }
  _onDidChangeTreeData = new vscode3.EventEmitter();
  onDidChangeTreeData = this._onDidChangeTreeData.event;
  getTreeItem(element) {
    return element;
  }
  getChildren() {
    const models = this.modelManager.getModels();
    if (models.length === 0) {
      return [
        new ModelTreeItem(
          "No models loaded",
          vscode3.TreeItemCollapsibleState.None,
          true
        )
      ];
    }
    return models.map(
      (m) => new ModelTreeItem(
        m.id,
        vscode3.TreeItemCollapsibleState.None,
        false,
        m.id === this.modelManager.currentModel,
        m
      )
    );
  }
  refresh() {
    this._onDidChangeTreeData.fire();
  }
};
var ModelTreeItem = class extends vscode3.TreeItem {
  constructor(label, collapsibleState, isPlaceholder = false, isActive = false, model) {
    super(label, collapsibleState);
    this.model = model;
    if (isPlaceholder) {
      this.contextValue = "placeholder";
      this.iconPath = new vscode3.ThemeIcon("info");
    } else if (isActive) {
      this.iconPath = new vscode3.ThemeIcon("check");
      this.contextValue = "activeModel";
      this.description = "active";
    } else {
      this.iconPath = new vscode3.ThemeIcon("hubot");
      this.contextValue = "model";
      this.command = {
        command: "sagellm.selectModel",
        title: "Select Model",
        arguments: [label]
      };
    }
  }
};

// src/chatPanel.ts
var vscode5 = __toESM(require("vscode"));

// src/workspaceContext.ts
var vscode4 = __toESM(require("vscode"));
var path2 = __toESM(require("path"));
var fs2 = __toESM(require("fs"));
var WORKSPACE_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_active_file",
      description: "Get the content of the file currently open in the editor, along with the cursor position and any selected text.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the contents of a file in the workspace. You can optionally specify a line range. The path can be absolute or relative to the workspace root.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to workspace root or absolute" },
          start_line: { type: "number", description: "First line to read (1-based, inclusive). Optional." },
          end_line: { type: "number", description: "Last line to read (1-based, inclusive). Optional." }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_directory",
      description: "List the files and subdirectories in a directory. Returns names; trailing '/' indicates a directory.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Directory path relative to workspace root (empty string or '.' for root)."
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_code",
      description: "Search for a text pattern (regex supported) across workspace files. Returns matching lines with file paths and line numbers. Like grep.",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Text or regex pattern to search for." },
          include_pattern: {
            type: "string",
            description: "Glob pattern to restrict which files are searched, e.g. '**/*.py'. Optional."
          },
          max_results: {
            type: "number",
            description: "Maximum number of results to return (default 30)."
          }
        },
        required: ["pattern"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_workspace_info",
      description: "Get workspace metadata: root path, top-level directory listing, and currently open files.",
      parameters: { type: "object", properties: {} }
    }
  }
];
async function executeTool(name, args) {
  try {
    switch (name) {
      case "get_active_file":
        return await toolGetActiveFile();
      case "read_file":
        return await toolReadFile(args);
      case "list_directory":
        return await toolListDirectory(args);
      case "search_code":
        return await toolSearchCode(args);
      case "get_workspace_info":
        return await toolGetWorkspaceInfo();
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err) {
    return `Error executing tool ${name}: ${err instanceof Error ? err.message : String(err)}`;
  }
}
async function toolGetActiveFile() {
  const editor = vscode4.window.activeTextEditor;
  if (!editor) {
    return "No file is currently open in the editor.";
  }
  const doc = editor.document;
  const filePath = doc.fileName;
  const wsRoot = getWorkspaceRoot();
  const relPath = wsRoot ? path2.relative(wsRoot, filePath) : filePath;
  const selection = editor.selection;
  const selectedText = !selection.isEmpty ? doc.getText(selection) : null;
  const cursorLine = selection.active.line + 1;
  const content = doc.getText();
  const lines = content.split("\n");
  const MAX = 400;
  const truncated = lines.length > MAX;
  const displayLines = truncated ? lines.slice(0, MAX) : lines;
  let result = `File: ${relPath}
Language: ${doc.languageId}
Total lines: ${lines.length}
Cursor at line: ${cursorLine}
`;
  if (selectedText) {
    result += `
Selected text (lines ${selection.start.line + 1}\u2013${selection.end.line + 1}):
\`\`\`
${selectedText}
\`\`\`
`;
  }
  result += `
Content${truncated ? ` (first ${MAX} lines)` : ""}:
\`\`\`${doc.languageId}
${displayLines.join("\n")}`;
  if (truncated) {
    result += `
... (${lines.length - MAX} more lines \u2014 use read_file with start_line/end_line to see more)
`;
  }
  result += "\n```";
  return result;
}
async function toolReadFile(args) {
  const filePath = String(args["path"] ?? "");
  const startLine = args["start_line"] != null ? Number(args["start_line"]) : null;
  const endLine = args["end_line"] != null ? Number(args["end_line"]) : null;
  if (!filePath)
    return "Error: 'path' is required.";
  const absPath = resolveWorkspacePath(filePath);
  if (!absPath)
    return `Error: workspace root not found, cannot resolve '${filePath}'.`;
  if (!fs2.existsSync(absPath))
    return `Error: file not found: ${filePath}`;
  const stat = fs2.statSync(absPath);
  if (stat.isDirectory())
    return `Error: '${filePath}' is a directory. Use list_directory instead.`;
  const MAX_BYTES = 2e5;
  if (stat.size > MAX_BYTES) {
    if (startLine == null) {
      return `File is large (${Math.round(stat.size / 1024)} KB). Please specify start_line and end_line to read a portion.`;
    }
  }
  const raw = fs2.readFileSync(absPath, "utf8");
  const lines = raw.split("\n");
  const sl = startLine != null ? Math.max(1, startLine) : 1;
  const el = endLine != null ? Math.min(lines.length, endLine) : lines.length;
  const slice = lines.slice(sl - 1, el);
  const ext = path2.extname(absPath).slice(1) || "text";
  const lineInfo = sl !== 1 || el !== lines.length ? ` (lines ${sl}\u2013${el} of ${lines.length})` : ` (${lines.length} lines)`;
  return `File: ${filePath}${lineInfo}
\`\`\`${ext}
${slice.join("\n")}
\`\`\``;
}
async function toolListDirectory(args) {
  const dirPath = String(args["path"] ?? ".");
  const absPath = resolveWorkspacePath(dirPath || ".");
  if (!absPath)
    return "Error: no workspace folder open.";
  if (!fs2.existsSync(absPath))
    return `Error: directory not found: ${dirPath}`;
  const stat = fs2.statSync(absPath);
  if (!stat.isDirectory())
    return `Error: '${dirPath}' is a file, not a directory.`;
  const entries = fs2.readdirSync(absPath, { withFileTypes: true });
  const IGNORE = /* @__PURE__ */ new Set([".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build", ".pytest_cache", ".mypy_cache"]);
  const shown = entries.filter((e) => !IGNORE.has(e.name) && !e.name.startsWith(".")).sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory())
      return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name);
  }).map((e) => e.isDirectory() ? `${e.name}/` : e.name);
  const relPath = dirPath === "." ? "(workspace root)" : dirPath;
  return `Directory: ${relPath}
${shown.length === 0 ? "(empty)" : shown.join("\n")}`;
}
async function toolSearchCode(args) {
  const pattern = String(args["pattern"] ?? "");
  const includeGlob = args["include_pattern"] ? String(args["include_pattern"]) : "**/*";
  const maxResults = args["max_results"] != null ? Number(args["max_results"]) : 30;
  if (!pattern)
    return "Error: 'pattern' is required.";
  const wsRoot = getWorkspaceRoot();
  if (!wsRoot)
    return "Error: no workspace folder open.";
  const results = [];
  let regex;
  try {
    regex = new RegExp(pattern, "g");
  } catch {
    regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  }
  const uris = await vscode4.workspace.findFiles(
    new vscode4.RelativePattern(wsRoot, includeGlob),
    "{**/node_modules/**,**/.git/**,**/__pycache__/**,**/.venv/**,**/venv/**,**/dist/**,**/build/**}",
    500
  );
  let count = 0;
  for (const uri of uris) {
    if (count >= maxResults)
      break;
    try {
      const raw = fs2.readFileSync(uri.fsPath, "utf8");
      const lines = raw.split("\n");
      for (let i = 0; i < lines.length && count < maxResults; i++) {
        regex.lastIndex = 0;
        if (regex.test(lines[i])) {
          const relPath = path2.relative(wsRoot, uri.fsPath);
          results.push(`${relPath}:${i + 1}: ${lines[i].trim()}`);
          count++;
        }
      }
    } catch {
    }
  }
  if (results.length === 0) {
    return `No matches found for pattern: ${pattern}`;
  }
  const header = count >= maxResults ? `First ${maxResults} matches` : `${count} match${count !== 1 ? "es" : ""}`;
  return `${header} for "${pattern}" in ${uris.length} files searched:
${results.join("\n")}`;
}
async function toolGetWorkspaceInfo() {
  const wsRoot = getWorkspaceRoot();
  if (!wsRoot)
    return "No workspace folder is open.";
  const openFiles = vscode4.workspace.textDocuments.filter((d) => !d.isUntitled && d.uri.scheme === "file").map((d) => path2.relative(wsRoot, d.fileName)).filter((p) => !p.startsWith(".."));
  let topLevel = "(unable to list)";
  try {
    const entries = fs2.readdirSync(wsRoot, { withFileTypes: true });
    const IGNORE = /* @__PURE__ */ new Set([".git", "node_modules", "__pycache__", ".venv", "venv"]);
    topLevel = entries.filter((e) => !IGNORE.has(e.name) && !e.name.startsWith(".")).sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory())
        return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    }).map((e) => e.isDirectory() ? `  ${e.name}/` : `  ${e.name}`).join("\n");
  } catch {
  }
  const wsFolders = (vscode4.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath).join(", ");
  return [
    `Workspace root: ${wsRoot}`,
    `All workspace folders: ${wsFolders || wsRoot}`,
    `
Top-level contents:
${topLevel}`,
    openFiles.length ? `
Currently open files:
${openFiles.map((f) => `  ${f}`).join("\n")}` : ""
  ].filter(Boolean).join("\n");
}
function buildActiveFileContext() {
  const editor = vscode4.window.activeTextEditor;
  if (!editor)
    return "";
  const doc = editor.document;
  const wsRoot = getWorkspaceRoot();
  const relPath = wsRoot ? path2.relative(wsRoot, doc.fileName) : doc.fileName;
  const selection = editor.selection;
  const selectedText = !selection.isEmpty ? doc.getText(selection) : null;
  const totalLines = doc.lineCount;
  const PREVIEW_LINES = 80;
  const content = doc.getText();
  const lines = content.split("\n");
  const preview = lines.slice(0, PREVIEW_LINES).join("\n");
  const truncated = lines.length > PREVIEW_LINES;
  let ctx = `

---
**Active file**: \`${relPath}\` (${doc.languageId}, ${totalLines} lines)
`;
  if (selectedText) {
    ctx += `**Selected text** (lines ${selection.start.line + 1}\u2013${selection.end.line + 1}):
\`\`\`${doc.languageId}
${selectedText}
\`\`\`
`;
  }
  ctx += `**File preview** (${truncated ? `first ${PREVIEW_LINES}` : `all ${totalLines}`} lines):
\`\`\`${doc.languageId}
${preview}`;
  if (truncated)
    ctx += `
... (use read_file tool for more)`;
  ctx += "\n```\n---";
  return ctx;
}
async function resolveAtMentions(text) {
  const mentions = [];
  let resolved = text;
  const re = /@file:(?:"([^"]+)"|(\S+))/g;
  let match;
  const replacements = [];
  while ((match = re.exec(text)) !== null) {
    const filePath = match[1] ?? match[2];
    const absPath = resolveWorkspacePath(filePath);
    if (absPath && fs2.existsSync(absPath)) {
      mentions.push(filePath);
      const content = await toolReadFile({ path: filePath });
      replacements.push({ original: match[0], replacement: `
${content}
` });
    }
  }
  for (const { original, replacement } of replacements) {
    resolved = resolved.replace(original, replacement);
  }
  return { resolved, mentions };
}
function getWorkspaceRoot() {
  return vscode4.workspace.workspaceFolders?.[0]?.uri.fsPath;
}
function resolveWorkspacePath(relOrAbs) {
  if (path2.isAbsolute(relOrAbs))
    return relOrAbs;
  const root = getWorkspaceRoot();
  if (!root)
    return void 0;
  return path2.join(root, relOrAbs);
}

// src/chatPanel.ts
async function runAgenticChat(userText, history, model, postMsg, abortSignal, options) {
  const { resolved, mentions } = await resolveAtMentions(userText);
  if (mentions.length) {
    postMsg({ type: "toolNote", text: `\u{1F4CE} Attached: ${mentions.join(", ")}` });
  }
  let userContent = resolved;
  if (options.useContext) {
    const fileCtx = buildActiveFileContext();
    if (fileCtx) {
      userContent = resolved + fileCtx;
    }
  }
  history.push({ role: "user", content: userContent });
  const MAX_ROUNDS = 5;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    if (abortSignal.aborted)
      break;
    let finishReason;
    let assistantMsg;
    try {
      const result = await chatCompletionFull({
        model,
        messages: history,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        tools: WORKSPACE_TOOLS,
        tool_choice: "auto"
      });
      finishReason = result.finishReason;
      assistantMsg = result.message;
    } catch {
      break;
    }
    if (finishReason === "tool_calls" && assistantMsg.tool_calls?.length) {
      history.push(assistantMsg);
      for (const tc of assistantMsg.tool_calls) {
        if (abortSignal.aborted)
          break;
        let args = {};
        try {
          args = JSON.parse(tc.function.arguments);
        } catch {
        }
        postMsg({ type: "toolCall", tool: tc.function.name, args: tc.function.arguments });
        const result = await executeTool(tc.function.name, args);
        history.push({
          role: "tool",
          tool_call_id: tc.id,
          name: tc.function.name,
          content: result
        });
      }
      continue;
    }
    if (assistantMsg.content) {
      postMsg({ type: "assistantStart" });
      const chunks = assistantMsg.content.match(/.{1,40}/gs) ?? [assistantMsg.content];
      for (const chunk of chunks) {
        if (abortSignal.aborted)
          break;
        postMsg({ type: "assistantDelta", text: chunk });
      }
      postMsg({ type: "assistantEnd" });
      history.push({ role: "assistant", content: assistantMsg.content });
      return assistantMsg.content;
    }
    break;
  }
  postMsg({ type: "assistantStart" });
  let fullResponse = "";
  try {
    fullResponse = await streamChatCompletion(
      { model, messages: history, max_tokens: options.maxTokens, temperature: options.temperature },
      (delta) => postMsg({ type: "assistantDelta", text: delta }),
      abortSignal
    );
    history.push({ role: "assistant", content: fullResponse });
    postMsg({ type: "assistantEnd" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    postMsg({ type: "error", text: msg });
    history.pop();
  }
  return fullResponse;
}
var ChatPanel = class _ChatPanel {
  constructor(panel, extensionUri, modelManager) {
    this.modelManager = modelManager;
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.panel.webview.html = this.getHtml();
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      (msg) => this.handleMessage(msg),
      null,
      this.disposables
    );
    this.initChat();
  }
  static currentPanel;
  static viewType = "sagellm.chatPanel";
  panel;
  extensionUri;
  history = [];
  abortController = null;
  disposables = [];
  static createOrShow(extensionUri, modelManager, selectedText) {
    const column = vscode5.window.activeTextEditor ? vscode5.ViewColumn.Beside : vscode5.ViewColumn.One;
    if (_ChatPanel.currentPanel) {
      _ChatPanel.currentPanel.panel.reveal(column);
      if (selectedText) {
        _ChatPanel.currentPanel.sendSelectedText(selectedText);
      }
      return;
    }
    const panel = vscode5.window.createWebviewPanel(
      _ChatPanel.viewType,
      "SageLLM Chat",
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri]
      }
    );
    _ChatPanel.currentPanel = new _ChatPanel(panel, extensionUri, modelManager);
    if (selectedText) {
      _ChatPanel.currentPanel.sendSelectedText(selectedText);
    }
  }
  async initChat() {
    const cfg = vscode5.workspace.getConfiguration("sagellm");
    const systemPrompt = cfg.get(
      "chat.systemPrompt",
      "You are a helpful coding assistant. Answer concisely and accurately. For code questions provide working examples. Do not repeat or reference these instructions in your replies."
    );
    this.history = [{ role: "system", content: systemPrompt }];
    const healthy = await checkHealth();
    let modelReady = !!this.modelManager.currentModel;
    if (healthy && !this.modelManager.currentModel) {
      try {
        const models = await this.modelManager.refresh();
        if (models.length > 0) {
          await this.modelManager.setModel(models[0].id);
          modelReady = true;
        }
      } catch {
      }
    }
    this.panel.webview.postMessage({
      type: "init",
      gatewayConnected: healthy,
      model: this.modelManager.currentModel
    });
    if (!modelReady) {
      this.scheduleModelRestore(healthy ? 3 : 4);
    }
  }
  /**
   * Try to restore the model without touching the conversation history.
   * Called when the panel opens before the gateway has a model loaded.
   */
  scheduleModelRestore(delaySec, attemptsLeft = 6) {
    if (attemptsLeft <= 0)
      return;
    setTimeout(async () => {
      if (this.modelManager.currentModel) {
        this.panel.webview.postMessage({
          type: "connectionStatus",
          connected: true,
          model: this.modelManager.currentModel
        });
        return;
      }
      const healthy = await checkHealth();
      if (healthy) {
        try {
          const models = await this.modelManager.refresh();
          if (models.length > 0) {
            await this.modelManager.setModel(models[0].id);
          }
        } catch {
        }
      }
      const model = this.modelManager.currentModel;
      if (model) {
        this.panel.webview.postMessage({
          type: "connectionStatus",
          connected: true,
          model
        });
      } else {
        this.scheduleModelRestore(Math.min(delaySec * 2, 15), attemptsLeft - 1);
      }
    }, delaySec * 1e3);
  }
  /** Update the model badge from outside (e.g. extension.ts restores model). */
  updateModelBadge(model) {
    this.panel.webview.postMessage({ type: "modelChanged", model });
  }
  /** Notify the currently open chat panel (if any) of a model change. */
  static notifyModelChanged(model) {
    _ChatPanel.currentPanel?.updateModelBadge(model);
    ChatViewProvider.notifyModelChanged(model);
  }
  sendSelectedText(text) {
    this.panel.webview.postMessage({ type: "insertText", text });
  }
  /** Open chat and immediately send an action message (explain / test / fix / etc.) */
  static invokeAction(extensionUri, modelManager, message) {
    _ChatPanel.createOrShow(extensionUri, modelManager);
    setTimeout(() => {
      _ChatPanel.currentPanel?.panel.webview.postMessage({
        type: "sendImmediate",
        text: message
      });
    }, 350);
  }
  async handleMessage(message) {
    switch (message.type) {
      case "send":
        await this.handleChatMessage(message.text ?? "");
        break;
      case "abort":
        this.abortController?.abort();
        break;
      case "clear":
        await this.initChat();
        this.panel.webview.postMessage({ type: "cleared" });
        break;
      case "selectModel":
        await this.modelManager.selectModelInteractive();
        this.panel.webview.postMessage({
          type: "modelChanged",
          model: this.modelManager.currentModel
        });
        break;
      case "checkConnection": {
        const healthy = await checkHealth();
        this.panel.webview.postMessage({
          type: "connectionStatus",
          connected: healthy,
          model: this.modelManager.currentModel
        });
        break;
      }
      case "showInstallGuide":
        vscode5.commands.executeCommand("sagellm.showInstallGuide");
        break;
      case "restartGateway":
        vscode5.commands.executeCommand("sagellm.restartGateway");
        break;
    }
  }
  async handleChatMessage(userText) {
    if (!userText.trim())
      return;
    let model = this.modelManager.currentModel;
    if (!model) {
      model = await this.modelManager.selectModelInteractive() ?? "";
      if (!model) {
        this.panel.webview.postMessage({
          type: "error",
          text: "No model selected. Please select a model first."
        });
        return;
      }
    }
    const cfg = vscode5.workspace.getConfiguration("sagellm");
    const maxTokens = cfg.get("chat.maxTokens", 2048);
    const temperature = cfg.get("chat.temperature", 0.7);
    const useContext = cfg.get("chat.workspaceContext", true);
    this.panel.webview.postMessage({ type: "userMessage", text: userText });
    this.abortController = new AbortController();
    try {
      await runAgenticChat(
        userText,
        this.history,
        model,
        (msg) => this.panel.webview.postMessage(msg),
        this.abortController.signal,
        { maxTokens, temperature, useContext }
      );
    } finally {
      this.abortController = null;
    }
  }
  getHtml() {
    const nonce = getNonce();
    return (
      /* html */
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';" />
  <title>SageLLM Chat</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background, var(--vscode-editor-background));
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    /* -- header -- */
    #header {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      gap: 8px;
      background: var(--vscode-titleBar-activeBackground);
      border-bottom: 1px solid var(--vscode-panel-border);
      flex-shrink: 0;
    }
    #header h1 { font-size: 13px; font-weight: 600; flex: 1; }
    #model-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 10px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 180px;
    }
    #status-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--vscode-charts-red);
      flex-shrink: 0;
    }
    #status-dot.connected { background: var(--vscode-charts-green); }
    .icon-btn {
      background: none; border: none; cursor: pointer;
      color: var(--vscode-foreground); padding: 4px; border-radius: 3px;
      font-size: 14px; line-height: 1; opacity: 0.7;
    }
    .icon-btn:hover { opacity: 1; background: var(--vscode-toolbar-hoverBackground); }

    /* -- messages -- */
    #messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .msg { display: flex; flex-direction: column; gap: 4px; max-width: 100%; }
    .msg-role {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.6;
    }
    .msg-body {
      padding: 8px 12px;
      border-radius: 8px;
      line-height: 1.5;
      word-break: break-word;
      white-space: pre-wrap;
    }
    .user .msg-body {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      align-self: flex-end;
      border-radius: 8px 8px 2px 8px;
      max-width: 85%;
    }
    .user .msg-role { align-self: flex-end; }
    .assistant .msg-body {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px 8px 8px 2px;
    }
    .error-msg .msg-body {
      background: var(--vscode-inputValidation-errorBackground);
      border: 1px solid var(--vscode-inputValidation-errorBorder);
      color: var(--vscode-inputValidation-errorForeground);
    }
    .typing-indicator span {
      display: inline-block; width: 6px; height: 6px; border-radius: 50%;
      background: var(--vscode-foreground); opacity: 0.4;
      animation: bounce 1.2s infinite ease-in-out;
    }
    .typing-indicator span:nth-child(1) { animation-delay: 0s; }
    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; }
      40% { transform: scale(1.2); opacity: 1; }
    }
    #welcome {
      text-align: center; margin: auto;
      color: var(--vscode-descriptionForeground);
    }
    #welcome .big { font-size: 32px; margin-bottom: 8px; }
    #welcome h2 { font-size: 16px; margin-bottom: 4px; }
    #welcome p { font-size: 12px; opacity: 0.7; }

    /* -- input -- */
    #input-area {
      padding: 10px 12px;
      border-top: 1px solid var(--vscode-panel-border);
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex-shrink: 0;
    }
    #input-row { display: flex; gap: 6px; align-items: flex-end; }
    #user-input {
      flex: 1;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 6px;
      padding: 6px 10px;
      font-family: inherit;
      font-size: inherit;
      resize: none;
      min-height: 38px;
      max-height: 150px;
      outline: none;
      line-height: 1.5;
    }
    #user-input:focus { border-color: var(--vscode-focusBorder); }
    #send-btn, #abort-btn {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none; border-radius: 6px;
      padding: 7px 14px; cursor: pointer;
      font-size: 13px; white-space: nowrap;
      height: 38px;
    }
    #send-btn:hover { background: var(--vscode-button-hoverBackground); }
    #abort-btn { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); display: none; }
    #abort-btn.visible { display: block; }
    #abort-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
    #hint { font-size: 10px; color: var(--vscode-descriptionForeground); padding: 0 2px; }
    .not-connected-banner {
      background: var(--vscode-inputValidation-warningBackground);
      border: 1px solid var(--vscode-inputValidation-warningBorder);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 12px;
      display: none;
    }
    .not-connected-banner.visible { display: block; }
    .not-connected-banner a { color: var(--vscode-textLink-foreground); cursor: pointer; }
    .tool-call-msg {
      display: flex; align-items: center; gap: 6px; font-size: 11px;
      color: var(--vscode-descriptionForeground); padding: 4px 8px;
      border-left: 2px solid var(--vscode-charts-blue);
      background: var(--vscode-editor-background);
      border-radius: 0 4px 4px 0;
      animation: fadeInTool 0.2s ease;
    }
    @keyframes fadeInTool { from { opacity:0; transform:translateX(-4px); } to { opacity:1; transform:none; } }
    .tool-note-msg { font-size:11px; color:var(--vscode-descriptionForeground); padding:2px 8px; opacity:0.7; }

    /* code blocks inside assistant messages */
    .msg-body code {
      background: var(--vscode-textCodeBlock-background);
      padding: 1px 4px;
      border-radius: 3px;
      font-family: var(--vscode-editor-font-family);
      font-size: 0.9em;
    }
    .msg-body pre {
      background: var(--vscode-textCodeBlock-background);
      padding: 8px 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 6px 0;
    }
    .msg-body pre code { background: none; padding: 0; }
  </style>
</head>
<body>
  <div id="header">
    <div id="status-dot" title="Gateway connection status"></div>
    <h1>SageLLM</h1>
    <div id="model-badge" title="Click to switch model">No model</div>
    <button class="icon-btn" id="clear-btn" title="Clear conversation">\u{1F5D1}</button>
    <button class="icon-btn" id="restart-btn" title="Restart gateway (uses saved settings)">\u{1F504}</button>
    <button class="icon-btn" id="check-btn" title="Check connection">\u26A1</button>
  </div>

  <div id="messages">
    <div id="welcome">
      <div class="big">\u{1F916}</div>
      <h2>SageLLM Chat</h2>
      <p>Ask anything \u2014 code, debugging, explanations.</p>
    </div>
  </div>

  <div id="input-area">
    <div class="not-connected-banner" id="not-connected">
      \u26A0\uFE0F sagellm-gateway not reachable.
      <a id="start-gateway-link">Start gateway</a> \xB7
      <a id="install-link">Installation guide</a> \xB7
      <a id="retry-link">Retry</a>
    </div>
    <div id="input-row">
      <textarea
        id="user-input"
        placeholder="Ask SageLLM anything\u2026 (Enter to send, Shift+Enter for newline)"
        rows="1"
        autofocus
      ></textarea>
      <button id="send-btn">Send</button>
      <button id="abort-btn">Stop</button>
    </div>
    <div id="hint">Enter \u21B5 to send \xB7 Shift+Enter for newline \xB7 /clear to reset \xB7 @file:path for context</div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const messagesEl = document.getElementById('messages');
    const inputEl = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const abortBtn = document.getElementById('abort-btn');
    const clearBtn = document.getElementById('clear-btn');
    const checkBtn = document.getElementById('check-btn');
    const restartBtn = document.getElementById('restart-btn');
    const modelBadge = document.getElementById('model-badge');
    const statusDot = document.getElementById('status-dot');
    const notConnected = document.getElementById('not-connected');
    const welcomeEl = document.getElementById('welcome');

    let isStreaming = false;
    let currentAssistantEl = null;

    function setStreaming(val) {
      isStreaming = val;
      sendBtn.style.display = val ? 'none' : '';
      abortBtn.classList.toggle('visible', val);
      inputEl.disabled = val;
    }

    function updateConnectionStatus(connected) {
      statusDot.classList.toggle('connected', connected);
      notConnected.classList.toggle('visible', !connected);
    }

    function updateModel(model) {
      modelBadge.textContent = model || 'No model';
    }

    function hideWelcome() {
      if (welcomeEl) welcomeEl.remove();
    }

    function appendMessage(role, text) {
      hideWelcome();
      const div = document.createElement('div');
      div.className = 'msg ' + role;

      const roleEl = document.createElement('div');
      roleEl.className = 'msg-role';
      roleEl.textContent = role === 'user' ? 'You' : role === 'assistant' ? 'SageLLM' : 'Error';
      const body = document.createElement('div');
      body.className = 'msg-body';

      if (role === 'assistant') {
        body.innerHTML = renderMarkdown(text);
      } else {
        body.textContent = text;
      }

      div.appendChild(roleEl);
      div.appendChild(body);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return body;
    }

    function appendTypingIndicator() {
      hideWelcome();
      const div = document.createElement('div');
      div.className = 'msg assistant';
      div.id = 'typing-msg';

      const roleEl = document.createElement('div');
      roleEl.className = 'msg-role';
      roleEl.textContent = 'SageLLM';

      const body = document.createElement('div');
      body.className = 'msg-body typing-indicator';
      body.innerHTML = '<span></span><span></span><span></span>';

      div.appendChild(roleEl);
      div.appendChild(body);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return div;
    }

    // Minimal markdown renderer
    function renderMarkdown(text) {
      // avoid backtick literals inside template literal \u2014 build regex at runtime
      const BT = String.fromCharCode(96);
      const re3 = new RegExp(BT+BT+BT+'([\\s\\S]*?)'+BT+BT+BT, 'g');
      const re1 = new RegExp(BT+'([^'+BT+']+)'+BT, 'g');
      return text
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(re3, '<pre><code>$1</code></pre>')
        .replace(re1, '<code>$1</code>')
        .replace(/[*][*](.*?)[*][*]/g, '<strong>$1</strong>')
        .replace(/[*](.*?)[*]/g, '<em>$1</em>');
    }

    function sendMessage() {
      const text = inputEl.value.trim();
      if (!text || isStreaming) return;
      if (text === '/clear') {
        inputEl.value = '';
        vscode.postMessage({ type: 'clear' });
        return;
      }
      inputEl.value = '';
      autoResize();
      vscode.postMessage({ type: 'send', text });
    }

    function autoResize() {
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 150) + 'px';
    }

    inputEl.addEventListener('input', autoResize);
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    sendBtn.addEventListener('click', sendMessage);
    abortBtn.addEventListener('click', () => vscode.postMessage({ type: 'abort' }));
    clearBtn.addEventListener('click', () => vscode.postMessage({ type: 'clear' }));
    checkBtn.addEventListener('click', () => vscode.postMessage({ type: 'checkConnection' }));
    modelBadge.addEventListener('click', () => vscode.postMessage({ type: 'selectModel' }));
    document.getElementById('retry-link').addEventListener('click', () => vscode.postMessage({ type: 'checkConnection' }));
    document.getElementById('install-link').addEventListener('click', () => vscode.postMessage({ type: 'showInstallGuide' }));
    restartBtn.addEventListener('click', () => vscode.postMessage({ type: 'restartGateway' }));
    document.getElementById('start-gateway-link').addEventListener('click', () => vscode.postMessage({ type: 'restartGateway' }));

    window.addEventListener('message', (event) => {
      const msg = event.data;
      switch (msg.type) {
        case 'init':
          updateConnectionStatus(msg.gatewayConnected);
          updateModel(msg.model);
          break;

        case 'userMessage':
          setStreaming(true);
          appendMessage('user', msg.text);
          break;

        case 'assistantStart': {
          const typingDiv = appendTypingIndicator();
          const body = typingDiv.querySelector('.msg-body');
          body.className = 'msg-body';
          body.textContent = '';
          currentAssistantEl = body;
          typingDiv.id = '';
          break;
        }
        case 'assistantDelta':
          if (currentAssistantEl) {
            currentAssistantEl.innerHTML = renderMarkdown(
              (currentAssistantEl._raw || '') + msg.text
            );
            currentAssistantEl._raw = (currentAssistantEl._raw || '') + msg.text;
            messagesEl.scrollTop = messagesEl.scrollHeight;
          }
          break;

        case 'assistantEnd':
          setStreaming(false);
          currentAssistantEl = null;
          break;

        case 'cleared':
          messagesEl.innerHTML = '';
          setStreaming(false);
          currentAssistantEl = null;
          const w = document.createElement('div');
          w.id = 'welcome'; w.classList.add('');
          w.innerHTML = '<div class="big">\u{1F916}</div><h2>SageLLM Chat</h2><p>Ask anything</p>';
          messagesEl.appendChild(w);
          break;

        case 'error':
          setStreaming(false);
          currentAssistantEl = null;
          appendMessage('error', '\u26A0\uFE0F ' + msg.text);
          break;

        case 'toolCall': {
          const toolDiv = document.createElement('div');
          toolDiv.className = 'tool-call-msg';
          let argsStr = '';
          try { const a = JSON.parse(msg.args || '{}'); argsStr = Object.values(a).slice(0, 2).join(', '); } catch {}
          toolDiv.textContent = '\u{1F527} ' + msg.tool + (argsStr ? '(' + argsStr + ')' : '');
          messagesEl.appendChild(toolDiv);
          messagesEl.scrollTop = messagesEl.scrollHeight;
          break;
        }
        case 'toolNote': {
          const noteDiv = document.createElement('div');
          noteDiv.className = 'tool-note-msg';
          noteDiv.textContent = msg.text;
          messagesEl.appendChild(noteDiv);
          messagesEl.scrollTop = messagesEl.scrollHeight;
          break;
        }

        case 'connectionStatus':
          updateConnectionStatus(msg.connected);
          updateModel(msg.model);
          break;

        case 'modelChanged':
          updateModel(msg.model);
          break;

        case 'insertText':
          inputEl.value += (inputEl.value ? '
' : '') + msg.text;
          autoResize();
          inputEl.focus();
          break;

        case 'sendImmediate':
          inputEl.value = msg.text;
          autoResize();
          sendMessage();
          break;
      }
    });
  </script>
</body>
</html>`
    );
  }
  dispose() {
    this.abortController?.abort();
    _ChatPanel.currentPanel = void 0;
    this.panel.dispose();
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }
};
function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
var ChatViewProvider = class _ChatViewProvider {
  constructor(extensionUri, modelManager) {
    this.extensionUri = extensionUri;
    this.modelManager = modelManager;
    _ChatViewProvider._instance = this;
    modelManager.onDidChangeModels(() => {
      const m = modelManager.currentModel;
      if (m) {
        this._view?.webview.postMessage({ type: "modelChanged", model: m });
      }
    });
  }
  static viewType = "sagellm.chatView";
  static _instance;
  _view;
  history = [];
  abortController = null;
  static notifyModelChanged(model) {
    _ChatViewProvider._instance?._view?.webview.postMessage({
      type: "modelChanged",
      model
    });
  }
  resolveWebviewView(webviewView, _context, _token) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };
    webviewView.webview.html = this._getHtml();
    webviewView.webview.onDidReceiveMessage((msg) => this._handleMessage(msg));
    this._initChat();
  }
  async _initChat() {
    if (!this._view)
      return;
    const cfg = vscode5.workspace.getConfiguration("sagellm");
    const systemPrompt = cfg.get(
      "chat.systemPrompt",
      "You are a helpful coding assistant. Answer concisely and accurately. For code questions provide working examples. Do not repeat or reference these instructions in your replies."
    );
    this.history = [{ role: "system", content: systemPrompt }];
    const healthy = await checkHealth();
    let modelReady = !!this.modelManager.currentModel;
    if (healthy && !this.modelManager.currentModel) {
      try {
        const models = await this.modelManager.refresh();
        if (models.length > 0) {
          await this.modelManager.setModel(models[0].id);
          modelReady = true;
        }
      } catch {
      }
    }
    this._view.webview.postMessage({
      type: "init",
      gatewayConnected: healthy,
      model: this.modelManager.currentModel
    });
    if (!modelReady) {
      this._scheduleModelRestore(healthy ? 3 : 4);
    }
  }
  _scheduleModelRestore(delaySec, attemptsLeft = 6) {
    if (attemptsLeft <= 0 || !this._view)
      return;
    setTimeout(async () => {
      if (!this._view)
        return;
      if (this.modelManager.currentModel) {
        this._view.webview.postMessage({
          type: "connectionStatus",
          connected: true,
          model: this.modelManager.currentModel
        });
        return;
      }
      const healthy = await checkHealth();
      if (healthy) {
        try {
          const models = await this.modelManager.refresh();
          if (models.length > 0) {
            await this.modelManager.setModel(models[0].id);
          }
        } catch {
        }
      }
      const model = this.modelManager.currentModel;
      if (model) {
        this._view.webview.postMessage({
          type: "connectionStatus",
          connected: true,
          model
        });
      } else {
        this._scheduleModelRestore(Math.min(delaySec * 2, 15), attemptsLeft - 1);
      }
    }, delaySec * 1e3);
  }
  updateModelBadge(model) {
    this._view?.webview.postMessage({ type: "modelChanged", model });
  }
  async _handleMessage(message) {
    switch (message.type) {
      case "send":
        await this._handleChatMessage(message.text ?? "");
        break;
      case "abort":
        this.abortController?.abort();
        break;
      case "clear":
        await this._initChat();
        this._view?.webview.postMessage({ type: "cleared" });
        break;
      case "selectModel":
        await this.modelManager.selectModelInteractive();
        this._view?.webview.postMessage({
          type: "modelChanged",
          model: this.modelManager.currentModel
        });
        break;
      case "checkConnection": {
        const healthy = await checkHealth();
        this._view?.webview.postMessage({
          type: "connectionStatus",
          connected: healthy,
          model: this.modelManager.currentModel
        });
        break;
      }
      case "showInstallGuide":
        vscode5.commands.executeCommand("sagellm.showInstallGuide");
        break;
      case "restartGateway":
        vscode5.commands.executeCommand("sagellm.restartGateway");
        break;
    }
  }
  async _handleChatMessage(userText) {
    if (!userText.trim() || !this._view)
      return;
    let model = this.modelManager.currentModel;
    if (!model) {
      model = await this.modelManager.selectModelInteractive() ?? "";
      if (!model) {
        this._view.webview.postMessage({
          type: "error",
          text: "No model selected. Please select a model first."
        });
        return;
      }
    }
    const cfg = vscode5.workspace.getConfiguration("sagellm");
    const maxTokens = cfg.get("chat.maxTokens", 2048);
    const temperature = cfg.get("chat.temperature", 0.7);
    const useContext = cfg.get("chat.workspaceContext", true);
    this._view.webview.postMessage({ type: "userMessage", text: userText });
    this.abortController = new AbortController();
    try {
      await runAgenticChat(
        userText,
        this.history,
        model,
        (msg) => this._view?.webview.postMessage(msg),
        this.abortController.signal,
        { maxTokens, temperature, useContext }
      );
    } finally {
      this.abortController = null;
    }
  }
  _getHtml() {
    const nonce = getNonce();
    return (
      /* html */
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';" />
  <title>SageLLM Chat</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background, var(--vscode-editor-background));
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    #header {
      display: flex; align-items: center; padding: 6px 10px; gap: 6px;
      background: var(--vscode-sideBarSectionHeader-background);
      border-bottom: 1px solid var(--vscode-panel-border); flex-shrink: 0;
    }
    #header h1 { font-size: 12px; font-weight: 600; flex: 1; }
    #model-badge {
      font-size: 10px; padding: 2px 6px; border-radius: 10px;
      background: var(--vscode-badge-background); color: var(--vscode-badge-foreground);
      cursor: pointer; user-select: none; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; max-width: 140px;
    }
    #status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--vscode-charts-red); flex-shrink: 0; }
    #status-dot.connected { background: var(--vscode-charts-green); }
    .icon-btn { background: none; border: none; cursor: pointer; color: var(--vscode-foreground); padding: 3px; border-radius: 3px; font-size: 13px; line-height: 1; opacity: 0.7; }
    .icon-btn:hover { opacity: 1; background: var(--vscode-toolbar-hoverBackground); }
    #messages { flex: 1; overflow-y: auto; padding: 8px 12px; display: flex; flex-direction: column; gap: 10px; }
    .msg { display: flex; flex-direction: column; gap: 3px; max-width: 100%; }
    .msg-role { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.6; }
    .msg-body { padding: 6px 10px; border-radius: 8px; line-height: 1.5; word-break: break-word; white-space: pre-wrap; }
    .user .msg-body { background: var(--vscode-button-background); color: var(--vscode-button-foreground); align-self: flex-end; border-radius: 8px 8px 2px 8px; max-width: 88%; }
    .user .msg-role { align-self: flex-end; }
    .assistant .msg-body { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 8px 8px 8px 2px; }
    .error-msg .msg-body { background: var(--vscode-inputValidation-errorBackground); border: 1px solid var(--vscode-inputValidation-errorBorder); color: var(--vscode-inputValidation-errorForeground); }
    .typing-indicator span { display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: var(--vscode-foreground); opacity: 0.4; animation: bounce 1.2s infinite ease-in-out; }
    .typing-indicator span:nth-child(1) { animation-delay: 0s; }
    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%,80%,100%{transform:scale(0.8);opacity:0.4}40%{transform:scale(1.2);opacity:1} }
    #welcome { text-align: center; margin: auto; color: var(--vscode-descriptionForeground); }
    #welcome .big { font-size: 28px; margin-bottom: 6px; }
    #welcome h2 { font-size: 14px; margin-bottom: 3px; }
    #welcome p { font-size: 11px; opacity: 0.7; }
    #input-area { padding: 8px 10px; border-top: 1px solid var(--vscode-panel-border); display: flex; flex-direction: column; gap: 5px; flex-shrink: 0; }
    #input-row { display: flex; gap: 5px; align-items: flex-end; }
    #user-input { flex: 1; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent); border-radius: 6px; padding: 5px 8px; font-family: inherit; font-size: inherit; resize: none; min-height: 34px; max-height: 120px; outline: none; line-height: 1.5; }
    #user-input:focus { border-color: var(--vscode-focusBorder); }
    #send-btn, #abort-btn { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 12px; white-space: nowrap; height: 34px; }
    #send-btn:hover { background: var(--vscode-button-hoverBackground); }
    #abort-btn { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); display: none; }
    #abort-btn.visible { display: block; }
    #hint { font-size: 10px; color: var(--vscode-descriptionForeground); padding: 0 2px; }
    .not-connected-banner { background: var(--vscode-inputValidation-warningBackground); border: 1px solid var(--vscode-inputValidation-warningBorder); border-radius: 6px; padding: 5px 8px; font-size: 11px; display: none; }
    .not-connected-banner.visible { display: block; }
    .not-connected-banner a { color: var(--vscode-textLink-foreground); cursor: pointer; }
    .tool-call-msg { display:flex; align-items:center; gap:6px; font-size:11px; color:var(--vscode-descriptionForeground); padding:4px 8px; border-left:2px solid var(--vscode-charts-blue); background:var(--vscode-editor-background); border-radius:0 4px 4px 0; animation:fadeInTool 0.2s ease; }
    @keyframes fadeInTool { from { opacity:0; transform:translateX(-4px); } to { opacity:1; transform:none; } }
    .tool-note-msg { font-size:11px; color:var(--vscode-descriptionForeground); padding:2px 8px; opacity:0.7; }
    .msg-body code { background: var(--vscode-textCodeBlock-background); padding: 1px 4px; border-radius: 3px; font-family: var(--vscode-editor-font-family); font-size: 0.9em; }
    .msg-body pre { background: var(--vscode-textCodeBlock-background); padding: 6px 10px; border-radius: 6px; overflow-x: auto; margin: 4px 0; }
    .msg-body pre code { background: none; padding: 0; }
  </style>
</head>
<body>
  <div id="header">
    <div id="status-dot" title="Gateway connection status"></div>
    <h1>SageLLM</h1>
    <div id="model-badge" title="Click to switch model">No model</div>
    <button class="icon-btn" id="clear-btn" title="Clear conversation">\u{1F5D1}</button>
    <button class="icon-btn" id="restart-btn" title="Restart gateway (uses saved settings)">\u{1F504}</button>
    <button class="icon-btn" id="check-btn" title="Check connection">\u26A1</button>
  </div>
  <div id="messages">
    <div id="welcome">
      <div class="big">\u{1F916}</div>
      <h2>SageLLM Chat</h2>
      <p>Ask anything \u2014 code, debugging, explanations.</p>
    </div>
  </div>
  <div id="input-area">
    <div class="not-connected-banner" id="not-connected">
      \u26A0\uFE0F sagellm-gateway not reachable.
      <a id="start-gateway-link">Start gateway</a> \xB7
      <a id="install-link">Installation guide</a> \xB7
      <a id="retry-link">Retry</a>
    </div>
    <div id="input-row">
      <textarea id="user-input" placeholder="Ask SageLLM anything\u2026 (Enter to send)" rows="1" autofocus></textarea>
      <button id="send-btn">Send</button>
      <button id="abort-btn">Stop</button>
    </div>
    <div id="hint">Enter \u21B5 to send \xB7 Shift+Enter for newline \xB7 @file:path for context</div>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const messagesEl = document.getElementById('messages');
    const inputEl = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const abortBtn = document.getElementById('abort-btn');
    const clearBtn = document.getElementById('clear-btn');
    const checkBtn = document.getElementById('check-btn');
    const restartBtn = document.getElementById('restart-btn');
    const modelBadge = document.getElementById('model-badge');
    const statusDot = document.getElementById('status-dot');
    const notConnected = document.getElementById('not-connected');
    const welcomeEl = document.getElementById('welcome');
    let isStreaming = false;
    let currentAssistantEl = null;
    function setStreaming(val) { isStreaming = val; sendBtn.style.display = val ? 'none' : ''; abortBtn.classList.toggle('visible', val); inputEl.disabled = val; }
    function updateConnectionStatus(connected) { statusDot.classList.toggle('connected', connected); notConnected.classList.toggle('visible', !connected); }
    function updateModel(model) { modelBadge.textContent = model || 'No model'; }
    function hideWelcome() { if (welcomeEl) welcomeEl.remove(); }
    function appendMessage(role, text) {
      hideWelcome();
      const div = document.createElement('div'); div.className = 'msg ' + role;
      const roleEl = document.createElement('div'); roleEl.className = 'msg-role'; roleEl.textContent = role === 'user' ? 'You' : role === 'assistant' ? 'SageLLM' : 'Error';
      const body = document.createElement('div'); body.className = 'msg-body';
      if (role === 'assistant') { body.innerHTML = renderMarkdown(text); } else { body.textContent = text; }
      div.appendChild(roleEl); div.appendChild(body); messagesEl.appendChild(div); messagesEl.scrollTop = messagesEl.scrollHeight; return body;
    }
    function appendTypingIndicator() {
      hideWelcome();
      const div = document.createElement('div'); div.className = 'msg assistant'; div.id = 'typing-msg';
      const roleEl = document.createElement('div'); roleEl.className = 'msg-role'; roleEl.textContent = 'SageLLM';
      const body = document.createElement('div'); body.className = 'msg-body typing-indicator'; body.innerHTML = '<span></span><span></span><span></span>';
      div.appendChild(roleEl); div.appendChild(body); messagesEl.appendChild(div); messagesEl.scrollTop = messagesEl.scrollHeight; return div;
    }
    function renderMarkdown(text) {
      const BT = String.fromCharCode(96);
      const re3 = new RegExp(BT+BT+BT+'([\\s\\S]*?)'+BT+BT+BT, 'g');
      const re1 = new RegExp(BT+'([^'+BT+']+)'+BT, 'g');
      return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(re3,'<pre><code>$1</code></pre>').replace(re1,'<code>$1</code>').replace(/[*][*](.*?)[*][*]/g,'<strong>$1</strong>').replace(/[*](.*?)[*]/g,'<em>$1</em>');
    }
    function sendMessage() {
      const text = inputEl.value.trim(); if (!text || isStreaming) return;
      if (text === '/clear') { inputEl.value = ''; autoResize(); vscode.postMessage({ type: 'clear' }); return; }
      inputEl.value = ''; autoResize(); vscode.postMessage({ type: 'send', text });
    }
    function autoResize() { inputEl.style.height = 'auto'; inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px'; }
    inputEl.addEventListener('input', autoResize);
    inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    sendBtn.addEventListener('click', sendMessage);
    abortBtn.addEventListener('click', () => vscode.postMessage({ type: 'abort' }));
    clearBtn.addEventListener('click', () => vscode.postMessage({ type: 'clear' }));
    checkBtn.addEventListener('click', () => vscode.postMessage({ type: 'checkConnection' }));
    modelBadge.addEventListener('click', () => vscode.postMessage({ type: 'selectModel' }));
    document.getElementById('retry-link').addEventListener('click', () => vscode.postMessage({ type: 'checkConnection' }));
    document.getElementById('install-link').addEventListener('click', () => vscode.postMessage({ type: 'showInstallGuide' }));
    restartBtn.addEventListener('click', () => vscode.postMessage({ type: 'restartGateway' }));
    document.getElementById('start-gateway-link').addEventListener('click', () => vscode.postMessage({ type: 'restartGateway' }));
    window.addEventListener('message', (event) => {
      const msg = event.data;
      switch (msg.type) {
        case 'init': updateConnectionStatus(msg.gatewayConnected); updateModel(msg.model); break;
        case 'userMessage': setStreaming(true); appendMessage('user', msg.text); break;
        case 'assistantStart': { const td = appendTypingIndicator(); const b = td.querySelector('.msg-body'); b.className = 'msg-body'; b.textContent = ''; currentAssistantEl = b; td.id = ''; break; }
        case 'assistantDelta': if (currentAssistantEl) { currentAssistantEl.innerHTML = renderMarkdown((currentAssistantEl._raw || '') + msg.text); currentAssistantEl._raw = (currentAssistantEl._raw || '') + msg.text; messagesEl.scrollTop = messagesEl.scrollHeight; } break;
        case 'assistantEnd': setStreaming(false); currentAssistantEl = null; break;
        case 'cleared': messagesEl.innerHTML = ''; setStreaming(false); currentAssistantEl = null; const w = document.createElement('div'); w.id = 'welcome'; w.innerHTML = '<div class="big">\u{1F916}</div><h2>SageLLM Chat</h2><p>Ask anything</p>'; messagesEl.appendChild(w); break;
        case 'error': setStreaming(false); currentAssistantEl = null; appendMessage('error', '\u26A0\uFE0F ' + msg.text); break;
        case 'toolCall': { const td = document.createElement('div'); td.className = 'tool-call-msg'; let as = ''; try { const a = JSON.parse(msg.args||'{}'); as = Object.values(a).slice(0,2).join(', '); } catch {} td.textContent = '\u{1F527} ' + msg.tool + (as ? '(' + as + ')' : ''); messagesEl.appendChild(td); messagesEl.scrollTop = messagesEl.scrollHeight; break; }
        case 'toolNote': { const nd = document.createElement('div'); nd.className = 'tool-note-msg'; nd.textContent = msg.text; messagesEl.appendChild(nd); messagesEl.scrollTop = messagesEl.scrollHeight; break; }
        case 'connectionStatus': updateConnectionStatus(msg.connected); updateModel(msg.model); break;
        case 'modelChanged': updateModel(msg.model); break;
      }
    });
  </script>
</body>
</html>`
    );
  }
};

// src/inlineCompletion.ts
var vscode6 = __toESM(require("vscode"));
function getFimTokens(modelId) {
  const m = modelId.toLowerCase();
  if (m.includes("qwen")) {
    return {
      prefix: "<|fim_prefix|>",
      suffix: "<|fim_suffix|>",
      middle: "<|fim_middle|>",
      stopSequences: ["<|endoftext|>", "<|fim_pad|>", "<|fim_suffix|>", "<|im_end|>"]
    };
  }
  if (m.includes("deepseek")) {
    return {
      prefix: "<\uFF5Cfim\u2581begin\uFF5C>",
      suffix: "<\uFF5Cfim\u2581hole\uFF5C>",
      middle: "<\uFF5Cfim\u2581end\uFF5C>",
      stopSequences: ["<\uFF5Cfim\u2581begin\uFF5C>", "<\uFF5Cfim\u2581hole\uFF5C>", "<\uFF5Cfim\u2581end\uFF5C>", "<|eos_token|>"]
    };
  }
  if (m.includes("codellama") || m.includes("mistral")) {
    return {
      prefix: "<PRE>",
      suffix: "<SUF>",
      middle: "<MID>",
      stopSequences: ["<EOT>"]
    };
  }
  if (m.includes("starcoder") || m.includes("starchat")) {
    return {
      prefix: "<fim_prefix>",
      suffix: "<fim_suffix>",
      middle: "<fim_middle>",
      stopSequences: ["<|endoftext|>", "<fim_prefix>"]
    };
  }
  return {
    prefix: "<|fim_prefix|>",
    suffix: "<|fim_suffix|>",
    middle: "<|fim_middle|>",
    stopSequences: ["<|endoftext|>"]
  };
}
function getTabContext(currentUri, maxChars) {
  if (maxChars <= 0)
    return "";
  const openDocs = vscode6.workspace.textDocuments.filter(
    (doc) => doc.uri.toString() !== currentUri.toString() && !doc.isUntitled && doc.uri.scheme === "file" && doc.getText().length > 10
  ).slice(0, 4);
  if (openDocs.length === 0)
    return "";
  const snippets = [];
  let remaining = maxChars;
  for (const doc of openDocs) {
    if (remaining <= 0)
      break;
    const rel = vscode6.workspace.asRelativePath(doc.uri);
    const text = doc.getText().slice(0, Math.min(remaining, 1200));
    const snippet = `// [${rel}]
${text}`;
    snippets.push(snippet);
    remaining -= snippet.length;
  }
  return `// \u2500\u2500\u2500 Related open files \u2500\u2500\u2500
${snippets.join("\n\n")}
// \u2500\u2500\u2500 Current file \u2500\u2500\u2500
`;
}
function shouldSkip(document, position) {
  const lineText = document.lineAt(position.line).text;
  const beforeCursor = lineText.slice(0, position.character);
  const trimmed = beforeCursor.trimStart();
  if (trimmed.length < 3)
    return true;
  const charAfter = lineText[position.character];
  if (charAfter !== void 0 && /[\w]/.test(charAfter))
    return true;
  if (/^\s*(\/\/|#|--|\/\*)/.test(lineText))
    return true;
  const singleQuotes = (beforeCursor.match(/(?<!\\)'/g) ?? []).length;
  const doubleQuotes = (beforeCursor.match(/(?<!\\)"/g) ?? []).length;
  if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0)
    return true;
  return false;
}
function cleanCompletion(raw, fim) {
  let text = raw;
  for (const stop of fim.stopSequences) {
    const idx = text.indexOf(stop);
    if (idx !== -1)
      text = text.slice(0, idx);
  }
  for (const token of [fim.prefix, fim.suffix, fim.middle]) {
    const idx = text.indexOf(token);
    if (idx !== -1)
      text = text.slice(0, idx);
  }
  const lines = text.split("\n");
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }
  return lines.join("\n");
}
var SageLLMInlineCompletionProvider = class {
  constructor(modelManager) {
    this.modelManager = modelManager;
  }
  debounceTimer = null;
  /** null = untested, true = available, false = not available */
  nativeCompletionsAvailable = null;
  async provideInlineCompletionItems(document, position, _context, token) {
    const cfg = vscode6.workspace.getConfiguration("sagellm");
    if (!cfg.get("inlineCompletion.enabled", true))
      return null;
    const model = this.modelManager.currentModel;
    if (!model)
      return null;
    if (shouldSkip(document, position))
      return null;
    const docText = document.getText();
    const offset = document.offsetAt(position);
    const contextLines = cfg.get("inlineCompletion.contextLines", 80);
    const prefixLineStart = Math.max(0, position.line - contextLines);
    const prefixOffset = document.offsetAt(new vscode6.Position(prefixLineStart, 0));
    const prefix = docText.slice(prefixOffset, offset);
    const suffix = docText.slice(offset, Math.min(offset + 400, docText.length));
    const tabCtxChars = cfg.get("inlineCompletion.tabContextChars", 2e3);
    const useTabCtx = cfg.get("inlineCompletion.useTabContext", true);
    const tabContext = useTabCtx ? getTabContext(document.uri, tabCtxChars) : "";
    const fullPrefix = tabContext + prefix;
    const delay = cfg.get("inlineCompletion.triggerDelay", 350);
    await new Promise((resolve) => {
      if (this.debounceTimer)
        clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(resolve, delay);
    });
    if (token.isCancellationRequested)
      return null;
    const fim = getFimTokens(model);
    const maxTokens = cfg.get("inlineCompletion.maxTokens", 150);
    const temperature = cfg.get("inlineCompletion.temperature", 0.05);
    let rawCompletion = "";
    try {
      if (this.nativeCompletionsAvailable !== false) {
        try {
          rawCompletion = await rawTextCompletion({
            model,
            prompt: `${fim.prefix}${fullPrefix}${fim.suffix}${suffix}${fim.middle}`,
            max_tokens: maxTokens,
            temperature,
            stop: [...fim.stopSequences, "\n\n\n"]
          });
          this.nativeCompletionsAvailable = true;
        } catch (err) {
          if (err instanceof GatewayConnectionError && err.statusCode === 404) {
            this.nativeCompletionsAvailable = false;
          } else {
            throw err;
          }
        }
      }
      if (this.nativeCompletionsAvailable === false) {
        rawCompletion = await chatCompletion({
          model,
          messages: [
            {
              role: "user",
              content: `Complete the following ${document.languageId} code. Output ONLY the completion text \u2014 no explanation, no markdown fences.

${fim.prefix}${fullPrefix}${fim.suffix}${suffix}${fim.middle}`
            }
          ],
          max_tokens: maxTokens,
          temperature
        });
      }
      if (token.isCancellationRequested)
        return null;
      const completion = cleanCompletion(rawCompletion, fim);
      if (!completion.trim())
        return null;
      return new vscode6.InlineCompletionList([
        new vscode6.InlineCompletionItem(
          completion,
          new vscode6.Range(position, position)
        )
      ]);
    } catch (err) {
      if (err instanceof GatewayConnectionError)
        return null;
      return null;
    }
  }
  dispose() {
    if (this.debounceTimer)
      clearTimeout(this.debounceTimer);
  }
};

// src/statusBar.ts
var vscode7 = __toESM(require("vscode"));
var StatusBarManager = class {
  statusBar;
  gatewayRunning = false;
  currentModel = "";
  constructor() {
    this.statusBar = vscode7.window.createStatusBarItem(
      vscode7.StatusBarAlignment.Right,
      100
    );
    this.statusBar.command = "sagellm.showInstallGuide";
    this.update();
    this.statusBar.show();
  }
  setGatewayStatus(running) {
    this.gatewayRunning = running;
    this.update();
  }
  setModel(model) {
    this.currentModel = model;
    this.update();
  }
  setConnecting() {
    this.statusBar.text = "$(sync~spin) SageLLM";
    this.statusBar.tooltip = "Connecting to sagellm-gateway...";
    this.statusBar.backgroundColor = void 0;
  }
  setError(message) {
    this.statusBar.text = "$(error) SageLLM";
    this.statusBar.tooltip = `SageLLM: ${message}
Click to open setup and configuration`;
    this.statusBar.backgroundColor = new vscode7.ThemeColor(
      "statusBarItem.errorBackground"
    );
  }
  update() {
    if (!this.gatewayRunning) {
      this.statusBar.text = "$(circle-slash) SageLLM";
      this.statusBar.tooltip = "sagellm-gateway not connected \u2014 click to open setup and configuration";
      this.statusBar.backgroundColor = new vscode7.ThemeColor(
        "statusBarItem.warningBackground"
      );
    } else {
      const model = this.currentModel ? ` (${this.currentModel})` : "";
      this.statusBar.text = `$(hubot) SageLLM${model}`;
      this.statusBar.tooltip = `sagellm-gateway connected${model}
Click to open setup and configuration`;
      this.statusBar.backgroundColor = void 0;
    }
  }
  dispose() {
    this.statusBar.dispose();
  }
};

// src/debugLog.ts
var vscode8 = __toESM(require("vscode"));
var debugChannel;
function getChannel() {
  if (!debugChannel) {
    debugChannel = vscode8.window.createOutputChannel("SageLLM Debug");
  }
  return debugChannel;
}
function formatData(data) {
  if (data === void 0) {
    return "";
  }
  if (typeof data === "string") {
    return data;
  }
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}
function registerDebugChannel(context) {
  context.subscriptions.push(getChannel());
}
function logDebug(scope, message, data) {
  const ts = (/* @__PURE__ */ new Date()).toISOString();
  const suffix = formatData(data);
  getChannel().appendLine(`${ts} [${scope}] ${message}${suffix ? ` :: ${suffix}` : ""}`);
}
function showDebugChannel(preserveFocus = false) {
  getChannel().show(preserveFocus);
}

// src/extension.ts
var gatewayProcess = null;
var statusBar = null;
var healthCheckInterval = null;
async function activate(context) {
  registerDebugChannel(context);
  logDebug("extension", "activate start");
  const modelManager = new ModelManager(context);
  statusBar = new StatusBarManager();
  context.subscriptions.push(statusBar);
  const chatViewProvider = new ChatViewProvider(context.extensionUri, modelManager);
  context.subscriptions.push(
    vscode9.window.registerWebviewViewProvider(
      ChatViewProvider.viewType,
      chatViewProvider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );
  const modelsProvider = new ModelsTreeProvider(modelManager);
  const treeView = vscode9.window.createTreeView("sagellm.modelsView", {
    treeDataProvider: modelsProvider,
    showCollapseAll: false
  });
  context.subscriptions.push(treeView);
  const inlineProvider = new SageLLMInlineCompletionProvider(modelManager);
  context.subscriptions.push(
    vscode9.languages.registerInlineCompletionItemProvider(
      { pattern: "**" },
      // all files
      inlineProvider
    )
  );
  context.subscriptions.push(
    vscode9.commands.registerCommand("sagellm.openChat", async () => {
      logDebug("extension", "openChat command -> reveal sidebar chat");
      await revealSidebarChat();
    }),
    vscode9.commands.registerCommand("sagellm.openDebugLogs", () => {
      logDebug("extension", "openDebugLogs command");
      showDebugChannel(false);
    }),
    vscode9.commands.registerCommand("sagellm.selectModel", async () => {
      await modelManager.selectModelInteractive();
      statusBar?.setModel(modelManager.currentModel);
      modelsProvider.refresh();
    }),
    vscode9.commands.registerCommand("sagellm.refreshModels", async () => {
      await vscode9.window.withProgress(
        { location: vscode9.ProgressLocation.Notification, title: "SageLLM: Fetching models\u2026", cancellable: false },
        async () => {
          try {
            await modelManager.refresh();
            modelsProvider.refresh();
            vscode9.window.showInformationMessage(
              `SageLLM: ${modelManager.getModels().length} model(s) loaded`
            );
          } catch (err) {
            vscode9.window.showErrorMessage(
              `SageLLM: ${err instanceof GatewayConnectionError ? err.message : String(err)}`
            );
          }
        }
      );
    }),
    vscode9.commands.registerCommand(
      "sagellm.startGateway",
      () => promptAndStartServer(context, statusBar)
    ),
    vscode9.commands.registerCommand(
      "sagellm.configureServer",
      () => promptAndStartServer(context, statusBar)
    ),
    vscode9.commands.registerCommand(
      "sagellm.stopGateway",
      () => stopGateway(statusBar)
    ),
    vscode9.commands.registerCommand("sagellm.restartGateway", async () => {
      for (const term of vscode9.window.terminals) {
        if (term.name.startsWith("SageLLM")) {
          term.dispose();
        }
      }
      const cfg2 = vscode9.workspace.getConfiguration("sagellm");
      const port = cfg2.get("gateway.port", DEFAULT_GATEWAY_PORT);
      try {
        cp2.execSync(`fuser -k ${port}/tcp 2>/dev/null; true`, { stdio: "ignore" });
      } catch {
        try {
          cp2.execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null; true`, { stdio: "ignore" });
        } catch {
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const preloadModel = cfg2.get("preloadModel", "").trim();
      const backend = cfg2.get("backend", "").trim();
      if (preloadModel && backend) {
        startGateway(statusBar);
      } else {
        promptAndStartServer(context, statusBar);
      }
    }),
    vscode9.commands.registerCommand("sagellm.showInstallGuide", () => {
      logDebug("extension", "showInstallGuide command");
      showInstallGuide(context.extensionUri);
    }),
    // ── Code action commands (right-click menu) ──────────────────────────
    vscode9.commands.registerCommand("sagellm.explainCode", () => {
      const editor = vscode9.window.activeTextEditor;
      if (!editor)
        return;
      const selection = editor.document.getText(editor.selection);
      if (!selection.trim()) {
        vscode9.window.showWarningMessage("SageLLM: Select some code first.");
        return;
      }
      const lang = editor.document.languageId;
      const rel = vscode9.workspace.asRelativePath(editor.document.uri);
      ChatPanel.invokeAction(
        context.extensionUri,
        modelManager,
        `Explain this ${lang} code from \`${rel}\`:

\`\`\`${lang}
${selection}
\`\`\``
      );
    }),
    vscode9.commands.registerCommand("sagellm.generateTests", () => {
      const editor = vscode9.window.activeTextEditor;
      if (!editor)
        return;
      const selection = editor.document.getText(editor.selection);
      if (!selection.trim()) {
        vscode9.window.showWarningMessage("SageLLM: Select a function or class first.");
        return;
      }
      const lang = editor.document.languageId;
      ChatPanel.invokeAction(
        context.extensionUri,
        modelManager,
        `Write comprehensive unit tests for this ${lang} code. Cover edge cases.

\`\`\`${lang}
${selection}
\`\`\``
      );
    }),
    vscode9.commands.registerCommand("sagellm.fixCode", () => {
      const editor = vscode9.window.activeTextEditor;
      if (!editor)
        return;
      const selection = editor.document.getText(editor.selection);
      if (!selection.trim()) {
        vscode9.window.showWarningMessage("SageLLM: Select the code to fix.");
        return;
      }
      const lang = editor.document.languageId;
      ChatPanel.invokeAction(
        context.extensionUri,
        modelManager,
        `Find bugs and fix this ${lang} code. Show the corrected version with a brief explanation of each fix.

\`\`\`${lang}
${selection}
\`\`\``
      );
    }),
    vscode9.commands.registerCommand("sagellm.generateDocstring", () => {
      const editor = vscode9.window.activeTextEditor;
      if (!editor)
        return;
      const selection = editor.document.getText(editor.selection);
      if (!selection.trim()) {
        vscode9.window.showWarningMessage("SageLLM: Select a function or class.");
        return;
      }
      const lang = editor.document.languageId;
      ChatPanel.invokeAction(
        context.extensionUri,
        modelManager,
        `Write a docstring/JSDoc comment for this ${lang} code. Follow the language's standard documentation style.

\`\`\`${lang}
${selection}
\`\`\``
      );
    }),
    vscode9.commands.registerCommand("sagellm.checkConnection", async () => {
      logDebug("extension", "checkConnection command", { currentModel: modelManager.currentModel });
      statusBar?.setConnecting();
      const healthy = await checkHealth();
      statusBar?.setGatewayStatus(healthy);
      if (healthy) {
        await modelManager.refresh().catch(() => {
        });
        modelsProvider.refresh();
        statusBar?.setModel(modelManager.currentModel);
        vscode9.window.showInformationMessage(
          "SageLLM: Gateway connected \u2713"
        );
      } else {
        const cfg2 = vscode9.workspace.getConfiguration("sagellm");
        const host = cfg2.get("gateway.host", "localhost");
        const port = cfg2.get("gateway.port", DEFAULT_GATEWAY_PORT);
        const choice = await vscode9.window.showWarningMessage(
          `SageLLM: Cannot reach gateway at ${host}:${port}`,
          "Start Gateway",
          "Installation Guide",
          "Open Settings"
        );
        if (choice === "Start Gateway") {
          vscode9.commands.executeCommand("sagellm.startGateway");
        } else if (choice === "Installation Guide") {
          vscode9.commands.executeCommand("sagellm.showInstallGuide");
        } else if (choice === "Open Settings") {
          vscode9.commands.executeCommand(
            "workbench.action.openSettings",
            "@ext:intellistream.sagellm-vscode"
          );
        }
      }
    })
  );
  const cfg = vscode9.workspace.getConfiguration("sagellm");
  if (cfg.get("autoStartGateway", true)) {
    const savedModel = cfg.get("preloadModel", "").trim();
    const savedBackend = cfg.get("backend", "").trim();
    if (savedModel && savedBackend) {
      checkHealth().then((alreadyRunning) => {
        if (!alreadyRunning) {
          startGateway(statusBar);
        }
      });
    } else {
      checkHealth().then((alreadyRunning) => {
        if (!alreadyRunning) {
          setTimeout(() => promptAndStartServer(context, statusBar), 1500);
        }
      });
    }
  }
  healthCheckInterval = setInterval(async () => {
    const healthy = await checkHealth();
    statusBar?.setGatewayStatus(healthy);
    if (healthy && modelManager.currentModel) {
      statusBar?.setModel(modelManager.currentModel);
    }
  }, 3e4);
  context.subscriptions.push({
    dispose: () => {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
    }
  });
  async function tryConnectAndRestoreModel(showWarning) {
    const healthy = await checkHealth();
    statusBar?.setGatewayStatus(healthy);
    if (healthy) {
      let modelLoaded = false;
      try {
        const models = await modelManager.refresh();
        modelsProvider.refresh();
        if (models.length > 0) {
          const toSelect = modelManager.currentModel || models[0].id;
          const valid = models.find((m) => m.id === toSelect);
          await modelManager.setModel(valid ? valid.id : models[0].id);
          modelLoaded = true;
        }
        statusBar?.setModel(modelManager.currentModel);
        if (modelManager.currentModel) {
          ChatPanel.notifyModelChanged(modelManager.currentModel);
          ChatViewProvider.notifyModelChanged(modelManager.currentModel);
        }
      } catch {
      }
      return modelLoaded;
    } else {
      if (showWarning) {
        const choice = await vscode9.window.showWarningMessage(
          "SageLLM: Gateway not reachable. Configure and start now?",
          "Configure Server",
          "Dismiss"
        );
        if (choice === "Configure Server") {
          vscode9.commands.executeCommand("sagellm.configureServer");
        }
      }
      return false;
    }
  }
  let retryAttempt = 0;
  const maxRetries = 10;
  async function scheduleRetryConnect() {
    retryAttempt++;
    if (retryAttempt > maxRetries)
      return;
    const delay = Math.min(2e3 * retryAttempt, 3e4);
    setTimeout(async () => {
      const showWarning = retryAttempt >= 3;
      const ok = await tryConnectAndRestoreModel(showWarning);
      if (!ok) {
        scheduleRetryConnect();
      }
    }, delay);
  }
  scheduleRetryConnect();
}
function deactivate() {
  stopGateway(statusBar);
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
}
function startGateway(sb) {
  const cfg = vscode9.workspace.getConfiguration("sagellm");
  const baseCmd = cfg.get("gatewayStartCommand", "sagellm serve");
  const port = cfg.get("gateway.port", DEFAULT_GATEWAY_PORT);
  const preloadModel = cfg.get("preloadModel", "").trim();
  const backend = cfg.get("backend", "").trim();
  if (gatewayProcess && !gatewayProcess.killed) {
    vscode9.window.showInformationMessage("SageLLM: Gateway is already running");
    return;
  }
  let cmd = baseCmd;
  if (backend)
    cmd += ` --backend ${backend}`;
  if (preloadModel)
    cmd += ` --model ${preloadModel}`;
  cmd += ` --port ${port}`;
  const terminal = vscode9.window.createTerminal({
    name: "SageLLM Gateway",
    isTransient: false,
    // Disable preflight canary — it loads the model twice before the engine starts,
    // causing OOM on low-memory machines and extending startup by 2–10 minutes.
    // The extension's own health-poll + startup canary (SAGELLM_STARTUP_CANARY)
    // still verifies model output quality after the engine is healthy.
    env: { SAGELLM_PREFLIGHT_CANARY: "0" }
  });
  terminal.sendText(cmd);
  terminal.show(false);
  sb?.setConnecting();
  vscode9.window.showInformationMessage(
    `SageLLM: Starting gateway with "${cmd}"\u2026`
  );
  let attempts = 0;
  const maxAttempts = 100;
  const poll = setInterval(async () => {
    attempts++;
    const healthy = await checkHealth();
    if (healthy) {
      clearInterval(poll);
      sb?.setGatewayStatus(true);
      vscode9.window.showInformationMessage("SageLLM: Gateway is ready \u2713");
    } else if (attempts >= maxAttempts) {
      clearInterval(poll);
      sb?.setError("Gateway start timed out");
      vscode9.window.showWarningMessage(
        "SageLLM: Gateway did not respond within 5 minutes. Check the terminal for errors."
      );
    } else if (attempts % 20 === 0) {
      const elapsed = Math.round(attempts * 3 / 60);
      sb?.setConnecting();
      vscode9.window.setStatusBarMessage(`SageLLM: Loading model\u2026 (${elapsed} min elapsed)`, 5e3);
    }
  }, 3e3);
}
function stopGateway(sb) {
  if (gatewayProcess && !gatewayProcess.killed) {
    gatewayProcess.kill("SIGTERM");
    gatewayProcess = null;
  }
  sb?.setGatewayStatus(false);
}
async function revealSidebarChat() {
  try {
    await vscode9.commands.executeCommand("workbench.view.extension.sagellm-sidebar");
  } catch {
  }
  try {
    await vscode9.commands.executeCommand("sagellm.chatView.focus");
  } catch {
  }
}
function showInstallGuide(_extensionUri) {
  const cfg = vscode9.workspace.getConfiguration("sagellm");
  const host = cfg.get("gateway.host", "localhost");
  const port = cfg.get("gateway.port", DEFAULT_GATEWAY_PORT);
  const model = cfg.get("model", "").trim() || cfg.get("preloadModel", "").trim() || "Auto";
  const autoStart = cfg.get("autoStartGateway", true);
  const panel = vscode9.window.createWebviewPanel(
    "sagellm.installGuide",
    "SageLLM: Setup & Configuration",
    vscode9.ViewColumn.One,
    { enableScripts: false, enableCommandUris: true }
  );
  panel.webview.html = getInstallGuideHtml({ host, port, model, autoStart });
}
function getInstallGuideHtml(config) {
  const openSettingsHref = "command:workbench.action.openSettings?%22@ext:intellistream.sagellm-vscode%22";
  const checkConnectionHref = "command:sagellm.checkConnection";
  const configureServerHref = "command:sagellm.configureServer";
  const selectModelHref = "command:sagellm.selectModel";
  const openSidebarChatHref = "command:sagellm.openChat";
  const openDebugLogsHref = "command:sagellm.openDebugLogs";
  return (
    /* html */
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SageLLM Setup and Configuration</title>
  <style>
    body {
      font-family: var(--vscode-font-family); font-size: var(--vscode-font-size);
      color: var(--vscode-foreground); background: var(--vscode-editor-background);
      max-width: 720px; margin: 0 auto; padding: 32px 24px; line-height: 1.6;
    }
    h1 { font-size: 24px; margin-bottom: 8px; }
    h2 { font-size: 16px; margin: 24px 0 8px; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 4px; }
    code, pre {
      font-family: var(--vscode-editor-font-family);
      background: var(--vscode-textCodeBlock-background);
      border-radius: 4px;
    }
    code { padding: 2px 6px; font-size: 0.9em; }
    pre { padding: 12px 16px; overflow-x: auto; margin: 8px 0; }
    pre code { background: none; padding: 0; }
    .step {
      display: flex; gap: 12px; margin-bottom: 16px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px; padding: 14px 16px;
    }
    .hero {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 16px;
      margin: 20px 0 24px;
    }
    .card {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 10px;
      padding: 16px;
      background: var(--vscode-editor-background);
    }
    .card h3 {
      margin: 0 0 10px;
      font-size: 14px;
    }
    .kv {
      display: grid;
      grid-template-columns: 110px 1fr;
      gap: 8px;
      font-size: 12px;
      margin-bottom: 8px;
    }
    .kv .label {
      color: var(--vscode-descriptionForeground);
    }
    .actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-top: 12px;
    }
    .action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 38px;
      text-decoration: none;
      border-radius: 8px;
      border: 1px solid var(--vscode-panel-border);
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      font-weight: 600;
      padding: 0 12px;
    }
    .action.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .step-num {
      width: 28px; height: 28px; border-radius: 50%;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      display: flex; align-items: center; justify-content: center;
      font-weight: bold; flex-shrink: 0; font-size: 13px;
    }
    .note {
      background: var(--vscode-inputValidation-infoBackground);
      border: 1px solid var(--vscode-inputValidation-infoBorder);
      border-radius: 6px; padding: 10px 14px; margin: 12px 0;
      font-size: 12px;
    }
    a { color: var(--vscode-textLink-foreground); }
  </style>
</head>
<body>
  <h1>\u{1F680} SageLLM Setup & Configuration</h1>
  <p>Use the sidebar Chat view for conversation. This panel is the operational surface for configuration, connection checks, model selection, and debugging.</p>

  <div class="hero">
    <div class="card">
      <h3>Current Configuration</h3>
      <div class="kv"><div class="label">Gateway</div><div><code>${config.host}:${config.port}</code></div></div>
      <div class="kv"><div class="label">Model</div><div><code>${config.model}</code></div></div>
      <div class="kv"><div class="label">Auto Start</div><div><code>${config.autoStart ? "Enabled" : "Disabled"}</code></div></div>
      <div class="actions">
        <a class="action" href="${checkConnectionHref}">Check Connection</a>
        <a class="action secondary" href="${openSettingsHref}">Open Settings</a>
        <a class="action secondary" href="${configureServerHref}">Configure & Start</a>
        <a class="action secondary" href="${selectModelHref}">Select Model</a>
      </div>
    </div>
    <div class="card">
      <h3>Quick Access</h3>
      <div class="actions">
        <a class="action" href="${openSidebarChatHref}">Open Sidebar Chat</a>
        <a class="action secondary" href="${openDebugLogsHref}">Open Debug Logs</a>
      </div>
      <div class="note" style="margin-top: 12px;">
        The standalone chat panel remains disabled on purpose. Sidebar chat is the supported conversation path while we reintroduce features incrementally.
      </div>
    </div>
  </div>

  <h2>Prerequisites</h2>
  <div class="step">
    <div class="step-num">1</div>
    <div>
      <strong>Python 3.10+</strong> and a conda/virtualenv environment.<br/>
      <code>python --version</code>
    </div>
  </div>

  <h2>Install SageLLM</h2>
  <div class="step">
    <div class="step-num">2</div>
    <div>
      Install the SageLLM meta-package from PyPI:<br/>
      <pre><code>pip install isagellm</code></pre>
      Or install from source:<br/>
      <pre><code>git clone https://github.com/intellistream/sagellm
cd sagellm
pip install -e .[dev]</code></pre>
    </div>
  </div>

  <h2>Start the Server</h2>
  <div class="step">
    <div class="step-num">3</div>
    <div>
      Start the full inference stack (gateway + engine, OpenAI-compatible API):
      <pre><code>sagellm serve</code></pre>
      With a specific model and backend:
      <pre><code>sagellm serve --backend cpu --model Qwen/Qwen2.5-1.5B-Instruct</code></pre>
      On GPU (CUDA):
      <pre><code>sagellm serve --backend cuda --model Qwen/Qwen2.5-7B-Instruct</code></pre>
      <div class="note">\u{1F4A1} Tip: Add <code>SAGELLM_PREFLIGHT_CANARY=0</code> to skip the pre-validation step for faster first startup.</div>
    </div>
  </div>

  <h2>Configure the Extension</h2>
  <div class="step">
    <div class="step-num">4</div>
    <div>
      Open VS Code Settings (<code>Ctrl+,</code>) and search for <strong>SageLLM</strong>:
      <ul style="margin: 8px 0 0 16px;">
        <li><code>sagellm.gateway.host</code> \u2014 default: <code>localhost</code></li>
        <li><code>sagellm.gateway.port</code> \u2014 default: <code>8901</code> (<code>sagellm serve</code> default)</li>
        <li><code>sagellm.gateway.apiKey</code> \u2014 if your gateway requires auth</li>
      </ul>
    </div>
  </div>

  <div class="step">
    <div class="step-num">5</div>
    <div>
      Use the <strong>SageLLM</strong> sidebar Chat view for conversation, and use the quick actions above to verify connectivity, select a model, or open extension settings.
    </div>
  </div>

  <div class="note">
    \u2139\uFE0F The extension auto-starts <code>sagellm serve</code> when you enable
    <code>sagellm.autoStartGateway</code> in settings. Model loading may take
    several minutes \u2014 the extension polls for up to 5 minutes.
  </div>

  <h2>Resources</h2>
  <ul>
    <li><a href="https://github.com/intellistream/sagellm">SageLLM GitHub</a></li>
    <li><a href="https://github.com/intellistream/sagellm-vscode/issues">Report an issue</a></li>
  </ul>
</body>
</html>`
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
