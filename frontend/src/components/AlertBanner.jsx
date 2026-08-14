import React from 'react';

export default function AlertBanner({ alert, onClose }) {
  if (!alert) return null;

  const isSuccess = alert.type === 'success';

  return (
    <div
      style={{
        marginBottom: '1.5rem',
        padding: '0.9rem 1.25rem',
        borderRadius: '10px',
        background: isSuccess ? 'rgba(16, 185, 129, 0.12)' : 'rgba(230, 57, 70, 0.12)',
        border: `1px solid ${isSuccess ? 'rgba(16, 185, 129, 0.3)' : 'rgba(230, 57, 70, 0.3)'}`,
        color: isSuccess ? '#34d399' : '#ff4d5e',
        fontSize: '0.9rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span>{isSuccess ? '✓' : '⚠️'}</span>
        <span>{alert.message}</span>
      </div>

      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          fontSize: '1rem',
          opacity: 0.7
        }}
      >
        ✕
      </button>
    </div>
  );
}
