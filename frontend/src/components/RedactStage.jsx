import React, { useRef, useState, useEffect } from 'react';

const loadingVideo = '/loading.mp4';

export default function RedactStage({
  progress,
  isCompleted,
  onDownload,
  onBackToDashboard,
  onStartNewUpload,
}) {
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  useEffect(() => {
    if (!isCompleted && videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch(() => {
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play();
        }
      });
    }
  }, [isCompleted, isMuted]);

  const toggleSound = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      const nextState = !isMuted;
      videoRef.current.muted = nextState;
      setIsMuted(nextState);
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '3.5rem 2rem', textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
      {!isCompleted ? (
        <>
          {/* High-Tech Redaction Video Frame with Slow Internet Fallback */}
          <div style={{
            position: 'relative',
            width: '100%',
            height: '250px',
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
            {/* Slow Internet Buffering Fallback Loader */}
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
              <source src={loadingVideo} type="video/mp4" />
            </video>
            
            {/* Ambient Overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at center, transparent 40%, rgba(10, 11, 16, 0.6) 100%)',
              pointerEvents: 'none'
            }} />

            {/* Audio Mute/Unmute Toggle */}
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

          <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f8fafc', marginBottom: '0.5rem' }}>
            Redacting Document...
          </h3>

          <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            {progress || 'Applying replacements to paragraphs, tables, and XML runs...'}
          </p>
        </>
      ) : (
        /* Completed State: Download Screen */
        <div className="animate-fade-in">
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 1.5rem',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '2px solid rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#34d399',
            fontSize: '2.5rem',
            boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)'
          }}>
            ✓
          </div>

          <h3 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#f8fafc', marginBottom: '0.5rem' }}>
            Redaction Completed Successfully!
          </h3>

          <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '2.5rem', maxWidth: '480px', margin: '0 auto 2.5rem' }}>
            Your document has been redacted while preserving 100% of Word formatting, styles, and tables. Click below to download your file.
          </p>

          {/* Download Button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={onDownload}
              className="btn-primary"
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                boxShadow: '0 6px 25px rgba(230, 57, 70, 0.4)'
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Redacted Document
            </button>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button onClick={onBackToDashboard} className="btn-secondary" style={{ fontSize: '0.9rem' }}>
                &larr; Back to Entity Table
              </button>

              <button onClick={onStartNewUpload} className="btn-secondary" style={{ fontSize: '0.9rem' }}>
                Upload Another File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
