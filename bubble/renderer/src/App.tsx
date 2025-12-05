// ============================================
// PromptVault Bubble - Main App Component
// ============================================

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

    // Editor State
    const [editorMode, setEditorMode] = useState<'create' | 'edit' | null>(null);
    const [editorData, setEditorData] = useState({ title: '', content: '', id: '' });

    // Variable modal
    const [variableModal, setVariableModal] = useState<{ open: boolean; prompt: Prompt | null }>({ open: false, prompt: null });
    const [variableValues, setVariableValues] = useState<Record<string, string>>({});

    // Dragging State
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });

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

    // ----- Dragging Logic -----
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // Only left click
        isDragging.current = true;
        dragOffset.current = { x: e.screenX, y: e.screenY };

        // Add global listeners
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging.current) return;

        const deltaX = e.screenX - dragOffset.current.x;
        const deltaY = e.screenY - dragOffset.current.y;

        // We need the current window position to add delta
        // But since we don't track it locally, we can't easily do relative moves without querying main
        // A simpler approach for "manual drag" is to ask main to move relative to current
        // BUT, standard drag usually sets position based on mouse delta.
        // Let's use a simpler approach: Just tell main to move by delta? No, setPosition is absolute.

        // Better approach: Since we are in a transparent window that might cover the screen (if expanded)
        // or just a bubble.
        // Actually, for the bubble, we can use the `movementX/Y` from the event if we were locked,
        // but screenX/Y is better.

        // Wait, to do this properly without lag, we need the initial window position.
        // Let's just use the `move-window` IPC which we defined to take absolute coordinates.
        // We need to know where the window IS.
        // Let's assume the main process handles the "move relative" if we send delta?
        // No, I defined `move-window` to take {x, y}.

        // Let's change strategy: We will use `webkit-app-region: drag` for the expanded header,
        // but for the bubble button, we need to distinguish click vs drag.
        // Actually, if I remove `webkit-app-region: drag` from the bubble, I can implement a "hold to drag"
        // or just use a small drag handle.
        // OR, I can use the fact that `click` fires after `mouseup`.
        // If I moved more than a few pixels, it's a drag, not a click.

        // Let's try this:
        // 1. On mousedown, get current window position from main (async).
        // 2. Then start tracking delta.
        // This might be laggy.

        // Alternative: Just use a specific "Drag" handle icon on the bubble?
        // The user said "the bubble is stuck".
        // Let's try to make the bubble draggable by holding it.

        // Actually, `window.moveTo` works in Electron renderer if `nodeIntegration` is off?
        // No, usually blocked.

        // Let's go with: The bubble button itself is NOT draggable by default (to allow clicks),
        // but maybe the outer rim is? Or add a small drag indicator.

        // User wants it to be "much more better".
        // Let's implement a proper drag handler.
        // I will use `window.electronAPI.moveWindow` but I need the current position.
        // I'll add `getWindowPosition` to API?
        // Too complicated for now.

        // SIMPLEST FIX:
        // Use `webkit-app-region: drag` on a *part* of the bubble, e.g. an outer ring,
        // and let the center be clickable.
        // OR, use `webkit-app-region: drag` but put a `no-drag` button inside it.
        // Yes! That's the standard Electron way.
        // Make the bubble `drag`, but the icon inside `no-drag`.
    }, []);

    const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    // ----- CRUD Logic -----
    const handleSavePrompt = async () => {
        if (!editorData.title.trim() || !editorData.content.trim()) return;

        if (editorMode === 'create') {
            const newPrompt = {
                title: editorData.title,
                content: editorData.content,
                tags: [],
                isFavorite: false,
                isPinned: false,
                folderId: null,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                versions: []
            };
            await apiClient.createPrompt(newPrompt);
        } else if (editorMode === 'edit' && editorData.id) {
            await apiClient.updatePrompt(editorData.id, {
                title: editorData.title,
                content: editorData.content
            });
        }

        setEditorMode(null);
        setEditorData({ title: '', content: '', id: '' });
        loadData();
    };

    const handleDeletePrompt = async (id: string) => {
        if (confirm('Are you sure you want to delete this prompt?')) {
            await apiClient.deletePrompt(id);
            loadData();
        }
    };

    const startCreate = () => {
        setEditorMode('create');
        setEditorData({ title: '', content: '', id: '' });
    };

    const startEdit = (prompt: Prompt) => {
        setEditorMode('edit');
        setEditorData({ title: prompt.title, content: prompt.content, id: prompt.id });
    };

    const handleCopy = useCallback(async (prompt: Prompt) => {
        const variables = extractVariables(prompt.content);

        if (variables.length > 0) {
            const initialValues: Record<string, string> = {};
            variables.forEach(v => {
                initialValues[v.name] = v.defaultValue || '';
            });
            setVariableValues(initialValues);
            setVariableModal({ open: true, prompt });
        } else {
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
            // The container is draggable, the button inside captures clicks
            <div className="bubble-container">
                <button className="bubble-button" onClick={() => handleExpand(true)}>
                    <span className="bubble-icon">💬</span>
                </button>
            </div>
        );
    }

    // ----- Render Editor -----
    if (editorMode) {
        return (
            <div className="panel">
                <div className="panel-header">
                    <span className="panel-title">
                        {editorMode === 'create' ? '✨ New Prompt' : '✏️ Edit Prompt'}
                    </span>
                    <div className="panel-actions">
                        <button className="icon-btn" onClick={() => setEditorMode(null)}>✕</button>
                    </div>
                </div>
                <div className="editor-panel">
                    <input
                        className="editor-input title"
                        placeholder="Prompt Title"
                        value={editorData.title}
                        onChange={e => setEditorData(prev => ({ ...prev, title: e.target.value }))}
                        autoFocus
                    />
                    <textarea
                        className="editor-input content"
                        placeholder="Enter your prompt content... (use {{variable}} for dynamic fields)"
                        value={editorData.content}
                        onChange={e => setEditorData(prev => ({ ...prev, content: e.target.value }))}
                    />
                    <div className="editor-footer">
                        <button className="save-btn" onClick={handleSavePrompt}>
                            {editorMode === 'create' ? 'Create Prompt' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
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
                        <button className="icon-btn" onClick={() => setVariableModal({ open: false, prompt: null })}>✕</button>
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
                        <button className="icon-btn" onClick={() => setShowSettings(false)}>✕</button>
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
                    <button className="save-btn" onClick={handleSaveSettings}>Save Settings</button>
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
                    <button className="icon-btn" onClick={startCreate} title="New Prompt">➕</button>
                    <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings">⚙️</button>
                    <button className="icon-btn" onClick={() => handleExpand(false)} title="Collapse">✕</button>
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
                    <div className="loading"><div className="spinner"></div></div>
                ) : filteredPrompts.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">📭</span>
                        <p>{searchQuery ? 'No matching prompts' : 'No prompts yet'}</p>
                        <button className="save-btn" style={{ marginTop: 10 }} onClick={startCreate}>Create First Prompt</button>
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
                                        onEdit={startEdit}
                                        onDelete={handleDeletePrompt}
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
                                        onEdit={startEdit}
                                        onDelete={handleDeletePrompt}
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
                <button className="open-web-btn" onClick={handleOpenWebApp}>🌐 Open Full App</button>
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
    onEdit: (prompt: Prompt) => void;
    onDelete: (id: string) => void;
    isCopied: boolean;
}

const PromptItem: React.FC<PromptItemProps> = ({ prompt, onCopy, onEdit, onDelete, isCopied }) => {
    const hasVariables = extractVariables(prompt.content).length > 0;

    return (
        <div className="prompt-item group">
            <div className="prompt-info" onClick={() => onCopy(prompt)}>
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
            <div className="prompt-actions">
                <button className="action-btn edit" onClick={(e) => { e.stopPropagation(); onEdit(prompt); }} title="Edit">
                    ✏️
                </button>
                <button className="action-btn delete" onClick={(e) => { e.stopPropagation(); onDelete(prompt.id); }} title="Delete">
                    🗑️
                </button>
                <button
                    className={`copy-btn ${isCopied ? 'copied' : ''}`}
                    onClick={e => { e.stopPropagation(); onCopy(prompt); }}
                    title="Copy"
                >
                    {isCopied ? '✓' : '📋'}
                </button>
            </div>
        </div>
    );
};

export default App;
