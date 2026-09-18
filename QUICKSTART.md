# ⚡ Figma MCP — 60-Second Quickstart Guide

Connect AI assistants (Claude, Cursor, Antigravity, Cline) directly to Figma to generate production-ready UI screens, build design systems, and wire interactive prototypes.

---

## 🏗️ How It Works

```
┌──────────────────────────────┐
│  AI Assistant (Claude/Cursor)│
└──────────────┬───────────────┘
               │ (STDIO or SSE)
┌──────────────▼───────────────┐
│     Figma MCP Server         │ (npx figma-mcp)
└──────────────┬───────────────┘
               │ (Local WebSocket :3055)
┌──────────────▼───────────────┐
│ Figma Desktop + Companion Plg│ (Canvas Sandbox)
└──────────────────────────────┘
```

---

## 🚀 Setup in 2 Easy Steps

### Step 1: Install the Figma Companion Plugin (Takes 10 seconds)

You don't need to build or compile anything! Choose either option:

#### Option A: Download Pre-Built Plugin Zip (Recommended for Designers)
1. Download **[`figma-companion-plugin.zip`](./dist-release/figma-companion-plugin.zip)** and extract it to any folder on your computer.
2. Open the **Figma Desktop App**.
3. Right-click anywhere on the canvas -> **Plugins** > **Development** > **"Import plugin from manifest..."**.
4. Select the extracted `manifest.json` file.
5. In Figma, run the plugin by pressing `Ctrl+Alt+P` (Windows) or `Cmd+Opt+P` (Mac).
   *(You will see a green "Connected" badge).*

#### Option B: Export via Terminal (Recommended for Developers)
In your terminal, run:
```bash
npx figma-mcp export-plugin
```
Then import the created `./figma-companion-plugin/manifest.json` into Figma.

---

### Step 2: Configure your AI Assistant

Add Figma MCP to your favorite AI assistant's configuration file:

#### 🟣 Claude Desktop
Add this to your `claude_desktop_config.json`:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "figma-mcp"],
      "env": {
        "FIGMA_ACCESS_TOKEN": ""
      }
    }
  }
}
```

#### ⚡ Cursor IDE
Add this to `.cursor/mcp.json` or in **Cursor Settings > Features > MCP**:
```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "figma-mcp"]
    }
  }
}
```

#### 🚀 Antigravity / Gemini CLI / Cline
- **Command**: `npx`
- **Args**: `["-y", "figma-mcp"]`
- **Transport**: `STDIO`

---

## 🎨 Example Prompts to Try

Once connected, ask your AI assistant:

### 1. Generate Complete Mobile Screens with AutoLayout
> *"Design a modern dark-mode Fintech onboarding screen for iPhone 16. Include a header with an illustration placeholder, input fields for email/password, and a primary action button."*

### 2. Build Design System Components
> *"Create a primary button component named 'Button/Primary' with 12px border radius, royal blue fill, and white bold text. Then create 3 instances with labels 'Log In', 'Sign Up', and 'Continue'."*

### 3. Wire Interactive Prototypes
> *"Connect the 'Sign Up' button on the Welcome screen to navigate to the Registration screen using a Smart Animate slide-in transition."*

### 4. Audit Existing Designs
> *"Audit the current page for touch targets (< 44px), typography hierarchy, and spacing consistency, then give me a fix plan."*

---

## 🩺 Diagnostics & Troubleshooting

Run the doctor command in your terminal to verify your environment:
```bash
npx figma-mcp doctor
```

### Port 3055 is already in use
If another instance is holding the WebSocket bridge port:
```bash
# Windows PowerShell
npm run clean:port

# macOS / Linux
lsof -ti:3055 | xargs kill -9
```

### Headless Cloud REST Access (Optional)
If you want to read Figma files headlessly without having Figma open on your desktop, generate a Personal Access Token in **Figma Account Settings > Personal access tokens**, and set:
```bash
export FIGMA_ACCESS_TOKEN="figd_your_token_here"
```
*(Not required for canvas editing via the Desktop app).*
