import React, { useState } from 'react';
import EntityRow from './EntityRow';

export default function Dashboard({
  filename,
  entities,
  replacements,
  onReplacementChange,
  ignoredTypes,
  onIgnoredTypesChange,
  onOpenResetModal,
  onSubmitRedaction,
  isRedacting,
  redactionProgress
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Stats calculation
  let total = 0;
  let person = 0;
  let org = 0;
  let structured = 0;

  entities.forEach((ent) => {
    total += ent.count;
    if (ent.type === 'PERSON') person += ent.count;
    else if (ent.type === 'ORG') org += ent.count;
    else structured += ent.count;
  });

  const CATEGORIES = ['PERSON', 'ORG', 'EMAIL', 'PHONE', 'ADDRESS'];

  const toggleCategoryIgnore = (cat) => {
    if (ignoredTypes.includes(cat)) {
      onIgnoredTypesChange(ignoredTypes.filter((c) => c !== cat));
    } else {
      onIgnoredTypesChange([...ignoredTypes, cat]);
    }
  };

  // Filter entities based on search, type filter, and ignored list
  const filteredEntities = entities.filter((ent) => {
    const matchesSearch = ent.original.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || ent.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Document Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Active Document
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f8fafc', marginTop: '0.1rem' }}>
            {filename}
          </h2>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Detected PII</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f8fafc', marginTop: '0.2rem' }}>{total}</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#ff4d5e', textTransform: 'uppercase' }}>People Names</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ff4d5e', marginTop: '0.2rem' }}>{person}</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#fb7185', textTransform: 'uppercase' }}>Organizations</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fb7185', marginTop: '0.2rem' }}>{org}</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#fbbf24', textTransform: 'uppercase' }}>Structured PII</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fbbf24', marginTop: '0.2rem' }}>{structured}</div>
        </div>
      </div>

      {/* Table Toolbar & Category Ignore Checkboxes */}
      <div className="glass-panel" style={{ padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              placeholder="Search detected PII text..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '0.65rem 1rem',
                color: '#f8fafc',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '0.65rem 1rem',
                color: '#f8fafc',
                fontSize: '0.9rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All PII Types</option>
              <option value="PERSON">PERSON</option>
              <option value="ORG">ORG</option>
              <option value="EMAIL">EMAIL</option>
              <option value="PHONE">PHONE</option>
              <option value="ADDRESS">ADDRESS</option>
            </select>
          </div>
        </div>

        {/* Ignore Categories Checkboxes */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          padding: '0.75rem 1rem',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '8px',
          fontSize: '0.85rem',
          color: '#94a3b8'
        }}>
          <span style={{ fontWeight: '600', color: '#f8fafc' }}>Preserve Unredacted (Ignore Category):</span>
          {CATEGORIES.map((cat) => (
            <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={ignoredTypes.includes(cat)}
                onChange={() => toggleCategoryIgnore(cat)}
                style={{ accentColor: '#e63946', cursor: 'pointer' }}
              />
              {cat}
            </label>
          ))}
        </div>
      </div>

      {/* Entities Table Panel */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0, 0, 0, 0.3)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '1rem' }}>Type</th>
                <th style={{ padding: '1rem' }}>Original PII Text</th>
                <th style={{ padding: '1rem' }}>Count</th>
                <th style={{ padding: '1rem' }}>Faked Replacement (Editable)</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntities.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem 1rem' }}>
                    No PII entities match your current search/filter.
                  </td>
                </tr>
              ) : (
                filteredEntities.map((ent, idx) => (
                  <EntityRow
                    key={idx}
                    entity={ent}
                    index={idx}
                    replacement={replacements[idx] !== undefined ? replacements[idx] : ent.suggested}
                    onChange={onReplacementChange}
                    isIgnored={ignoredTypes.includes(ent.type)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Actions Bar */}
        <div style={{
          padding: '1.25rem 2rem',
          background: 'rgba(0, 0, 0, 0.3)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button onClick={onOpenResetModal} className="btn-secondary">
            Cancel
          </button>

          <button
            onClick={onSubmitRedaction}
            disabled={isRedacting || entities.length === 0}
            className="btn-primary"
          >
            {isRedacting ? (
              <>
                <div className="spinner" />
                {redactionProgress || 'Processing...'}
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Redact & Download Document
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
