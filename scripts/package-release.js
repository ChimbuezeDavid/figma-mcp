import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("====================================================");
console.log("📦 Packaging Figma MCP for Universal Distribution");
console.log("====================================================");

// Step 1: Build the monorepo workspaces
console.log("\n1️⃣  Building monorepo workspaces (plugin & server)...");
execSync("npm run build", { cwd: rootDir, stdio: "inherit" });

// Paths
const pluginDistDir = path.join(rootDir, "packages", "figma-plugin", "dist");
const mcpServerPluginDistDir = path.join(rootDir, "packages", "mcp-server", "plugin-dist");
const releaseDir = path.join(rootDir, "dist-release");
const releasePluginDir = path.join(releaseDir, "figma-companion-plugin");
const releaseConfigsDir = path.join(releaseDir, "configs");
const releaseZipPath = path.join(releaseDir, "figma-companion-plugin.zip");

// Ensure directories
[mcpServerPluginDistDir, releaseDir, releasePluginDir, releaseConfigsDir].forEach((d) => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
});

// Step 2: Prepare standalone manifest.json
console.log("\n2️⃣  Creating standalone Figma plugin bundle...");
const standaloneManifest = {
  name: "Figma MCP Bridge",
  id: "figma-mcp-bridge",
  api: "1.0.0",
  main: "code.js",
  ui: "ui.html",
  editorType: ["figma"],
  networkAccess: {
    allowedDomains: ["*"],
    devAllowedDomains: [
      "http://localhost:3055",
      "http://127.0.0.1:3055",
      "ws://localhost:3055",
      "ws://127.0.0.1:3055"
    ],
    reasoning: "Connects to the local Figma MCP Server WebSocket bridge to receive design and prototyping instructions.",
  },
};

const pluginReadme = `====================================================
🎨 FIGMA MCP COMPANION PLUGIN
====================================================

HOW TO INSTALL IN FIGMA DESKTOP (Takes 10 seconds):

1. Open the Figma Desktop App.
2. Open any design file (or create a new draft).
3. Right-click anywhere on the canvas.
4. Navigate to: Plugins > Development > "Import plugin from manifest..."
5. Select the "manifest.json" file in this folder.
6. Click Open.

The plugin is now installed in your Figma Desktop!
To run it, press Ctrl+Alt+P (Windows) or Cmd+Opt+P (Mac),
or find it under Plugins > Development > "Figma MCP Bridge".

The plugin will automatically connect to your local Figma MCP Server on ws://localhost:3055.
====================================================
`;

const codeJs = fs.readFileSync(path.join(pluginDistDir, "code.js"), "utf8");
const uiHtml = fs.readFileSync(path.join(pluginDistDir, "ui.html"), "utf8");
const manifestStr = JSON.stringify(standaloneManifest, null, 2);

// Write to packages/mcp-server/plugin-dist (for npm distribution)
fs.writeFileSync(path.join(mcpServerPluginDistDir, "manifest.json"), manifestStr, "utf8");
fs.writeFileSync(path.join(mcpServerPluginDistDir, "code.js"), codeJs, "utf8");
fs.writeFileSync(path.join(mcpServerPluginDistDir, "ui.html"), uiHtml, "utf8");
fs.writeFileSync(path.join(mcpServerPluginDistDir, "README.txt"), pluginReadme, "utf8");

// Write to dist-release/figma-companion-plugin (for direct download)
fs.writeFileSync(path.join(releasePluginDir, "manifest.json"), manifestStr, "utf8");
fs.writeFileSync(path.join(releasePluginDir, "code.js"), codeJs, "utf8");
fs.writeFileSync(path.join(releasePluginDir, "ui.html"), uiHtml, "utf8");
fs.writeFileSync(path.join(releasePluginDir, "README.txt"), pluginReadme, "utf8");

console.log("✔ Standalone plugin files written to:");
console.log(`  - ${mcpServerPluginDistDir}`);
console.log(`  - ${releasePluginDir}`);

// Step 3: Create ZIP Archive for GitHub Releases & one-click sharing
console.log("\n3️⃣  Generating compressed zip archive...");
try {
  if (process.platform === "win32") {
    // Use PowerShell Compress-Archive on Windows
    execSync(
      `powershell -Command "Compress-Archive -Path '${releasePluginDir}/*' -DestinationPath '${releaseZipPath}' -Force"`,
      { stdio: "inherit" }
    );
  } else {
    // Use zip on Unix/macOS
    execSync(`cd "${releasePluginDir}" && zip -r "${releaseZipPath}" ./*`, { stdio: "inherit" });
  }
  const zipStats = fs.statSync(releaseZipPath);
  console.log(`✔ Generated zip archive: ${releaseZipPath} (${Math.round(zipStats.size / 1024)} KB)`);
} catch (err) {
  console.warn("⚠️  Could not create zip archive automatically:", err.message);
}

// Step 4: Generate Client Configurations
console.log("\n4️⃣  Writing ready-to-copy client configuration files...");

const claudeConfig = {
  mcpServers: {
    figma: {
      command: "npx",
      args: ["-y", "figma-mcp"],
      env: {
        FIGMA_ACCESS_TOKEN: "your_optional_figma_rest_token_here",
      },
    },
  },
};

const cursorConfig = {
  mcpServers: {
    figma: {
      command: "npx",
      args: ["-y", "figma-mcp"],
      env: {
        FIGMA_ACCESS_TOKEN: "your_optional_figma_rest_token_here",
      },
    },
  },
};

const antigravityConfig = {
  figma: {
    command: "npx",
    args: ["-y", "figma-mcp"],
    env: {
      FIGMA_ACCESS_TOKEN: "your_optional_figma_rest_token_here",
    },
  },
};

fs.writeFileSync(
  path.join(releaseConfigsDir, "claude_desktop_config.json"),
  JSON.stringify(claudeConfig, null, 2),
  "utf8"
);
fs.writeFileSync(
  path.join(releaseConfigsDir, "cursor_mcp.json"),
  JSON.stringify(cursorConfig, null, 2),
  "utf8"
);
fs.writeFileSync(
  path.join(releaseConfigsDir, "antigravity_mcp.json"),
  JSON.stringify(antigravityConfig, null, 2),
  "utf8"
);

console.log(`✔ Generated configuration templates in: ${releaseConfigsDir}`);

console.log("\n====================================================");
console.log("🎉 Packaging Complete!");
console.log("====================================================");
console.log("Assets available in: ./dist-release");
console.log("  1. figma-companion-plugin/       (Folder ready to import in Figma)");
console.log("  2. figma-companion-plugin.zip   (Zip archive for sharing/releases)");
console.log("  3. configs/                     (Claude, Cursor, Antigravity configs)");
console.log("====================================================\n");
