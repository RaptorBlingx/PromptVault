import React from 'react';
import { Prompt } from '../types';
import { Icons } from './Icon';
import { copyToClipboard } from '../utils/clipboard';

interface PromptCardProps {
  prompt: Prompt;
  isSelected: boolean;
  onClick: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onTogglePin: (e: React.MouseEvent) => void;
  searchQuery?: string;
}

const Highlight: React.FC<{ text: string; query?: string }> = ({ text, query }) => {
  if (!query || !query.trim()) return <>{text}</>;

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            style={{
              background: 'var(--color-warning)',
              color: 'var(--color-text-primary)',
              borderRadius: '2px',
              padding: '0 2px',
            }}
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

export const PromptCard: React.FC<PromptCardProps> = ({
  prompt,
  isSelected,
  onClick,
  onToggleFavorite,
  onTogglePin,
  searchQuery
}) => {
  const hasVariables = /\{\{[^}]+\}\}/.test(prompt.content);

  return (
    <div
      onClick={onClick}
      className="animate-fade-in"
      style={{
        padding: 'var(--space-4)',
        borderBottom: '1px solid var(--color-border-subtle)',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        background: isSelected
          ? 'var(--color-accent-bg)'
          : 'var(--color-bg-primary)',
        borderLeft: isSelected
          ? '3px solid var(--color-accent)'
          : '3px solid transparent',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'var(--color-bg-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'var(--color-bg-primary)';
        }
      }}
    >
      {/* Pin indicator */}
      {prompt.isPinned && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          color: 'var(--color-accent)',
        }}>
          <Icons.Pin size={12} />
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-2)',
        paddingRight: 0,
      }}>
        <h3
          className="truncate"
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: isSelected
              ? 'var(--color-accent)'
              : 'var(--color-text-primary)',
            flex: 1,
            marginRight: 'var(--space-2)',
          }}
        >
          <Highlight text={prompt.title || 'Untitled Prompt'} query={searchQuery} />
        </h3>

        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={onTogglePin}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 'var(--radius-sm)',
              color: prompt.isPinned
                ? 'var(--color-accent)'
                : 'var(--color-text-muted)',
              transition: 'all var(--transition-fast)',
              opacity: prompt.isPinned ? 1 : 0,
            }}
            className="action-btn"
            title={prompt.isPinned ? "Unpin" : "Pin"}
          >
            <Icons.Pin
              size={14}
              fill={prompt.isPinned ? 'currentColor' : 'none'}
            />
          </button>
          <button
            onClick={onToggleFavorite}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 'var(--radius-sm)',
              color: prompt.isFavorite
                ? 'var(--color-warning)'
                : 'var(--color-text-muted)',
              transition: 'all var(--transition-fast)',
              opacity: prompt.isFavorite ? 1 : 0,
            }}
            className="action-btn"
            title={prompt.isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Icons.Star
              size={14}
              fill={prompt.isFavorite ? 'currentColor' : 'none'}
            />
          </button>
        </div>
      </div>

      {/* Content Preview */}
      <p
        className="line-clamp-2"
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-tertiary)',
          marginBottom: 'var(--space-3)',
          lineHeight: 1.5,
          minHeight: '2.5em',
        }}
      >
        <Highlight
          text={prompt.content || 'No content...'}
          query={searchQuery}
        />
      </p>

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        flexWrap: 'wrap',
      }}>
        {/* Tags */}
        {prompt.tags.slice(0, 2).map(tag => (
          <span
            key={tag}
            className="tag"
            style={{ fontSize: '10px' }}
          >
            <Highlight text={tag} query={searchQuery} />
          </span>
        ))}
        {prompt.tags.length > 2 && (
          <span style={{
            fontSize: '10px',
            color: 'var(--color-text-muted)'
          }}>
            +{prompt.tags.length - 2}
          </span>
        )}

        {/* Variable indicator */}
        {hasVariables && (
          <span
            className="tag tag-accent"
            style={{ fontSize: '10px' }}
            title="Contains variables"
          >
            <Icons.Zap size={10} />
            Variables
          </span>
        )}

        {/* Spacer */}
        <span style={{ flex: 1 }} />

        {/* Copy Button */}
        <button
          onClick={async (e) => {
            e.stopPropagation();
            await copyToClipboard(prompt.content);
          }}
          className="action-btn"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            color: 'var(--color-text-muted)',
            opacity: 0,
            transition: 'opacity 0.2s',
          }}
          title="Copy to clipboard"
        >
          <Icons.Copy size={12} />
        </button>

        {/* Date */}
        <span style={{
          fontSize: '10px',
          color: 'var(--color-text-muted)'
        }}>
          {new Date(prompt.updatedAt).toLocaleDateString()}
        </span>
      </div>

      <style>{`
        div:hover .action-btn {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};