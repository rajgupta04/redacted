import React from 'react';
import loadingVideo from '../assets/loading.mp4';

export default function LoadingQueue({ jobStatus }) {
  const { status, position, progress, estSeconds } = jobStatus;
  const isOverdue = estSeconds <= 0;

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
      {/* High-Tech Redaction Video Frame (Cropped to hide VEO watermark & side silhouettes) */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '240px',
        margin: '0 auto 1.5rem',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid rgba(230, 57, 70, 0.4)',
        boxShadow: '0 0 30px rgba(230, 57, 70, 0.25)',
        background: '#0a0b10'
      }}>
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            width: '125%',
            height: '125%',
            objectFit: 'cover',
            position: 'absolute',
            top: '-12.5%',
            left: '-12.5%',
            filter: 'contrast(1.05) brightness(1.02)'
          }}
        >
          <source src={loadingVideo} type="video/mp4" />
        </video>
        
        {/* Ambient Redaction Overlay Glow */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, transparent 40%, rgba(10, 11, 16, 0.6) 100%)',
          pointerEvents: 'none'
        }} />
      </div>

      {/* Title */}
      <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f8fafc', marginBottom: '0.5rem' }}>
        {status === 'queued' ? 'Waiting in Server Queue...' : 'Processing Document...'}
      </h3>

      {/* Progress Description & Overdue Notice */}
      <p style={{
        color: isOverdue ? '#fbbf24' : '#94a3b8',
        fontSize: '0.95rem',
        marginBottom: '2rem',
        minHeight: '3rem',
        fontWeight: isOverdue ? '600' : '400',
        transition: 'all 0.3s ease'
      }}>
        {isOverdue
          ? '⚠️ It is taking longer than expected, please wait a while...'
          : (progress || 'Running AI Entity Detection on paragraphs and tables...')}
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
          <div style={{
            fontSize: '1.4rem',
            fontWeight: '700',
            color: isOverdue ? '#fbbf24' : '#e63946',
            marginTop: '0.2rem'
          }}>
            {isOverdue ? 'Finalizing...' : `~${estSeconds} sec`}
          </div>
        </div>
      </div>
    </div>
  );
}
