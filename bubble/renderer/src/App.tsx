// ============================================
// PromptVault Bubble - Main App Component
// ============================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiClient, Prompt, Folder, ConnectionStatus } from './api';

// ----- Variable Extraction -----
function extractVariables(content: string): { name: string; defaultValue?: string }[] {
    const regex = /\{\{([^}:]+)(?::([^}]*))?\}\}/g;
    const variables: { name: string; defaultValue?: string }[] = [];
    const seen = new Set<string>();

    let match;
    while ((match = regex.exec(content)) !== null) {
        const name = match[1].trim();
        if (!seen.has(name)) {
            seen.add(name);
            variables.push({
                name,
                defaultValue: match[2]?.trim(),
            });
        }
    }

    return variables;
}

function replaceVariables(content: string, values: Record<string, string>): string {
    return content.replace(/\{\{([^}:]+)(?::[^}]*)?\}\}/g, (_, name) => {
        const trimmedName = name.trim();
        return values[trimmedName] ?? `{{${trimmedName}}}`;
    });
}

// ----- App Component -----
const App: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
    const [isLoading, setIsLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [serverUrl, setServerUrl] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Variable modal
    const [variableModal, setVariableModal] = useState<{ open: boolean; prompt: Prompt | null }>({ open: false, prompt: null });
    const [variableValues, setVariableValues] = useState<Record<string, string>>({});

    // Initialize
    useEffect(() => {
        const init = async () => {
            await apiClient.initialize();
            setServerUrl(apiClient.getBaseUrl());
            loadData();
        };
        init();

        // Listen for settings open from tray
        if (window.electronAPI) {
            const cleanup = window.electronAPI.onOpenSettings(() => {
                setShowSettings(true);
                if (!isExpanded) {
                    handleExpand(true);
                }
            });
            return cleanup;
        }
    }, []);

    // Connection status
    useEffect(() => {
        const unsubscribe = apiClient.onConnectionStatusChange(setConnectionStatus);

        // Check connection periodically
        const interval = setInterval(() => {
            apiClient.checkConnection();
        }, 30000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const [loadedPrompts, loadedFolders] = await Promise.all([
            apiClient.fetchPrompts(),
            apiClient.fetchFolders(),
        ]);
        setPrompts(loadedPrompts);
        setFolders(loadedFolders);
        setIsLoading(false);
    };

    const handleExpand = useCallback(async (expand: boolean) => {
        setIsExpanded(expand);
        if (window.electronAPI) {
            await window.electronAPI.toggleExpand(expand);
        }
        if (expand) {
            loadData(); // Refresh data when expanding
        }
    }, []);

    const handleCopy = useCallback(async (prompt: Prompt) => {
        const variables = extractVariables(prompt.content);

        if (variables.length > 0) {
            // Show variable modal
            const initialValues: Record<string, string> = {};
            variables.forEach(v => {
                initialValues[v.name] = v.defaultValue || '';
            });
            setVariableValues(initialValues);
            setVariableModal({ open: true, prompt });
        } else {
            // Direct copy
            await copyToClipboard(prompt.content, prompt.id);
        }
    }, []);

    const copyToClipboard = async (text: string, promptId: string) => {
        if (window.electronAPI) {
            await window.electronAPI.copyToClipboard(text);
        } else {
            await navigator.clipboard.writeText(text);
        }
        setCopiedId(promptId);
        setTimeout(() => setCopiedId(null), 1500);
    };

    const handleCopyWithVariables = async () => {
        if (!variableModal.prompt) return;
        const content = replaceVariables(variableModal.prompt.content, variableValues);
        await copyToClipboard(content, variableModal.prompt.id);
        setVariableModal({ open: false, prompt: null });
    };

    const handleOpenWebApp = () => {
        if (window.electronAPI) {
            window.electronAPI.openWebApp();
        }
    };

    const handleSaveSettings = () => {
        apiClient.setBaseUrl(serverUrl);
        setShowSettings(false);
        loadData();
    };

    // Filter prompts
    const filteredPrompts = useMemo(() => {
        let result = prompts;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.title.toLowerCase().includes(q) ||
                p.content.toLowerCase().includes(q) ||
                p.tags.some(t => t.toLowerCase().includes(q))
            );
        }

        // Sort: pinned first, then by most recently updated
        return [...result].sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            return b.updatedAt - a.updatedAt;
        });
    }, [prompts, searchQuery]);

    const pinnedPrompts = useMemo(() => filteredPrompts.filter(p => p.isPinned), [filteredPrompts]);
    const recentPrompts = useMemo(() => filteredPrompts.filter(p => !p.isPinned).slice(0, 10), [filteredPrompts]);

    // ----- Render Bubble -----
    if (!isExpanded) {
        return (
            <button className="bubble-button" onClick={() => handleExpand(true)}>
                <span className="bubble-icon">💬</span>
            </button>
        );
    }

    // ----- Render Variable Modal -----
    if (variableModal.open && variableModal.prompt) {
        const variables = extractVariables(variableModal.prompt.content);
        return (
            <div className="panel">
                <div className="panel-header">
                    <span className="panel-title">📝 Fill Variables</span>
                    <div className="panel-actions">
                        <button className="icon-btn" onClick={() => setVariableModal({ open: false, prompt: null })}>
                            ✕
                        </button>
                    </div>
                </div>
                <div className="settings-panel">
                    {variables.map(v => (
                        <div key={v.name} className="settings-group">
                            <label className="settings-label">{v.name}</label>
                            <input
                                type="text"
                                className="settings-input"
                                value={variableValues[v.name] || ''}
                                onChange={e => setVariableValues(prev => ({ ...prev, [v.name]: e.target.value }))}
                                placeholder={v.defaultValue || `Enter ${v.name}...`}
                            />
                        </div>
                    ))}
                    <button className="save-btn" onClick={handleCopyWithVariables}>
                        📋 Copy with Variables
                    </button>
                </div>
            </div>
        );
    }

    // ----- Render Settings -----
    if (showSettings) {
        return (
            <div className="panel">
                <div className="panel-header">
                    <span className="panel-title">⚙️ Settings</span>
                    <div className="panel-actions">
                        <button className="icon-btn" onClick={() => setShowSettings(false)}>
                            ✕
                        </button>
                    </div>
                </div>
                <div className="settings-panel">
                    <div className="settings-group">
                        <label className="settings-label">Server URL</label>
                        <input
                            type="text"
                            className="settings-input"
                            value={serverUrl}
                            onChange={e => setServerUrl(e.target.value)}
                            placeholder="http://10.33.10.109:2529"
                        />
                    </div>
                    <button className="save-btn" onClick={handleSaveSettings}>
                        Save Settings
                    </button>
                </div>
            </div>
        );
    }

    // ----- Render Main Panel -----
    return (
        <div className="panel">
            {/* Header */}
            <div className="panel-header">
                <span className="panel-title">💬 PromptVault</span>
                <div className="panel-actions">
                    <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings">
                        ⚙️
                    </button>
                    <button className="icon-btn" onClick={() => handleExpand(false)} title="Collapse">
                        ✕
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="search-container">
                <div className="search-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search prompts..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>

            {/* Prompt List */}
            <div className="prompt-list">
                {isLoading ? (
                    <div className="loading">
                        <div className="spinner"></div>
                    </div>
                ) : filteredPrompts.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">📭</span>
                        <p>{searchQuery ? 'No matching prompts' : 'No prompts yet'}</p>
                    </div>
                ) : (
                    <>
                        {pinnedPrompts.length > 0 && (
                            <>
                                <div className="section-header">📌 Pinned</div>
                                {pinnedPrompts.map(prompt => (
                                    <PromptItem
                                        key={prompt.id}
                                        prompt={prompt}
                                        onCopy={handleCopy}
                                        isCopied={copiedId === prompt.id}
                                    />
                                ))}
                            </>
                        )}

                        {recentPrompts.length > 0 && (
                            <>
                                <div className="section-header">⏱️ Recent</div>
                                {recentPrompts.map(prompt => (
                                    <PromptItem
                                        key={prompt.id}
                                        prompt={prompt}
                                        onCopy={handleCopy}
                                        isCopied={copiedId === prompt.id}
                                    />
                                ))}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Footer */}
            <div className="panel-footer">
                <button className="open-web-btn" onClick={handleOpenWebApp}>
                    🌐 Open Full App
                </button>
                <div className="connection-status">
                    <span className={`status-dot ${connectionStatus}`}></span>
                    <span>
                        {connectionStatus === 'connected' && 'Connected'}
                        {connectionStatus === 'disconnected' && 'Offline'}
                        {connectionStatus === 'checking' && 'Connecting...'}
                    </span>
                </div>
            </div>
        </div>
    );
};

// ----- Prompt Item Component -----
interface PromptItemProps {
    prompt: Prompt;
    onCopy: (prompt: Prompt) => void;
    isCopied: boolean;
}

const PromptItem: React.FC<PromptItemProps> = ({ prompt, onCopy, isCopied }) => {
    const hasVariables = extractVariables(prompt.content).length > 0;

    return (
        <div className="prompt-item">
            <div className="prompt-info">
                <div className="prompt-title">
                    {prompt.isFavorite && '⭐ '}
                    {prompt.title}
                    {hasVariables && ' 📊'}
                </div>
                <div className="prompt-preview">
                    {prompt.content.slice(0, 60)}
                    {prompt.content.length > 60 ? '...' : ''}
                </div>
            </div>
            <button
                className={`copy-btn ${isCopied ? 'copied' : ''}`}
                onClick={e => { e.stopPropagation(); onCopy(prompt); }}
            >
                {isCopied ? '✓' : '📋'}
            </button>
        </div>
    );
};

export default App;
