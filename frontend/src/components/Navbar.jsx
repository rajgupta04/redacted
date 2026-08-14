import React from 'react';

export default function Navbar({ simulateTraffic, setSimulateTraffic }) {
  return (
    <header className="glass-panel" style={{ padding: '1rem 2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {/* Brand Logo & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #e63946 0%, #991b1b 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '800',
          fontSize: '1.2rem',
          color: '#ffffff',
          boxShadow: '0 0 20px rgba(230, 57, 70, 0.4)',
          letterSpacing: '-0.5px'
        }}>
          PR
        </div>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f8fafc', lineHeight: 1.2 }}>
            PII Redactor
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '400' }}>
            Enterprise Format-Preserving Redaction
          </p>
        </div>
      </div>

      {/* Right Controls: Queue Toggle & Active Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* Simulate Queue Checkbox Switch */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.85rem',
          color: '#94a3b8',
          cursor: 'pointer',
          userSelect: 'none'
        }}>
          <input
            type="checkbox"
            checked={simulateTraffic}
            onChange={(e) => setSimulateTraffic(e.target.checked)}
            style={{
              accentColor: '#e63946',
              width: '16px',
              height: '16px',
              cursor: 'pointer'
            }}
          />
          Simulate Queue Load
        </label>

        {/* Engine Status Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 0.85rem',
          borderRadius: '20px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          color: '#34d399',
          fontSize: '0.75rem',
          fontWeight: '600',
          letterSpacing: '0.5px'
        }}>
          <span style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            boxShadow: '0 0 10px #10b981'
          }}></span>
          ACTIVE ENGINE
        </div>
      </div>
    </header>
  );
}
