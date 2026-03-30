import { Search, Bell, Menu, UserCircle } from 'lucide-react';

const topbarStyles = `
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .search-container {
    position: relative;
    width: 300px;
  }
  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
  }
  .search-input {
    width: 100%;
    padding: 10px 16px 10px 38px;
    border-radius: 99px;
    border: 1px solid var(--border);
    background: rgba(255, 255, 255, 0.03);
    color: var(--text);
    font-size: 14px;
    outline: none;
    transition: all 0.2s;
  }
  .search-input:focus {
    border-color: var(--primary);
    background: rgba(255, 255, 255, 0.05);
  }
  .top-actions {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .action-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    transition: all 0.2s;
  }
  .action-btn:hover {
    background: var(--surface-hover);
    color: var(--text);
  }
`;

export default function Topbar() {
  return (
    <>
      <style>{topbarStyles}</style>
      <div className="topbar">
        <div className="search-container">
          <Search size={16} className="search-icon" />
          <input type="text" className="search-input" placeholder="Quick search tools..." />
        </div>
        
        <div className="top-actions">
          <button className="action-btn">
            <Bell size={20} />
          </button>
          <button className="action-btn">
            <UserCircle size={24} />
          </button>
        </div>
      </div>
    </>
  );
}
