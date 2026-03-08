# Changelog

## [Unreleased]

### Fixed
- **Standalone chat panel restored**: The right-bottom or command-triggered `openChat` panel no longer reuses the sidebar webview view type. The standalone panel now uses its own panel-only `viewType`, which avoids host conflicts with the working sidebar chat view.
- **Sidebar chat is now the primary conversation surface**: `SageLLM: Open Chat` now reveals the working sidebar chat instead of opening the fragile standalone panel, and the status-bar click opens the setup/configuration panel instead of the broken standalone chat window.
- **Setup panel is now actionable**: The status-bar panel is no longer a README-style page. It now shows current gateway/model settings and exposes direct actions for checking connection, opening settings, configuring the server, selecting a model, opening sidebar chat, and viewing debug logs.
- **Chat bootstrap flow hardened**: Sidebar and standalone chat now share a single TypeScript controller and a single HTML/script builder, and model-restore retries are cancelable and generation-scoped so later UI changes are less likely to break initialization.

### Added
- **Debug output channel restored**: `SageLLM Debug` and `SageLLM: Open Debug Logs` are available again for extension-side tracing while we reintroduce features incrementally.

## [0.1.12] — 2026-03-05

### Fixed
- **Model load failure / startup timeout**: Increased health-poll timeout from 60 s to 5 minutes (100 × 3 s) in both `startGateway` and `promptAndStartServer`. Model loading (especially with preflight canary + engine startup) routinely exceeds 60 s on CPU.
- **Double model loading → OOM**: The `sagellm serve` preflight canary (`SAGELLM_PREFLIGHT_CANARY`) loaded the model via `transformers` before the engine server also loaded it, doubling peak memory usage and startup time. The extension now sets `SAGELLM_PREFLIGHT_CANARY=0` in the terminal environment. The engine's own post-startup canary (`SAGELLM_STARTUP_CANARY`) still validates output quality.
- **Install guide wrong command and port**: Step 3 showed `sagellm gateway start --port 8000`; corrected to `sagellm serve --port 8901` (matching `SagePorts.SAGELLM_SERVE_PORT` and the extension's default). Port reference in step 4 updated from `8000` to `8901`.
- **Loading progress feedback**: Status bar now shows elapsed minutes every 60 s while polling so users know a long model load is still in progress.

## [0.1.0] — 2026-03-04

### Added
- Initial release
- Chat panel with streaming responses (SSE)
- Inline code completion provider
- Model manager sidebar tree view
- Status bar with live gateway connection status
- Commands: openChat, selectModel, refreshModels, startGateway, stopGateway, checkConnection, showInstallGuide
- Configuration: host, port, apiKey, tls, model, autoStartGateway, inlineCompletion, chat settings
- Installation guide webview
- OpenAI-compatible gateway client (`/v1/chat/completions`, `/v1/models`)
