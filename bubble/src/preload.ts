// ============================================
// PromptVault Bubble - Preload Script
// ============================================

import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Server URL
    getServerUrl: () => ipcRenderer.invoke('get-server-url'),
    setServerUrl: (url: string) => ipcRenderer.invoke('set-server-url', url),

    // Window management
    toggleExpand: (isExpanded: boolean) => ipcRenderer.invoke('toggle-expand', isExpanded),
    getIsExpanded: () => ipcRenderer.invoke('get-is-expanded'),

    // Actions
    openWebApp: () => ipcRenderer.invoke('open-web-app'),
    copyToClipboard: (text: string) => ipcRenderer.invoke('copy-to-clipboard', text),

    // Events
    onOpenSettings: (callback: () => void) => {
        ipcRenderer.on('open-settings', callback);
        return () => ipcRenderer.removeListener('open-settings', callback);
    },
});

// Type definitions for TypeScript
declare global {
    interface Window {
        electronAPI: {
            getServerUrl: () => Promise<string>;
            setServerUrl: (url: string) => Promise<void>;
            toggleExpand: (isExpanded: boolean) => Promise<void>;
            getIsExpanded: () => Promise<boolean>;
            openWebApp: () => Promise<void>;
            copyToClipboard: (text: string) => Promise<void>;
            onOpenSettings: (callback: () => void) => () => void;
        };
    }
}
