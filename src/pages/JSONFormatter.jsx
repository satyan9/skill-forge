import { useState } from 'react';

const styles = `
  .tool-grid {
    display: flex;
    gap: 24px;
    height: calc(100vh - 200px);
  }
  .tool-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .tool-area {
    flex: 1;
    width: 100%;
    resize: none;
    font-family: 'Fira Code', monospace;
    font-size: 13px;
    padding: 16px;
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 12px;
    outline: none;
  }
  .tool-area:focus {
    border-color: var(--primary);
  }
  .tool-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .error-txt {
    color: var(--danger);
    font-size: 13px;
  }
`;

export default function JSONFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const formatJSON = () => {
    try {
      if (!input.trim()) return;
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
      setError('');
    } catch (e) {
      setError('Invalid JSON: ' + e.message);
    }
  };

  const minifyJSON = () => {
    try {
      if (!input.trim()) return;
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError('');
    } catch (e) {
      setError('Invalid JSON: ' + e.message);
    }
  };

  const copyOut = () => {
    navigator.clipboard.writeText(output);
  };

  return (
    <>
      <style>{styles}</style>
      <div className="page-header">
        <h1 className="page-title">JSON Formatter</h1>
        <p className="page-subtitle">Format and validate JSON structures instantly.</p>
      </div>

      <div className="tool-grid">
        <div className="tool-col">
          <div className="tool-header">
            <label className="exp-label" style={{margin:0}}>Input JSON</label>
            {error && <span className="error-txt">{error}</span>}
          </div>
          <textarea 
            className="tool-area" 
            placeholder="Paste raw JSON here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          ></textarea>
          <div style={{display: 'flex', gap: 12}}>
            <button className="btn btn-primary" onClick={formatJSON}>Format (Pretty)</button>
            <button className="btn btn-secondary" onClick={minifyJSON}>Minify</button>
          </div>
        </div>

        <div className="tool-col">
          <div className="tool-header">
            <label className="exp-label" style={{margin:0}}>Output</label>
            <button className="btn btn-secondary" style={{padding: '4px 12px', fontSize: 12}} onClick={copyOut}>Copy</button>
          </div>
          <textarea 
            className="tool-area" 
            readOnly
            value={output}
            placeholder="Result will appear here..."
          ></textarea>
        </div>
      </div>
    </>
  );
}
