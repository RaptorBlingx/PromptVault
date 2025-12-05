import React, { useState, useEffect, useMemo } from 'react';
import { Prompt, Folder, extractVariables, PromptVersion } from '../types';
import { Icons } from './Icon';
import { optimizePromptContent } from '../services/geminiService';
import { createPromptVersion } from '../services/storageService';
import { copyToClipboard } from '../utils/clipboard';

interface DetailViewProps {
  prompt: Prompt | null;
  folders: Folder[];
  onEdit: (updatedPrompt: Prompt) => void;
  onDelete: (id: string) => void;
  onCopy: (content: string) => void;
  onCopyWithVariables: (content: string) => void;
  onDuplicate: (prompt: Prompt) => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  onNotify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const DetailView: React.FC<DetailViewProps> = ({
  prompt,
  folders,
  onEdit,
  onDelete,
  onCopy,
  onCopyWithVariables,
  onDuplicate,
  isEditing,
  setIsEditing,
  onNotify
}) => {
  const [formData, setFormData] = useState<Partial<Prompt>>({});
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    if (prompt) {
      setFormData({ ...prompt });
    } else {
      setFormData({
        title: '',
        content: '',
        tags: [],
        isFavorite: false,
        isPinned: false,
        folderId: null,
      });
    }
    setTagInput('');
    setShowVersions(false);
  }, [prompt]);

  const variables = useMemo(() =>
    extractVariables(formData.content || ''),
    [formData.content]
  );

  const wordCount = useMemo(() => {
    const content = formData.content || '';
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const chars = content.length;
    return { words, chars };
  }, [formData.content]);

  if (!prompt && !isEditing) {
    return (
      <div
        className="empty-state"
        style={{
          flex: 1,
          background: 'var(--color-bg-primary)',
        }}
      >
        <div className="empty-state-icon">
          <Icons.FileText size={64} />
        </div>
        <p className="empty-state-title">Select a prompt</p>
        <p className="empty-state-description">
          Choose a prompt from the list to view or edit it, or create a new one.
        </p>
      </div>
    );
  }

  const handleSave = () => {
    if (!formData.title || !formData.content) {
      onNotify('Title and Content are required', 'error');
      return;
    }

    // Create version before saving
    const promptWithVersion = prompt?.content !== formData.content
      ? createPromptVersion({ ...prompt!, ...formData as Prompt })
      : { ...prompt!, ...formData as Prompt };

    const updatedPrompt: Prompt = {
      ...promptWithVersion,
      updatedAt: Date.now(),
      id: prompt?.id || Date.now().toString(),
    };

    onEdit(updatedPrompt);
    setIsEditing(false);
    onNotify('Prompt saved successfully', 'success');
  };

  const handleOptimize = async () => {
    if (!formData.content) return;
    setIsOptimizing(true);
    try {
      const optimized = await optimizePromptContent(formData.content);
      setFormData(prev => ({ ...prev, content: optimized }));
      onNotify('Prompt optimized by Gemini!', 'success');
    } catch (e) {
      onNotify('Failed to optimize. Check API key.', 'error');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!formData.tags?.includes(tagInput.trim())) {
        setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] }));
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags?.filter(t => t !== tagToRemove) }));
  };

  const handleCopy = async () => {
    if (!prompt?.content) return;

    if (variables.length > 0) {
      onCopyWithVariables(prompt.content);
    } else {
      const success = await copyToClipboard(prompt.content);
      if (success) {
        onNotify('Copied to clipboard!', 'success');
      } else {
        onNotify('Failed to copy', 'error');
      }
    }
  };

  const restoreVersion = (version: PromptVersion) => {
    setFormData(prev => ({
      ...prev,
      title: version.title,
      content: version.content,
    }));
    setShowVersions(false);
    setIsEditing(true);
    onNotify('Version restored. Save to apply changes.', 'info');
  };

  // ----- EDITING VIEW -----
  if (isEditing) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-bg-primary)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-4) var(--space-6)',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg-primary)',
        }}>
          <input
            type="text"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            placeholder="Prompt Title"
            style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              flex: 1,
              marginRight: 'var(--space-4)',
            }}
          />
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              onClick={() => setIsEditing(false)}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary"
            >
              <Icons.Save size={16} />
              Save
            </button>
          </div>
        </div>

        {/* Editor Body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--space-6)',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>

            {/* Folder & Options */}
            <div style={{
              display: 'flex',
              gap: 'var(--space-4)',
              marginBottom: 'var(--space-4)',
              flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--color-text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 'var(--space-1)',
                }}>
                  Folder
                </label>
                <select
                  className="input"
                  value={formData.folderId || ''}
                  onChange={e => setFormData({ ...formData, folderId: e.target.value || null })}
                >
                  <option value="">No Folder</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
                <button
                  onClick={() => setFormData(prev => ({ ...prev, isPinned: !prev.isPinned }))}
                  className={`btn ${formData.isPinned ? 'btn-primary' : 'btn-secondary'}`}
                  title="Pin to top"
                >
                  <Icons.Pin size={16} />
                </button>
                <button
                  onClick={() => setFormData(prev => ({ ...prev, isFavorite: !prev.isFavorite }))}
                  className={`btn ${formData.isFavorite ? 'btn-primary' : 'btn-secondary'}`}
                  title="Add to favorites"
                  style={{ color: formData.isFavorite ? 'var(--color-warning)' : undefined }}
                >
                  <Icons.Star size={16} fill={formData.isFavorite ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>

            {/* Tags Input */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label style={{
                display: 'block',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 'var(--space-1)',
              }}>
                Tags
              </label>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--space-2)',
                padding: 'var(--space-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-secondary)',
              }}>
                {formData.tags?.map(tag => (
                  <span key={tag} className="tag">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        marginLeft: 4,
                        color: 'inherit',
                      }}
                    >
                      <Icons.X size={12} />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Add tag..."
                  style={{
                    flex: 1,
                    minWidth: 100,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>
            </div>

            {/* Content */}
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-2)',
              }}>
                <label style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--color-text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Content
                </label>
                <button
                  onClick={handleOptimize}
                  disabled={isOptimizing || !formData.content}
                  className="btn btn-ghost"
                  style={{
                    fontSize: 'var(--text-xs)',
                    padding: 'var(--space-1) var(--space-2)',
                    color: 'var(--color-accent)',
                  }}
                >
                  <Icons.Sparkles size={14} />
                  {isOptimizing ? 'Optimizing...' : 'AI Optimize'}
                </button>
              </div>
              <textarea
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your prompt here... Use {{variable_name}} for dynamic values."
                className="input textarea"
                style={{
                  minHeight: '400px',
                  fontFamily: 'var(--font-mono)',
                }}
              />
            </div>

            {/* Variables Preview */}
            {variables.length > 0 && (
              <div style={{
                marginTop: 'var(--space-4)',
                padding: 'var(--space-3)',
                background: 'var(--color-accent-bg)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-accent-border)',
              }}>
                <p style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--color-accent)',
                  marginBottom: 'var(--space-2)',
                }}>
                  <Icons.Zap size={12} style={{ marginRight: 4 }} />
                  {variables.length} Variable{variables.length !== 1 ? 's' : ''} Detected
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {variables.map(v => (
                    <span key={v.name} className="variable-highlight">
                      {`{{${v.name}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Word Count Footer */}
        <div className="word-count">
          <span><Icons.Type size={12} /> {wordCount.words} words</span>
          <span><Icons.Hash size={12} /> {wordCount.chars} characters</span>
        </div>
      </div>
    );
  }

  // ----- READ VIEW -----
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--color-bg-primary)',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-4) var(--space-6)',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {prompt?.isPinned && (
            <Icons.Pin size={16} style={{ color: 'var(--color-accent)' }} />
          )}
          <h2 style={{
            fontSize: 'var(--text-xl)',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}>
            {prompt?.title}
          </h2>
          {prompt?.isFavorite && (
            <Icons.Star size={16} fill="currentColor" style={{ color: 'var(--color-warning)' }} />
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          <button
            onClick={handleCopy}
            className="btn btn-primary"
            title={variables.length > 0 ? 'Copy with variables' : 'Copy to clipboard'}
          >
            <Icons.Copy size={16} />
            {variables.length > 0 ? 'Smart Copy' : 'Copy'}
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="btn btn-ghost btn-icon"
            title="Edit"
          >
            <Icons.Edit2 size={18} />
          </button>
          <button
            onClick={() => prompt && onDuplicate(prompt)}
            className="btn btn-ghost btn-icon"
            title="Duplicate"
          >
            <Icons.Copy size={18} />
          </button>
          {prompt?.versions && prompt.versions.length > 0 && (
            <button
              onClick={() => setShowVersions(!showVersions)}
              className={`btn btn-ghost btn-icon ${showVersions ? 'btn-secondary' : ''}`}
              title="Version history"
            >
              <Icons.History size={18} />
            </button>
          )}
          <button
            onClick={() => prompt && onDelete(prompt.id)}
            className="btn btn-ghost btn-icon"
            style={{ color: 'var(--color-error)' }}
            title="Delete"
          >
            <Icons.Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 'var(--space-6)',
        display: 'flex',
        gap: 'var(--space-6)',
      }}>
        <div style={{ flex: 1, maxWidth: '800px', margin: '0 auto' }}>
          {/* Tags */}
          {prompt?.tags && prompt.tags.length > 0 && (
            <div style={{
              display: 'flex',
              gap: 'var(--space-2)',
              marginBottom: 'var(--space-4)',
              flexWrap: 'wrap',
            }}>
              {prompt.tags.map(tag => (
                <span key={tag} className="tag">#{tag}</span>
              ))}
            </div>
          )}

          {/* Variables indicator */}
          {variables.length > 0 && (
            <div style={{
              marginBottom: 'var(--space-4)',
              padding: 'var(--space-3)',
              background: 'var(--color-accent-bg)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-accent-border)',
            }}>
              <p style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
              }}>
                <Icons.Zap size={16} />
                This prompt contains {variables.length} variable{variables.length !== 1 ? 's' : ''}.
                Click "Smart Copy" to fill them in.
              </p>
            </div>
          )}

          {/* Content Card */}
          <div
            className="card"
            style={{
              position: 'relative',
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onClick={handleCopy}
            onDoubleClick={() => setIsEditing(true)}
            title="Click to copy, Double-click to edit"
          >
            <pre style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-primary)',
              lineHeight: 1.7,
              margin: 0,
            }}>
              {prompt?.content}
            </pre>
          </div>

          {/* Metadata */}
          <div style={{
            marginTop: 'var(--space-6)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-tertiary)',
          }}>
            <span>Created: {new Date(prompt!.createdAt).toLocaleString()}</span>
            <span>Updated: {new Date(prompt!.updatedAt).toLocaleString()}</span>
          </div>
        </div>

        {/* Version History Panel */}
        {showVersions && prompt?.versions && prompt.versions.length > 0 && (
          <div style={{
            width: 280,
            background: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            height: 'fit-content',
            position: 'sticky',
            top: 'var(--space-4)',
          }}>
            <h4 style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-3)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}>
              <Icons.History size={16} />
              Version History
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {prompt.versions.map((v, i) => (
                <div
                  key={v.id}
                  className="card"
                  style={{
                    padding: 'var(--space-3)',
                    cursor: 'pointer',
                  }}
                  onClick={() => restoreVersion(v)}
                >
                  <p style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 500,
                    color: 'var(--color-text-primary)',
                    marginBottom: 4,
                  }}>
                    {i === 0 ? 'Previous' : `Version ${prompt.versions.length - i}`}
                  </p>
                  <p style={{
                    fontSize: '10px',
                    color: 'var(--color-text-tertiary)',
                  }}>
                    {new Date(v.savedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};