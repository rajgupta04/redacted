import React, { useRef, useState, useEffect } from 'react';
import analysingVideo from '../assets/analysing.mp4';

export default function LoadingQueue({ jobStatus }) {
  const { status, position, progress, estSeconds } = jobStatus;
  const isOverdue = estSeconds <= 0;
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch((err) => {
        console.warn('Autoplay with sound blocked by browser, falling back to muted:', err);
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play();
        }
      });
    }
  }, [isMuted]);

  const toggleSound = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      const nextState = !isMuted;
      videoRef.current.muted = nextState;
      setIsMuted(nextState);
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
      {/* High-Tech Document Analysis Video Frame with Slow Internet Fallback */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '240px',
        margin: '0 auto 1.5rem',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid rgba(230, 57, 70, 0.4)',
        boxShadow: '0 0 30px rgba(230, 57, 70, 0.25)',
        background: '#0a0b10',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Slow Internet / Buffering CSS Fallback Loader */}
        {!isVideoLoaded && (
          <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto' }}>
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
              inset: '12px',
              borderRadius: '50%',
              background: 'rgba(230, 57, 70, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#e63946',
              fontWeight: '700',
              fontSize: '1.1rem'
            }}>
              AI
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          loop
          playsInline
          onCanPlay={() => setIsVideoLoaded(true)}
          style={{
            width: '125%',
            height: '125%',
            objectFit: 'cover',
            position: 'absolute',
            top: '-12.5%',
            left: '-12.5%',
            filter: 'contrast(1.05) brightness(1.02)',
            opacity: isVideoLoaded ? 1 : 0,
            transition: 'opacity 0.5s ease'
          }}
        >
          <source src={analysingVideo} type="video/mp4" />
        </video>
        
        {/* Ambient Redaction Overlay Glow */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, transparent 40%, rgba(10, 11, 16, 0.6) 100%)',
          pointerEvents: 'none'
        }} />

        {/* Audio Mute/Unmute Overlay Button */}
        {isVideoLoaded && (
          <button
            onClick={toggleSound}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(10, 11, 16, 0.7)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f8fafc',
              cursor: 'pointer',
              zIndex: 10,
              transition: 'all 0.2s ease'
            }}
          >
            {isMuted ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e63946" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
        )}
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
