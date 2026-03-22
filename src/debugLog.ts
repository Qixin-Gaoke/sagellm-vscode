import * as vscode from "vscode";

let debugChannel: vscode.OutputChannel | undefined;

function getChannel(): vscode.OutputChannel {
  if (!debugChannel) {
    debugChannel = vscode.window.createOutputChannel("SageLLM Debug");
  }
  return debugChannel;
}

function formatData(data: unknown): string {
  if (data === undefined) {
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

export function registerDebugChannel(context: vscode.ExtensionContext): void {
  context.subscriptions.push(getChannel());
}

export function logDebug(scope: string, message: string, data?: unknown): void {
  const ts = new Date().toISOString();
  const suffix = formatData(data);
  getChannel().appendLine(`${ts} [${scope}] ${message}${suffix ? ` :: ${suffix}` : ""}`);
}

export function showDebugChannel(preserveFocus = false): void {
  getChannel().show(preserveFocus);
}