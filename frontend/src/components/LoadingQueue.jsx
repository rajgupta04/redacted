import React from 'react';

export default function LoadingQueue({ jobStatus }) {
  const { status, position, progress, estSeconds } = jobStatus;

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      {/* Pulse Loader Ring */}
      <div style={{ position: 'relative', width: '90px', height: '90px', margin: '0 auto 2rem' }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '2px solid rgba(230, 57, 70, 0.2)',
          animation: 'pulseGlow 2s infinite ease-in-out'
        }} />
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          border: '3px solid transparent',
          borderTopColor: '#e63946',
          borderRightColor: '#e63946',
          animation: 'spin 1.2s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite'
        }} />
        <div style={{
          position: 'absolute',
          inset: '15px',
          borderRadius: '50%',
          background: 'rgba(230, 57, 70, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#e63946',
          fontWeight: '700',
          fontSize: '1.2rem'
        }}>
          AI
        </div>
      </div>

      {/* Title */}
      <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f8fafc', marginBottom: '0.5rem' }}>
        {status === 'queued' ? 'Waiting in Server Queue...' : 'Processing Document...'}
      </h3>

      <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '2rem', minHeight: '3rem' }}>
        {progress || 'Running AI Entity Detection on paragraphs and tables...'}
      </p>

      {/* Queue Info Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
        background: 'rgba(0, 0, 0, 0.2)',
        padding: '1.25rem',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Queue Position
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#f8fafc', marginTop: '0.2rem' }}>
            {position > 1 ? `#${position}` : 'Active'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Est. Wait Time
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#e63946', marginTop: '0.2rem' }}>
            ~{estSeconds} sec
          </div>
        </div>
      </div>
    </div>
  );
}
