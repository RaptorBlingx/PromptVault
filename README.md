# PromptVault Pro

<div align="center">

**State-of-the-Art Prompt Management System for LLM Power Users**

[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://github.com/RaptorBlingx/PromptVault)
[![Electron](https://img.shields.io/badge/Electron-Windows-9b4dca?logo=electron)](https://github.com/RaptorBlingx/PromptVault)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

🌐 **Web App** + 🫧 **Floating Bubble** for Windows

</div>

---

## ✨ Features

### Web Application
| Feature | Description |
|---------|-------------|
| 📁 **Folders** | Organize prompts into collections with custom icons |
| ⚡ **Smart Variables** | Use `{{variable}}` syntax for dynamic prompts |
| 🌙 **Dark Mode** | System-aware theme with manual toggle |
| ⌨️ **Command Palette** | Quick search and actions with `Ctrl+K` |
| 🕐 **Version History** | Auto-saves last 5 versions with one-click restore |
| 📌 **Pin to Top** | Keep important prompts visible |
| ⭐ **Favorites** | Quick access to starred prompts |
| 💾 **Import/Export** | Full JSON backup and restore |
| 🐳 **Docker Ready** | Zero-touch self-hosting |

### Floating Bubble (Windows Desktop)
| Feature | Description |
|---------|-------------|
| 🫧 **Always-on-Top** | Floating bubble accessible from anywhere |
| ⌨️ **Global Hotkey** | Press `Ctrl+Shift+V` to toggle |
| 🔍 **Instant Search** | Filter prompts as you type |
| 📋 **One-Click Copy** | Copy prompts directly to clipboard |
| 📊 **Variable Fill** | Fill `{{variables}}` before copying |
| � **Pin & Favorites** | Filter by pinned or favorite prompts |
| 🔔 **Toast Notifications** | Visual feedback for all actions |
| �🔄 **Real-time Sync** | Syncs with server automatically |
| 🌐 **Open Web App** | Quick launch to full web interface |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     WINDOWS 11 PC                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              PromptVault Bubble (Electron)                  ││
│  │  • Floating bubble with Ctrl+Shift+V toggle                 ││
│  │  • Search, copy, and quick-create prompts                   ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │ HTTP API                         │
└──────────────────────────────┼──────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                     UBUNTU SERVER                                │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │  Port 2528: Web UI (React + Vite)                            ││
│  │  Port 2529: REST API (Express.js + SQLite)                   ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

---

## 📦 Server Installation (Ubuntu)

### Prerequisites
- Docker & Docker Compose
- Git

### Step 1: Clone and Navigate

```bash
git clone https://github.com/RaptorBlingx/PromptVault.git
cd PromptVault
```

### Step 2: Build and Start with Docker

```bash
docker compose up -d --build
```

### Step 3: Verify Installation

```bash
# Check Web UI (should return HTML)
curl http://localhost:2528

# Check API health
curl http://localhost:2529/api/health
```

### Step 4: Configure Firewall (if needed)

```bash
sudo ufw allow 2528/tcp
sudo ufw allow 2529/tcp
```

### Updating the Server

```bash
cd PromptVault
git pull
docker compose down
docker compose up -d --build
```

---

## 💻 Windows 11 Client Installation (Floating Bubble)

### Prerequisites
- Node.js 18+ installed
- Git installed
- Server running on Ubuntu

### Step 1: Clone the Repository

```cmd
git clone https://github.com/RaptorBlingx/PromptVault.git
cd PromptVault\bubble
```

### Step 2: Install Dependencies

```cmd
npm install
```

### Step 3: Build and Create Installer

```cmd
npm run dist:win
```

This creates:
- `release\PromptVault Bubble Setup x.x.x.exe` (Installer)
- `release\PromptVault Bubble x.x.x.exe` (Portable)

### Step 4: Install the App

1. Navigate to `bubble\release\`
2. Run `PromptVault Bubble Setup 1.0.0.exe`
3. Follow the installation wizard

### Step 5: Configure Server URL

1. Click the floating bubble (💬) in the bottom-right corner
2. Click the ⚙️ (Settings) button
3. Enter your server URL: `http://YOUR_SERVER_IP:2529`
4. Click **Save Settings**

---

## 🎮 Usage

### Web App (Browser)
- Open `http://YOUR_SERVER_IP:2528` in your browser
- Use `Ctrl+K` for Command Palette
- Use `Ctrl+N` to create new prompt

### Floating Bubble (Windows)

| Action | How to |
|--------|--------|
| **Toggle bubble** | Press `Ctrl+Shift+V` anywhere |
| **Expand panel** | Click the bubble |
| **Move bubble** | Click and drag the bubble |
| **Search prompts** | Type in the search box |
| **Filter prompts** | Use All / 📌 / ⭐ tabs |
| **Copy prompt** | Click a prompt or 📋 button |
| **Pin/Favorite** | Click 📌 or ⭐ on any prompt |
| **Fill variables** | Prompts with `{{vars}}` show a fill dialog |
| **Open web app** | Click "🌐 Open Full App" |
| **Access settings** | Click ⚙️ or right-click tray icon |
| **Close panels** | Press `Esc` (cascading) |
| **Quit** | Right-click tray icon → Quit |

---

## ⌨️ Keyboard Shortcuts

### Web App
| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Command Palette |
| `Ctrl+N` | New Prompt |
| `Ctrl+S` | Save (in editor) |
| `Esc` | Close modals |

### Floating Bubble
| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+V` | Toggle bubble visibility |
| `Esc` | Close current panel (cascading) |

---

## 🔌 API Reference

Base URL: `http://YOUR_SERVER:2529`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check with stats |
| GET | `/api/prompts` | List all prompts |
| POST | `/api/prompts` | Create prompt |
| PUT | `/api/prompts/:id` | Update prompt |
| DELETE | `/api/prompts/:id` | Delete prompt |
| GET | `/api/folders` | List all folders |
| POST | `/api/folders` | Create folder |
| PUT | `/api/folders/:id` | Update folder |
| DELETE | `/api/folders/:id` | Delete folder |
| GET | `/api/export` | Export all data as JSON |
| POST | `/api/import` | Import data from JSON |

---

## 🛠️ Local Development

### Web App + API

```bash
# Install dependencies
npm install

# Start web app dev server (port 5173)
npm run dev

# In another terminal, start API server (port 2529)
cd server
npm install
npm run dev
```

### Electron Bubble (Development)

```bash
cd bubble
npm install
npm run dev
```

---

## 📂 Project Structure

```
PromptVault/
├── App.tsx                 # Main React application
├── components/             # React UI components
├── services/
│   ├── apiService.ts       # API client with connection monitoring
│   └── storageService.ts   # Storage layer with API + cache
├── types.ts                # TypeScript type definitions
├── styles.css              # Design system (dark/light themes)
│
├── server/                 # Backend API Server
│   ├── src/
│   │   ├── index.ts        # Express server entry
│   │   ├── api.ts          # REST API routes
│   │   └── database.ts     # SQLite database layer
│   └── package.json
│
├── bubble/                 # Electron Floating Bubble
│   ├── src/
│   │   ├── main.ts         # Electron main process
│   │   └── preload.ts      # IPC bridge
│   ├── renderer/
│   │   └── src/
│   │       ├── App.tsx     # Bubble UI
│   │       ├── api.ts      # API client
│   │       └── styles.css  # Bubble styles
│   └── package.json
│
├── Dockerfile              # Multi-stage Docker build
├── docker-compose.yml      # Docker orchestration
├── nginx.conf              # Nginx configuration
└── supervisord.conf        # Process manager config
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Custom CSS Design System |
| **Icons** | Lucide React |
| **Backend API** | Express.js, better-sqlite3 |
| **Desktop App** | Electron |
| **Deploy** | Docker, Nginx, Supervisor |

---

## 🔧 Troubleshooting

### Bubble can't connect to server
1. Check server is running: `curl http://YOUR_SERVER:2529/api/health`
2. Verify firewall allows port 2529
3. Check the server URL in bubble settings

### Docker container won't start
```bash
# Check logs
docker compose logs -f

# Rebuild from scratch
docker compose down -v
docker compose up -d --build
```

### Electron build fails on Windows
```bash
# Make sure Node.js 18+ is installed
node --version

# Clean and rebuild
rmdir /s /q node_modules
rmdir /s /q dist
rmdir /s /q release
npm install
npm run dist:win
```

---

## 📄 License

MIT © [RaptorBlingx](https://github.com/RaptorBlingx)