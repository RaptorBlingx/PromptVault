import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import { Sidebar } from './components/Sidebar';
import { DetailView } from './components/DetailView';
import { PromptCard } from './components/PromptCard';
import { ToastContainer } from './components/Toast';
import { CommandPalette, useCommandPalette } from './components/CommandPalette';
import { VariableModal } from './components/VariableModal';
import { Icons } from './components/Icon';
import {
  Prompt,
  Folder,
  ViewState,
  ToastNotification,
  SortOption,
  createDefaultPrompt,
  createDefaultFolder,
  extractVariables,
} from './types';
import {
  loadPrompts,
  savePrompts,
  loadFolders,
  saveFolders,
  loadPromptsAsync,
  savePromptAsync,
  deletePromptAsync,
  loadFoldersAsync,
  saveFolderAsync,
  deleteFolderAsync,
  migrateLocalStorageToApi,
  duplicatePrompt,
  exportData,
  importData,
  importDataToApi,
} from './services/storageService';
import {
  startConnectionMonitoring,
  stopConnectionMonitoring,
  onConnectionStatusChange,
  ConnectionStatus,
} from './services/apiService';

// ----- Folder Modal -----
interface FolderModalProps {
  folder?: Folder | null;
  onSave: (name: string, icon: string) => void;
  onClose: () => void;
}

const FolderModal: React.FC<FolderModalProps> = ({ folder, onSave, onClose }) => {
  const [name, setName] = useState(folder?.name || '');
  const [icon, setIcon] = useState(folder?.icon || '📁');
  const icons = ['📁', '📂', '🗂️', '💼', '📚', '🎯', '⚡', '🔥', '💡', '🚀', '🎨', '🔧', '📝', '💻', '🌐'];

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="modal animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, margin: 0 }}>
            {folder ? 'Edit Folder' : 'New Folder'}
          </h3>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{
              display: 'block',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              marginBottom: 'var(--space-2)',
            }}>
              Folder Name
            </label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Folder"
              autoFocus
            />
          </div>
          <div>
            <label style={{
              display: 'block',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              marginBottom: 'var(--space-2)',
            }}>
              Icon
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {icons.map(i => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  style={{
                    width: 40,
                    height: 40,
                    fontSize: 20,
                    background: icon === i ? 'var(--color-accent-bg)' : 'var(--color-bg-tertiary)',
                    border: icon === i ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                  }}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => { onSave(name, icon); onClose(); }}
            disabled={!name.trim()}
          >
            {folder ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ----- Main App Content -----
const AppContent: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const commandPalette = useCommandPalette();

  // State
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeView, setActiveView] = useState<ViewState>('LIST');
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.NEWEST);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');

  // Modals
  const [folderModal, setFolderModal] = useState<{ isOpen: boolean; folder?: Folder | null }>({ isOpen: false });
  const [variableModal, setVariableModal] = useState<{ isOpen: boolean; content: string }>({ isOpen: false, content: '' });

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Try to migrate old localStorage data first
        await migrateLocalStorageToApi();

        // Load from API
        const [loadedPrompts, loadedFolders] = await Promise.all([
          loadPromptsAsync(),
          loadFoldersAsync(),
        ]);
        setPrompts(loadedPrompts);
        setFolders(loadedFolders);
      } catch (error) {
        console.error('Failed to load data from API:', error);
        // Fall back to cache
        setPrompts(loadPrompts());
        setFolders(loadFolders());
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Start connection monitoring
    startConnectionMonitoring(30000);
    const unsubscribe = onConnectionStatusChange(setConnectionStatus);

    return () => {
      stopConnectionMonitoring();
      unsubscribe();
    };
  }, []);

  // Persist to cache (for offline access)
  useEffect(() => { savePrompts(prompts); }, [prompts]);
  useEffect(() => { saveFolders(folders); }, [folders]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleCreatePrompt();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && isEditing) {
        e.preventDefault();
        // Save is handled by DetailView
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleCreatePrompt = useCallback(async () => {
    const newPrompt = createDefaultPrompt(selectedFolderId);
    setPrompts(prev => [newPrompt, ...prev]);
    setSelectedPromptId(newPrompt.id);
    setIsEditing(true);
    setActiveView('LIST');

    // Save to API in background
    try {
      await savePromptAsync(newPrompt);
    } catch (error) {
      console.error('Failed to save new prompt to API:', error);
    }
  }, [selectedFolderId]);

  const handleUpdatePrompt = useCallback(async (updated: Prompt) => {
    setPrompts(prev => prev.map(p => p.id === updated.id ? updated : p));

    // Save to API in background
    try {
      await savePromptAsync(updated);
    } catch (error) {
      console.error('Failed to update prompt in API:', error);
      addToast('Failed to sync changes', 'error');
    }
  }, [addToast]);

  const handleDeletePrompt = useCallback(async (id: string) => {
    if (window.confirm('Delete this prompt?')) {
      setPrompts(prev => prev.filter(p => p.id !== id));
      if (selectedPromptId === id) setSelectedPromptId(null);
      addToast('Prompt deleted', 'info');

      // Delete from API in background
      try {
        await deletePromptAsync(id);
      } catch (error) {
        console.error('Failed to delete prompt from API:', error);
      }
    }
  }, [selectedPromptId, addToast]);

  const handleToggleFavorite = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPrompts(prev => prev.map(p =>
      p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
    ));
  }, []);

  const handleTogglePin = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPrompts(prev => prev.map(p =>
      p.id === id ? { ...p, isPinned: !p.isPinned } : p
    ));
  }, []);

  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    addToast('Copied to clipboard!', 'success');
  }, [addToast]);

  const handleCopyWithVariables = useCallback((content: string) => {
    const vars = extractVariables(content);
    if (vars.length > 0) {
      setVariableModal({ isOpen: true, content });
    } else {
      handleCopy(content);
    }
  }, [handleCopy]);

  const handleDuplicate = useCallback((prompt: Prompt) => {
    const dup = duplicatePrompt(prompt);
    setPrompts(prev => [dup, ...prev]);
    setSelectedPromptId(dup.id);
    addToast('Prompt duplicated', 'success');
  }, [addToast]);

  // Folder handlers
  const handleCreateFolder = useCallback(() => {
    setFolderModal({ isOpen: true, folder: null });
  }, []);

  const handleSaveFolder = useCallback(async (name: string, icon: string) => {
    if (folderModal.folder) {
      const updatedFolder = { ...folderModal.folder, name, icon };
      setFolders(prev => prev.map(f =>
        f.id === folderModal.folder!.id ? updatedFolder : f
      ));
      // Update in API
      try {
        await saveFolderAsync(updatedFolder);
      } catch (error) {
        console.error('Failed to update folder in API:', error);
      }
    } else {
      const newFolder = { ...createDefaultFolder(name), icon };
      setFolders(prev => [...prev, newFolder]);
      // Save to API
      try {
        await saveFolderAsync(newFolder);
      } catch (error) {
        console.error('Failed to save folder to API:', error);
      }
    }
    addToast(folderModal.folder ? 'Folder updated' : 'Folder created', 'success');
  }, [folderModal.folder, addToast]);

  const handleDeleteFolder = useCallback(async (folderId: string) => {
    if (window.confirm('Delete this folder? Prompts will be moved to "No Folder".')) {
      setFolders(prev => prev.filter(f => f.id !== folderId));
      setPrompts(prev => prev.map(p =>
        p.folderId === folderId ? { ...p, folderId: null } : p
      ));
      if (selectedFolderId === folderId) setSelectedFolderId(null);
      addToast('Folder deleted', 'info');

      // Delete from API
      try {
        await deleteFolderAsync(folderId);
      } catch (error) {
        console.error('Failed to delete folder from API:', error);
      }
    }
  }, [selectedFolderId, addToast]);

  // Filter & Sort
  const filteredPrompts = useMemo(() => {
    let result = prompts;

    // Folder filter
    if (selectedFolderId) {
      result = result.filter(p => p.folderId === selectedFolderId);
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Sort - pinned always first
    result = [...result].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;

      if (sortOption === SortOption.NEWEST) return b.updatedAt - a.updatedAt;
      if (sortOption === SortOption.OLDEST) return a.updatedAt - b.updatedAt;
      if (sortOption === SortOption.AZ) return a.title.localeCompare(b.title);
      return 0;
    });

    return result;
  }, [prompts, searchQuery, sortOption, selectedFolderId]);

  const selectedPrompt = useMemo(() =>
    prompts.find(p => p.id === selectedPromptId) || null
    , [prompts, selectedPromptId]);

  const pinnedCount = useMemo(() => prompts.filter(p => p.isPinned).length, [prompts]);
  const favoritesCount = useMemo(() => prompts.filter(p => p.isFavorite).length, [prompts]);

  // ----- Settings View -----
  const renderSettings = () => (
    <div style={{
      flex: 1,
      padding: 'var(--space-8)',
      background: 'var(--color-bg-primary)',
      overflowY: 'auto',
    }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h2 style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: 700,
          marginBottom: 'var(--space-6)',
        }}>
          Settings
        </h2>

        {/* Data Management */}
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <h3 style={{
            fontSize: 'var(--text-base)',
            fontWeight: 600,
            marginBottom: 'var(--space-3)',
          }}>
            Data Management
          </h3>
          <p style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-4)',
          }}>
            Export your prompts and folders or import from a backup.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                const data = exportData(prompts, folders);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `promptvault-backup-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                addToast('Export complete', 'success');
              }}
            >
              <Icons.Download size={16} />
              Export JSON
            </button>
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              <Icons.Upload size={16} />
              Import JSON
              <input
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const result = importData(ev.target?.result as string);
                    if (result) {
                      setPrompts(result.prompts);
                      setFolders(result.folders);
                      addToast(`Imported ${result.prompts.length} prompts`, 'success');
                    } else {
                      addToast('Import failed', 'error');
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
              />
            </label>
            <button
              className="btn btn-danger"
              onClick={() => {
                if (window.confirm('Clear ALL data? This cannot be undone.')) {
                  setPrompts([]);
                  setFolders([]);
                  localStorage.clear();
                  addToast('All data cleared', 'info');
                }
              }}
            >
              <Icons.Trash2 size={16} />
              Clear All
            </button>
          </div>
        </div>

        {/* About */}
        <div className="card">
          <h3 style={{
            fontSize: 'var(--text-base)',
            fontWeight: 600,
            marginBottom: 'var(--space-3)',
          }}>
            About
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            <strong>PromptVault Pro</strong> v2.0
          </p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
            SOTA Prompt Management System
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100%',
      overflow: 'hidden',
    }}>
      <Sidebar
        activeView={activeView}
        onChangeView={(view) => {
          if (view === 'CREATE') {
            handleCreatePrompt();
          } else {
            setActiveView(view);
          }
        }}
        totalPrompts={prompts.length}
        favoritesCount={favoritesCount}
        pinnedCount={pinnedCount}
        folders={folders}
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
        onCreateFolder={handleCreateFolder}
        onEditFolder={(folder) => setFolderModal({ isOpen: true, folder })}
        onDeleteFolder={handleDeleteFolder}
        onOpenCommandPalette={commandPalette.open}
      />

      {/* Main Content */}
      {activeView === 'SETTINGS' ? renderSettings() : (
        <>
          {/* List Column */}
          <div style={{
            width: 320,
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--color-bg-primary)',
          }}>
            {/* Search */}
            <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ position: 'relative' }}>
                <Icons.Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-tertiary)',
                  }}
                />
                <input
                  type="text"
                  className="input"
                  style={{ paddingLeft: 36 }}
                  placeholder="Search prompts..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 'var(--space-3)',
                padding: '0 var(--space-1)',
              }}>
                <span style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--color-text-tertiary)',
                  textTransform: 'uppercase',
                }}>
                  {filteredPrompts.length} Prompt{filteredPrompts.length !== 1 ? 's' : ''}
                </span>
                <select
                  value={sortOption}
                  onChange={e => setSortOption(e.target.value as SortOption)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  <option value={SortOption.NEWEST}>Newest</option>
                  <option value={SortOption.OLDEST}>Oldest</option>
                  <option value={SortOption.AZ}>A-Z</option>
                </select>
              </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredPrompts.length === 0 ? (
                <div className="empty-state">
                  <Icons.Inbox size={48} style={{ opacity: 0.3, marginBottom: 'var(--space-4)' }} />
                  <p className="empty-state-title">No prompts</p>
                  <p className="empty-state-description">
                    {searchQuery ? 'Try a different search' : 'Create your first prompt'}
                  </p>
                  {!searchQuery && (
                    <button
                      className="btn btn-primary"
                      style={{ marginTop: 'var(--space-4)' }}
                      onClick={handleCreatePrompt}
                    >
                      <Icons.Plus size={16} />
                      New Prompt
                    </button>
                  )}
                </div>
              ) : (
                filteredPrompts.map(prompt => (
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    isSelected={selectedPromptId === prompt.id}
                    onClick={() => {
                      setSelectedPromptId(prompt.id);
                      setIsEditing(false);
                    }}
                    onToggleFavorite={(e) => handleToggleFavorite(e, prompt.id)}
                    onTogglePin={(e) => handleTogglePin(e, prompt.id)}
                    searchQuery={searchQuery}
                  />
                ))
              )}
            </div>
          </div>

          {/* Detail View */}
          <DetailView
            prompt={selectedPrompt}
            folders={folders}
            onEdit={handleUpdatePrompt}
            onDelete={handleDeletePrompt}
            onCopy={handleCopy}
            onCopyWithVariables={handleCopyWithVariables}
            onDuplicate={handleDuplicate}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            onNotify={addToast}
          />
        </>
      )}

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
        prompts={prompts}
        folders={folders}
        onSelectPrompt={(id) => {
          setSelectedPromptId(id);
          setActiveView('LIST');
          setIsEditing(false);
        }}
        onCreatePrompt={handleCreatePrompt}
        onOpenSettings={() => setActiveView('SETTINGS')}
        onToggleTheme={() => {
          const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
          const idx = themes.indexOf(theme);
          setTheme(themes[(idx + 1) % themes.length]);
        }}
      />

      {/* Folder Modal */}
      {folderModal.isOpen && (
        <FolderModal
          folder={folderModal.folder}
          onSave={handleSaveFolder}
          onClose={() => setFolderModal({ isOpen: false })}
        />
      )}

      {/* Variable Modal */}
      {variableModal.isOpen && (
        <VariableModal
          content={variableModal.content}
          onCopy={(content) => {
            handleCopy(content);
            setVariableModal({ isOpen: false, content: '' });
          }}
          onClose={() => setVariableModal({ isOpen: false, content: '' })}
        />
      )}

      {/* Toasts */}
      <ToastContainer notifications={toasts} removeNotification={removeToast} />
    </div>
  );
};

// ----- App with Providers -----
const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;