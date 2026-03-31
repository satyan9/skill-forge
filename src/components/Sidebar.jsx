import { NavLink } from 'react-router-dom';
import { FileJson, Rainbow, Code2, Brain } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const sidebarStyles = `
  .sidebar-header {
    height: 64px;
    display: flex;
    align-items: center;
    padding: 0 24px;
    border-bottom: 1px solid var(--border);
    font-family: 'Outfit', sans-serif;
    font-size: 20px;
    font-weight: 700;
    gap: 12px;
  }
  .sidebar-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: var(--primary-transparent);
    border: 1px solid var(--primary-border);
    border-radius: 8px;
    color: var(--primary);
  }
  .sidebar-nav {
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }
  .nav-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 12px;
    color: var(--text-muted);
    text-decoration: none;
    font-size: 15px;
    font-weight: 500;
    transition: all 0.2s;
    border: 1px solid transparent;
  }
  .nav-link:hover {
    background: var(--surface-hover);
    color: var(--text);
  }
  .nav-link.active {
    background: var(--primary-transparent);
    color: var(--primary);
    border-color: var(--primary-border);
  }
  .nav-label {
    text-transform: uppercase;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    margin: 16px 16px 8px;
  }
  .sidebar-footer {
    padding: 16px;
    border-top: 1px solid var(--border);
  }
  .logout-btn {
    width: 100%;
    padding: 10px 16px;
    border-radius: 12px;
    background: rgba(255,94,122,0.08);
    border: 1px solid rgba(255,94,122,0.18);
    color: #ff5e7a;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
    font-family: 'Outfit', sans-serif;
  }
  .logout-btn:hover { background: rgba(255,94,122,0.16); }
  .user-chip {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; margin-bottom: 10px;
    border-radius: 12px; background: rgba(255,255,255,0.03);
    border: 1px solid var(--border);
  }
  .user-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: linear-gradient(135deg, var(--primary), #00d4aa);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; color: #fff; flex-shrink: 0;
  }
  .user-name { font-size: 13px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 130px; }
  .user-email { font-size: 11px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 130px; }
`;

export default function Sidebar() {
  const { user, logout } = useAuth();
  const initial = user?.name ? user.name[0].toUpperCase() : '?';

  return (
    <>
      <style>{sidebarStyles}</style>
      <div className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="sidebar-header">
          <div className="sidebar-icon">
            <Brain size={18} />
          </div>
          SkillForge AI
        </div>

        <div className="sidebar-nav">
          <div className="nav-label">Assessment</div>
          <NavLink to="/skill-forge" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <Code2 size={18} />
            SkillForge AI
          </NavLink>
          <NavLink to="/history" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            History
          </NavLink>

          <div className="nav-label">Developer</div>
          <NavLink to="/json-formatter" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <FileJson size={18} />
            JSON Formatter
          </NavLink>
          <NavLink to="/regex-tester" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <Rainbow size={18} />
            Regex Tester
          </NavLink>
        </div>

        <div className="sidebar-footer">
          {user && (
            <div className="user-chip">
              <div className="user-avatar">{initial}</div>
              <div style={{ overflow: 'hidden' }}>
                <div className="user-name">{user.name}</div>
                <div className="user-email">{user.email}</div>
              </div>
            </div>
          )}
          <button className="logout-btn" onClick={logout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
