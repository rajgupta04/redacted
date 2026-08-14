import React, { useState } from 'react';

export default function Navbar({ simulateTraffic, setSimulateTraffic }) {
  const [showConsentModal, setShowConsentModal] = useState(false);

  const handleCheckboxClick = (e) => {
    if (!simulateTraffic) {
      // User is checking the box: show consent modal
      e.preventDefault();
      setShowConsentModal(true);
    } else {
      // User is unchecking: disable immediately
      setSimulateTraffic(false);
    }
  };

  const handleConfirmEnable = () => {
    setSimulateTraffic(true);
    setShowConsentModal(false);
  };

  return (
    <>
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
              onChange={handleCheckboxClick}
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

      {/* Simulate Queue Load Explanation & Consent Overlay Modal */}
      {showConsentModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(5, 6, 10, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="glass-panel animate-fade-in" style={{
            width: '100%',
            maxWidth: '520px',
            padding: '2rem',
            border: '1px solid rgba(230, 57, 70, 0.3)',
            boxShadow: '0 0 40px rgba(230, 57, 70, 0.25)',
            background: '#12131b'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(230, 57, 70, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#e63946',
                fontSize: '1.25rem'
              }}>
                🚦
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f8fafc' }}>
                Simulate High-Traffic Server Load?
              </h3>
            </div>

            {/* Modal Body */}
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
              This mode simulates an enterprise production workload by adding <b>2 dummy heavy tasks</b> ahead of your file in the server queue.
            </p>

            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '1rem',
              fontSize: '0.85rem',
              color: '#cbd5e1',
              marginBottom: '1.75rem'
            }}>
              <div style={{ fontWeight: '600', color: '#e63946', marginBottom: '0.4rem' }}>
                ⚡ What you will see:
              </div>
              <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <li>Your file will start at <b>Queue Position #3</b> (Est. Wait: ~90 sec).</li>
                <li>Live status counts down: <b>#3 &rarr; #2 &rarr; #1 (Active)</b>.</li>
                <li>Demonstrates real-time server queue polling & estimation.</li>
              </ul>
            </div>

            {/* Modal Footer Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setShowConsentModal(false)}
                className="btn-secondary"
                style={{ fontSize: '0.88rem', padding: '0.6rem 1.25rem' }}
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmEnable}
                className="btn-primary"
                style={{ fontSize: '0.88rem', padding: '0.6rem 1.25rem' }}
              >
                Enable Simulation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
