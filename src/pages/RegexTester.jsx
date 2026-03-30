import { useState } from 'react';

const styles = `
  .regex-layout {
    display: flex;
    flex-direction: column;
    gap: 24px;
    height: 100%;
  }
  .r-input {
    width: 100%;
    padding: 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    color: var(--primary);
    font-size: 16px;
    font-family: 'Fira Code', monospace;
    outline: none;
  }
  .r-input:focus { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-transparent); }
  .r-area {
    width: 100%;
    height: 300px;
    padding: 16px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    color: var(--text);
    font-size: 14px;
    font-family: 'Fira Code', monospace;
    resize: vertical;
    outline: none;
  }
  .r-area:focus { border-color: var(--primary); }
  
  .match-result {
    margin-top: 16px;
    padding: 16px;
    background: var(--surface-active);
    border-radius: 12px;
    border-left: 4px solid var(--success);
  }
  .err-result {
    border-left-color: var(--danger);
  }
  .matches-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }
  .match-pill {
    padding: 4px 12px;
    background: var(--success-bg);
    border: 1px solid var(--success-border);
    color: var(--success);
    border-radius: 6px;
    font-size: 13px;
    font-family: monospace;
  }
`;

export default function RegexTester() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('g');
  const [testString, setTestString] = useState('');

  let err = '';
  let matches = [];

  try {
    if (pattern) {
      const regex = new RegExp(pattern, flags);
      if (testString) {
        matches = [...testString.matchAll(regex)].map(m => m[0]);
        if (!flags.includes('g')) {
          const m = testString.match(regex);
          matches = m ? [m[0]] : [];
        }
      }
    }
  } catch (e) {
    err = e.message;
  }

  return (
    <>
      <style>{styles}</style>
      <div className="page-header">
        <h1 className="page-title">Regex Tester</h1>
        <p className="page-subtitle">Test regular expressions against target strings instantly.</p>
      </div>

      <div className="regex-layout">
        <label className="exp-label">Regular Expression</label>
        <div style={{display: 'flex', gap: 12}}>
          <input 
            type="text" 
            className="r-input" 
            placeholder="e.g. ^[a-z0-9_-]{3,16}$" 
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
          />
          <input 
            type="text" 
            className="r-input" 
            placeholder="Flags (g, i, m)" 
            style={{width: 120}}
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
          />
        </div>

        <label className="exp-label" style={{marginTop: 12}}>Test String</label>
        <textarea 
          className="r-area"
          placeholder="Enter text to test your regex against..."
          value={testString}
          onChange={(e) => setTestString(e.target.value)}
        ></textarea>

        {err && <div className="match-result err-result text-danger">{err}</div>}
        {!err && pattern && (
          <div className="match-result">
            <div className="exp-label" style={{color: 'var(--success)'}}>{matches.length} Matches Found</div>
            <div className="matches-list">
              {matches.length === 0 && <span style={{color: 'var(--text-muted)', fontSize: 13}}>No matches</span>}
              {matches.map((m, i) => (
                <div key={i} className="match-pill">{m}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
