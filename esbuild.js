const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");
const os = require("os");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

// After each build, sync dist/extension.js to every installed copy in
// ~/.vscode-server/extensions/intellistream.sagellm-vscode-<version>/
// so Reload Window picks up the latest build without manual copying.
function syncToInstalledExtensions() {
  const src = path.join(__dirname, "dist", "extension.js");
  if (!fs.existsSync(src)) { return; }

  const extRoot = path.join(os.homedir(), ".vscode-server", "extensions");
  if (!fs.existsSync(extRoot)) { return; }

  for (const entry of fs.readdirSync(extRoot)) {
    if (!entry.startsWith("intellistream.sagellm-vscode-")) { continue; }
    const dest = path.join(extRoot, entry, "dist", "extension.js");
    try {
      fs.copyFileSync(src, dest);
      console.log(`[sync] → ${entry}/dist/extension.js`);
    } catch (e) {
      console.warn(`[sync] failed for ${entry}: ${e.message}`);
    }
  }
}

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: "node",
    outfile: "dist/extension.js",
    external: ["vscode"],
    logLevel: "silent",
    plugins: [
      {
        name: "esbuild-problem-matcher",
        setup(build) {
          build.onStart(() => {
            console.log("[watch] build started");
          });
          build.onEnd((result) => {
            result.errors.forEach(({ text, location }) => {
              console.error(`✘ [ERROR] ${text}`);
              if (location) {
                console.error(`    ${location.file}:${location.line}:${location.column}:`);
              }
            });
            console.log("[watch] build finished");
            syncToInstalledExtensions();
          });
        },
      },
    ],
  });

  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
