// ============================================
// PromptVault Bubble - API Client
// ============================================

export interface Prompt {
    id: string;
    title: string;
    content: string;
    tags: string[];
    isFavorite: boolean;
    isPinned: boolean;
    folderId: string | null;
    createdAt: number;
    updatedAt: number;
    versions: PromptVersion[];
}

export interface PromptVersion {
    id: string;
    content: string;
    title: string;
    savedAt: number;
}

export interface Folder {
    id: string;
    name: string;
    icon: string;
    color: string;
    createdAt: number;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

class ApiClient {
    private baseUrl: string = 'http://10.33.10.109:2529';
    private connectionStatus: ConnectionStatus = 'checking';
    private statusListeners: ((status: ConnectionStatus) => void)[] = [];

    async initialize(): Promise<void> {
        if (window.electronAPI) {
            this.baseUrl = await window.electronAPI.getServerUrl();
        }
        this.checkConnection();
    }

    setBaseUrl(url: string): void {
        this.baseUrl = url;
        if (window.electronAPI) {
            window.electronAPI.setServerUrl(url);
        }
    }

    getBaseUrl(): string {
        return this.baseUrl;
    }

    onConnectionStatusChange(callback: (status: ConnectionStatus) => void): () => void {
        this.statusListeners.push(callback);
        callback(this.connectionStatus);
        return () => {
            this.statusListeners = this.statusListeners.filter(l => l !== callback);
        };
    }

    private setConnectionStatus(status: ConnectionStatus): void {
        if (this.connectionStatus !== status) {
            this.connectionStatus = status;
            this.statusListeners.forEach(l => l(status));
        }
    }

    async checkConnection(): Promise<boolean> {
        this.setConnectionStatus('checking');
        try {
            const response = await fetch(`${this.baseUrl}/api/health`, {
                signal: AbortSignal.timeout(5000),
            });
            if (response.ok) {
                this.setConnectionStatus('connected');
                return true;
            }
        } catch {
            // Connection failed
        }
        this.setConnectionStatus('disconnected');
        return false;
    }

    async fetchPrompts(): Promise<Prompt[]> {
        try {
            const response = await fetch(`${this.baseUrl}/api/prompts`);
            if (!response.ok) throw new Error('Failed to fetch prompts');
            return response.json();
        } catch (error) {
            console.error('Failed to fetch prompts:', error);
            this.setConnectionStatus('disconnected');
            return [];
        }
    }

    async fetchFolders(): Promise<Folder[]> {
        try {
            const response = await fetch(`${this.baseUrl}/api/folders`);
            if (!response.ok) throw new Error('Failed to fetch folders');
            return response.json();
        } catch (error) {
            console.error('Failed to fetch folders:', error);
            return [];
        }
    }

    async createPrompt(prompt: Partial<Prompt>): Promise<Prompt | null> {
        try {
            const response = await fetch(`${this.baseUrl}/api/prompts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(prompt),
            });
            if (!response.ok) throw new Error('Failed to create prompt');
            return response.json();
        } catch (error) {
            console.error('Failed to create prompt:', error);
            return null;
        }
    }

    async updatePrompt(id: string, updates: Partial<Prompt>): Promise<Prompt | null> {
        try {
            const response = await fetch(`${this.baseUrl}/api/prompts/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            if (!response.ok) throw new Error('Failed to update prompt');
            return response.json();
        } catch (error) {
            console.error('Failed to update prompt:', error);
            return null;
        }
    }

    async deletePrompt(id: string): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/prompts/${id}`, {
                method: 'DELETE',
            });
            return response.ok;
        } catch (error) {
            console.error('Failed to delete prompt:', error);
            return false;
        }
    }
}

export const apiClient = new ApiClient();
