import React from 'react';

export default function ResetModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(10, 11, 16, 0.8)',
      backdropFilter: 'blur(8px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div className="glass-panel" style={{
        padding: '2rem',
        maxWidth: '420px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
        border: '1px solid rgba(230, 57, 70, 0.3)'
      }}>
        <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#f8fafc', marginBottom: '0.75rem' }}>
          Reset Document?
        </h3>
        <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '1.75rem' }}>
          Are you sure you want to discard your current document and all detected PII entities? You will need to upload it again to start over.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '0.65rem 1.25rem' }}
          >
            Go Back
          </button>

          <button
            onClick={onConfirm}
            style={{
              background: 'rgba(230, 57, 70, 0.15)',
              color: '#ff4d5e',
              border: '1px solid rgba(230, 57, 70, 0.4)',
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#e63946';
              e.target.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(230, 57, 70, 0.15)';
              e.target.style.color = '#ff4d5e';
            }}
          >
            Yes, Reset
          </button>
        </div>
      </div>
    </div>
  );
}
