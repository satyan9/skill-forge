import { NavLink } from 'react-router-dom';
import { FileJson, Rainbow, Code2, Brain } from 'lucide-react';
import { motion } from 'framer-motion';

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
`;

export default function Sidebar() {
  return (
    <>
      <style>{sidebarStyles}</style>
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-icon">
            <Brain size={18} />
          </div>
          SkillForge AI
        </div>
        
        <div className="sidebar-nav">
          <div className="nav-label">General Tools</div>
          <NavLink to="/skill-forge" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <Code2 size={18} />
            SkillForge AI
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
      </div>
    </>
  );
}
