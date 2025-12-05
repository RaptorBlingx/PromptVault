// ============================================
// PromptVault - API Client Service
// ============================================

import { Prompt, Folder } from '../types';

// API base URL - configurable for different environments
// In production, this will be the Ubuntu server address
const getApiBaseUrl = (): string => {
    // Check for runtime configuration
    if (typeof window !== 'undefined' && (window as any).PROMPTVAULT_API_URL) {
        return (window as any).PROMPTVAULT_API_URL;
    }

    // Use same origin by default (for when web UI and API are on same server)
    // This allows the web app to work when accessed via http://10.33.10.109:2528
    // and the API is at http://10.33.10.109:2529
    if (typeof window !== 'undefined') {
        const origin = window.location.origin;
        // Replace web UI port with API port
        return origin.replace(':2528', ':2529');
    }

    return 'http://localhost:2529';
};

// ----- Error Handling -----

export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public response?: any
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
            errorData.error || `HTTP ${response.status}`,
            response.status,
            errorData
        );
    }

    // Handle 204 No Content
    if (response.status === 204) {
        return undefined as T;
    }

    return response.json();
}

// ----- API Functions -----

// Health check
export async function checkHealth(): Promise<{ status: string; promptCount: number; folderCount: number }> {
    const response = await fetch(`${getApiBaseUrl()}/api/health`);
    return handleResponse(response);
}

// ----- Prompts -----

export async function fetchPrompts(): Promise<Prompt[]> {
    const response = await fetch(`${getApiBaseUrl()}/api/prompts`);
    return handleResponse(response);
}

export async function fetchPromptById(id: string): Promise<Prompt> {
    const response = await fetch(`${getApiBaseUrl()}/api/prompts/${id}`);
    return handleResponse(response);
}

export async function createPromptApi(prompt: Prompt): Promise<Prompt> {
    const response = await fetch(`${getApiBaseUrl()}/api/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompt),
    });
    return handleResponse(response);
}

export async function updatePromptApi(id: string, updates: Partial<Prompt>): Promise<Prompt> {
    const response = await fetch(`${getApiBaseUrl()}/api/prompts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    return handleResponse(response);
}

export async function deletePromptApi(id: string): Promise<void> {
    const response = await fetch(`${getApiBaseUrl()}/api/prompts/${id}`, {
        method: 'DELETE',
    });
    return handleResponse(response);
}

// ----- Folders -----

export async function fetchFolders(): Promise<Folder[]> {
    const response = await fetch(`${getApiBaseUrl()}/api/folders`);
    return handleResponse(response);
}

export async function fetchFolderById(id: string): Promise<Folder> {
    const response = await fetch(`${getApiBaseUrl()}/api/folders/${id}`);
    return handleResponse(response);
}

export async function createFolderApi(folder: Folder): Promise<Folder> {
    const response = await fetch(`${getApiBaseUrl()}/api/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folder),
    });
    return handleResponse(response);
}

export async function updateFolderApi(id: string, updates: Partial<Folder>): Promise<Folder> {
    const response = await fetch(`${getApiBaseUrl()}/api/folders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    return handleResponse(response);
}

export async function deleteFolderApi(id: string): Promise<void> {
    const response = await fetch(`${getApiBaseUrl()}/api/folders/${id}`, {
        method: 'DELETE',
    });
    return handleResponse(response);
}

// ----- Import/Export -----

export async function importDataApi(prompts: Prompt[], folders: Folder[]): Promise<{ success: boolean; imported: { prompts: number; folders: number } }> {
    const response = await fetch(`${getApiBaseUrl()}/api/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts, folders }),
    });
    return handleResponse(response);
}

export async function exportDataApi(): Promise<{ version: number; exportedAt: number; prompts: Prompt[]; folders: Folder[] }> {
    const response = await fetch(`${getApiBaseUrl()}/api/export`);
    return handleResponse(response);
}

// ----- Connection Status -----

export type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

let connectionStatus: ConnectionStatus = 'checking';
let connectionListeners: ((status: ConnectionStatus) => void)[] = [];

export function getConnectionStatus(): ConnectionStatus {
    return connectionStatus;
}

export function onConnectionStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    connectionListeners.push(listener);
    return () => {
        connectionListeners = connectionListeners.filter(l => l !== listener);
    };
}

function setConnectionStatus(status: ConnectionStatus): void {
    if (connectionStatus !== status) {
        connectionStatus = status;
        connectionListeners.forEach(l => l(status));
    }
}

// Check connection periodically
export async function checkConnection(): Promise<boolean> {
    try {
        setConnectionStatus('checking');
        await checkHealth();
        setConnectionStatus('connected');
        return true;
    } catch (error) {
        setConnectionStatus('disconnected');
        return false;
    }
}

// Start periodic connection checking
let connectionCheckInterval: ReturnType<typeof setInterval> | null = null;

export function startConnectionMonitoring(intervalMs: number = 30000): void {
    if (connectionCheckInterval) return;

    checkConnection(); // Initial check
    connectionCheckInterval = setInterval(checkConnection, intervalMs);
}

export function stopConnectionMonitoring(): void {
    if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
        connectionCheckInterval = null;
    }
}
