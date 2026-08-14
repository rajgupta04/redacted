import React, { useRef, useState } from 'react';

export default function UploadZone({ onFileSelect }) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.docx')) {
        onFileSelect(file);
      }
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
      <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#f8fafc', marginBottom: '0.5rem' }}>
        Upload Word Document
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '2rem' }}>
        Select or drop any Microsoft Word (<code style={{ color: '#e63946', background: 'rgba(230,57,70,0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>.docx</code>) file to scan for PII.
      </p>

      {/* Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        style={{
          border: isDragOver ? '2px dashed #e63946' : '2px dashed rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          padding: '3.5rem 2rem',
          background: isDragOver ? 'rgba(230, 57, 70, 0.05)' : 'rgba(255, 255, 255, 0.015)',
          cursor: 'pointer',
          transition: 'all 0.25s ease',
          boxShadow: isDragOver ? '0 0 30px rgba(230, 57, 70, 0.2)' : 'none'
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept=".docx"
          onChange={(e) => e.target.files && e.target.files[0] && onFileSelect(e.target.files[0])}
          style={{ display: 'none' }}
        />

        {/* Upload Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          margin: '0 auto 1.25rem',
          borderRadius: '50%',
          background: 'rgba(230, 57, 70, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(230, 57, 70, 0.3)',
          color: '#e63946'
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#f8fafc', marginBottom: '0.4rem' }}>
          Drag & Drop your <span style={{ color: '#e63946' }}>.docx</span> file here
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
          or click to browse from your computer
        </p>
      </div>

      {/* Feature Highlights */}
      <div style={{
        marginTop: '2.5rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1.5rem',
        textAlign: 'left'
      }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ color: '#e63946', fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
            ⚡ Run-Level XML Redaction
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Preserves bold, italic, font styles, colors, and layout structure intact.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ color: '#e63946', fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
            🔒 Deterministic Consistency
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Same original entity always maps to the same realistic fake replacement.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ color: '#e63946', fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
            🤝 Relational Faking
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Names and emails stay linked intelligently (e.g. John Doe &rarr; john.doe@email.com).
          </p>
        </div>
      </div>
    </div>
  );
}
