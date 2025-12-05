// ============================================
// PromptVault Bubble - Electron Main Process
// ============================================

import { app, BrowserWindow, globalShortcut, Tray, Menu, nativeImage, shell, ipcMain, screen } from 'electron';
import * as path from 'path';
import Store from 'electron-store';

// Store for persisting settings
interface StoreSchema {
    serverUrl: string;
    windowPosition: { x: number; y: number } | null;
    isExpanded: boolean;
}

const store = new Store<StoreSchema>({
    defaults: {
        serverUrl: 'http://10.33.10.109:2529',
        windowPosition: null,
        isExpanded: false,
    },
});

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// Window dimensions
const BUBBLE_SIZE = 60;
const EXPANDED_WIDTH = 400;
const EXPANDED_HEIGHT = 600;

function createWindow(): void {
    const savedPosition = store.get('windowPosition');
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

    // Default position: bottom right corner
    const defaultX = screenWidth - BUBBLE_SIZE - 20;
    const defaultY = screenHeight - BUBBLE_SIZE - 20;

    mainWindow = new BrowserWindow({
        width: BUBBLE_SIZE,
        height: BUBBLE_SIZE,
        x: savedPosition?.x ?? defaultX,
        y: savedPosition?.y ?? defaultY,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        hasShadow: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    // Load the renderer
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5174');
        // mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
    }

    // Save position when moved
    mainWindow.on('moved', () => {
        if (mainWindow) {
            const [x, y] = mainWindow.getPosition();
            store.set('windowPosition', { x, y });
        }
    });

    // Hide instead of close
    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow?.hide();
        }
    });

    // Make window draggable (handled in renderer)
}

function createTray(): void {
    // Create a simple icon (in production, use a proper icon file)
    const iconPath = path.join(__dirname, '../assets/tray-icon.png');
    let icon: Electron.NativeImage;

    try {
        icon = nativeImage.createFromPath(iconPath);
    } catch {
        // Fallback: create a simple colored icon
        icon = nativeImage.createFromDataURL(
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAGtJREFUOI3tkrENwDAIBDnvbOmyRZYJXGSwXbhAKvyVJYr/ERI+e3P/3R0AoJSSiAjnHGZGZoZ7T0T4fw0RgZmhqrDWYmb4x2FmdC8RQVWBiKCqYGaY2b3GWguqCu89MhMzwz1HZv5/4wS/kw82v0OyXwAAAABJRU5ErkJggg=='
        );
    }

    tray = new Tray(icon.resize({ width: 16, height: 16 }));

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show/Hide Bubble',
            click: () => toggleWindow(),
        },
        {
            label: 'Open PromptVault',
            click: () => {
                const webUrl = store.get('serverUrl').replace(':2529', ':2528');
                shell.openExternal(webUrl);
            },
        },
        { type: 'separator' },
        {
            label: 'Settings',
            click: () => {
                mainWindow?.webContents.send('open-settings');
                showWindow();
            },
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                isQuitting = true;
                app.quit();
            },
        },
    ]);

    tray.setToolTip('PromptVault Bubble');
    tray.setContextMenu(contextMenu);

    // Toggle on click
    tray.on('click', () => toggleWindow());
}

function toggleWindow(): void {
    if (mainWindow?.isVisible()) {
        mainWindow.hide();
    } else {
        showWindow();
    }
}

function showWindow(): void {
    if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
    }
}

function registerGlobalShortcut(): void {
    // Register Ctrl+Shift+V to toggle bubble
    const success = globalShortcut.register('Control+Shift+V', () => {
        toggleWindow();
    });

    if (!success) {
        console.error('Failed to register global shortcut');
    }
}

// ----- IPC Handlers -----

ipcMain.handle('get-server-url', () => {
    return store.get('serverUrl');
});

ipcMain.handle('set-server-url', (_, url: string) => {
    store.set('serverUrl', url);
});

ipcMain.handle('toggle-expand', (_, isExpanded: boolean) => {
    if (!mainWindow) return;

    const [currentX, currentY] = mainWindow.getPosition();
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

    if (isExpanded) {
        // Expand window
        // Calculate new position to keep it on screen
        const newX = Math.min(currentX, screenWidth - EXPANDED_WIDTH);
        const newY = Math.min(currentY, screenHeight - EXPANDED_HEIGHT);

        mainWindow.setBounds({
            x: newX,
            y: newY,
            width: EXPANDED_WIDTH,
            height: EXPANDED_HEIGHT
        });
    } else {
        // Collapse to bubble
        // We want to keep the bubble roughly where the top-left (or user preferred corner) was
        // But since we might have moved the expanded window, let's just use current position
        // ensuring it fits
        const newX = Math.min(currentX, screenWidth - BUBBLE_SIZE);
        const newY = Math.min(currentY, screenHeight - BUBBLE_SIZE);

        mainWindow.setBounds({
            x: newX,
            y: newY,
            width: BUBBLE_SIZE,
            height: BUBBLE_SIZE
        });
    }

    store.set('isExpanded', isExpanded);
});

ipcMain.handle('move-window', (_, { x, y }: { x: number; y: number }) => {
    if (!mainWindow) return;
    mainWindow.setPosition(Math.round(x), Math.round(y));
    store.set('windowPosition', { x: Math.round(x), y: Math.round(y) });
});

ipcMain.handle('open-web-app', () => {
    const webUrl = store.get('serverUrl').replace(':2529', ':2528');
    shell.openExternal(webUrl);
});

ipcMain.handle('copy-to-clipboard', (_, text: string) => {
    const { clipboard } = require('electron');
    clipboard.writeText(text);
});

ipcMain.handle('get-is-expanded', () => {
    return store.get('isExpanded');
});

// ----- Single Instance Lock -----
// Must be checked before any other initialization
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        // Someone tried to run a second instance, focus our window
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });

    // ----- App Events -----
    app.whenReady().then(() => {
        createWindow();
        createTray();
        registerGlobalShortcut();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('will-quit', () => {
        globalShortcut.unregisterAll();
    });

    app.on('before-quit', () => {
        isQuitting = true;
    });
}
