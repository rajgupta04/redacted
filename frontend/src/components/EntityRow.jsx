import React from 'react';

const BADGE_STYLES = {
  PERSON: { bg: 'rgba(255, 77, 94, 0.14)', color: '#ff4d5e', border: 'rgba(255, 77, 94, 0.3)' },
  ORG: { bg: 'rgba(251, 113, 133, 0.14)', color: '#fb7185', border: 'rgba(251, 113, 133, 0.3)' },
  EMAIL: { bg: 'rgba(251, 191, 36, 0.14)', color: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)' },
  PHONE: { bg: 'rgba(52, 211, 153, 0.14)', color: '#34d399', border: 'rgba(52, 211, 153, 0.3)' },
  ADDRESS: { bg: 'rgba(129, 140, 248, 0.14)', color: '#818cf8', border: 'rgba(129, 140, 248, 0.3)' },
};

export default function EntityRow({ entity, index, replacement, onChange, isIgnored }) {
  const badgeStyle = BADGE_STYLES[entity.type] || BADGE_STYLES.ADDRESS;

  return (
    <tr
      style={{
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        opacity: isIgnored ? 0.3 : 1,
        pointerEvents: isIgnored ? 'none' : 'auto',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Type Badge */}
      <td style={{ padding: '1rem' }}>
        <span style={{
          padding: '0.3rem 0.65rem',
          borderRadius: '6px',
          fontSize: '0.75rem',
          fontWeight: '700',
          letterSpacing: '0.5px',
          background: badgeStyle.bg,
          color: badgeStyle.color,
          border: `1px solid ${badgeStyle.border}`,
          display: 'inline-block'
        }}>
          {entity.type}
        </span>
      </td>

      {/* Original Text */}
      <td style={{ padding: '1rem', color: '#f8fafc', fontWeight: '500', maxWidth: '300px' }}>
        <div style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }} title={entity.original}>
          {entity.original}
        </div>
      </td>

      {/* Occurrences */}
      <td style={{ padding: '1rem' }}>
        <span style={{
          background: 'rgba(255, 255, 255, 0.06)',
          color: '#94a3b8',
          padding: '0.2rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.8rem',
          fontWeight: '600'
        }}>
          {entity.count}x
        </span>
      </td>

      {/* Custom Replacement Input */}
      <td style={{ padding: '1rem' }}>
        <input
          type="text"
          value={replacement}
          onChange={(e) => onChange(index, e.target.value)}
          disabled={isIgnored}
          style={{
            width: '100%',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            padding: '0.5rem 0.75rem',
            color: '#f8fafc',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            outline: 'none',
            transition: 'all 0.2s ease'
          }}
          onFocus={(e) => (e.target.style.borderColor = '#e63946')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
        />
      </td>
    </tr>
  );
}
