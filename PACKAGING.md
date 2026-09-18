# 📦 Packaging & Distribution Guide

This document outlines how **Figma MCP** is packaged and distributed so that any team member, designer, or external developer can consume it with zero friction.

---

## 🏗️ Distribution Architecture

Figma MCP consists of two synchronized artifacts:
1. **MCP Server** (`figma-mcp`): Distributed via npm and Docker.
2. **Figma Companion Plugin** (`figma-mcp-bridge`): Distributed as a standalone pre-built folder and `.zip` archive.

```
Figma MCP Monorepo
├── packages/mcp-server/
│   ├── dist/                 (Compiled ES modules for server)
│   └── plugin-dist/          (Embedded standalone companion plugin for npx export)
└── dist-release/
    ├── figma-companion-plugin/    (Zero-dependency plugin folder ready for Figma)
    ├── figma-companion-plugin.zip (Zip archive for GitHub releases & instant download)
    └── configs/                   (Copy-paste JSON configs for Claude & Cursor)
```

---

## 🛠️ Generating Release Packages

Run the automated release packaging script from the root workspace:

```bash
npm run package
```

This script:
1. Compiles both `@figma-mcp/plugin` and `figma-mcp` workspaces.
2. Generates the standalone `manifest.json` pointing directly to sibling `code.js` and `ui.html`.
3. Embeds the plugin into `packages/mcp-server/plugin-dist/` (packaged directly into the npm tarball).
4. Creates a compressed `figma-companion-plugin.zip` in `dist-release/`.
5. Emits ready-to-copy client config files in `dist-release/configs/`.

---

## 🚀 Publishing to npm

To publish the MCP server to the public npm registry:

```bash
# 1. Ensure all packages are built and bundled
npm run package

# 2. Publish from the mcp-server package directory
cd packages/mcp-server
npm publish --access public
```

Once published, anyone can run:
```bash
# Start the MCP server directly
npx -y figma-mcp

# Or export the companion plugin
npx -y figma-mcp export-plugin
```

---

## 🐙 Publishing GitHub Releases

When publishing a new release on GitHub:
1. Run `npm run package`.
2. Tag the commit (e.g. `git tag v1.0.0 && git push origin v1.0.0`).
3. In GitHub Releases, attach:
   - **`dist-release/figma-companion-plugin.zip`**
4. Paste the contents of `QUICKSTART.md` into the release notes.

Designers can simply download `figma-companion-plugin.zip`, extract it, and click **Import plugin from manifest...** in Figma Desktop!

---

## 🐳 Docker Distribution

Figma MCP includes production Docker support for remote / team setups:

### Build Container Image
```bash
docker build -t figma-mcp:latest .
```

### Run Container (SSE Transport)
```bash
docker run -d \
  -p 3000:3000 \
  -p 3055:3055 \
  -e MCP_TRANSPORT=sse \
  -e FIGMA_ACCESS_TOKEN=your_optional_token \
  --name figma-mcp \
  figma-mcp:latest
```

### Using docker-compose
```bash
docker-compose up -d
```
