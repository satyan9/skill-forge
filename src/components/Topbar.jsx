import { useState, useRef, useEffect } from 'react';
import { Search, Bell, UserCircle, X, CheckCheck, Trash2, Info, CheckCircle, AlertTriangle, XCircle, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

/* ────────────────────────────── styles ──────────────────────────────────── */
const topbarStyles = `
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
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
    position: relative;
  }
  .action-btn:hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  /* ── Bell badge ── */
  .notif-bell-wrap {
    position: relative;
  }
  .notif-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    min-width: 17px;
    height: 17px;
    border-radius: 99px;
    background: #ef4444;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    border: 2px solid var(--bg, #0f0f13);
    animation: badge-pop 0.25s cubic-bezier(0.34,1.56,0.64,1);
    pointer-events: none;
  }
  @keyframes badge-pop {
    from { transform: scale(0); }
    to   { transform: scale(1); }
  }
  .bell-icon-animate {
    animation: bell-ring 0.4s ease;
  }
  @keyframes bell-ring {
    0%,100% { transform: rotate(0deg); }
    20%      { transform: rotate(-12deg); }
    60%      { transform: rotate(12deg); }
    80%      { transform: rotate(-6deg); }
  }

  /* ── Notification panel ── */
  .notif-panel {
    position: absolute;
    top: calc(100% + 12px);
    right: 0;
    width: 380px;
    max-height: 520px;
    background: #16161e;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 9999;
    animation: panel-drop 0.22s cubic-bezier(0.34,1.3,0.64,1);
  }
  @keyframes panel-drop {
    from { opacity: 0; transform: translateY(-10px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .notif-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 18px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .notif-header-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text, #f0f0f5);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .notif-header-actions {
    display: flex;
    gap: 6px;
  }
  .notif-action-btn {
    background: rgba(255,255,255,0.05);
    border: none;
    border-radius: 8px;
    color: var(--text-muted, #888);
    font-size: 11px;
    padding: 4px 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.15s;
  }
  .notif-action-btn:hover {
    background: rgba(255,255,255,0.1);
    color: var(--text, #f0f0f5);
  }
  .notif-list {
    overflow-y: auto;
    flex: 1;
    padding: 8px 0;
  }
  .notif-list::-webkit-scrollbar { width: 4px; }
  .notif-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

  /* ── Notification item ── */
  .notif-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 18px;
    cursor: pointer;
    transition: background 0.15s;
    position: relative;
    border-left: 3px solid transparent;
  }
  .notif-item:hover { background: rgba(255,255,255,0.04); }
  .notif-item.unread { border-left-color: var(--primary, #7c6af7); background: rgba(124,106,247,0.05); }
  .notif-icon {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .notif-icon.success { background: rgba(34,197,94,0.15); color: #22c55e; }
  .notif-icon.info    { background: rgba(99,179,237,0.15); color: #63b3ed; }
  .notif-icon.warning { background: rgba(251,191,36,0.15); color: #fbbf24; }
  .notif-icon.error   { background: rgba(239,68,68,0.15);  color: #ef4444; }
  .notif-icon.achievement { background: rgba(250,204,21,0.15); color: #facc15; }

  .notif-body { flex: 1; min-width: 0; }
  .notif-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text, #f0f0f5);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .notif-msg {
    font-size: 12px;
    color: var(--text-muted, #888);
    margin-top: 2px;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .notif-time {
    font-size: 10px;
    color: var(--text-muted, #666);
    margin-top: 4px;
  }
  .notif-delete-btn {
    background: none;
    border: none;
    color: rgba(255,255,255,0.2);
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    opacity: 0;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .notif-item:hover .notif-delete-btn {
    opacity: 1;
    color: rgba(255,255,255,0.5);
  }
  .notif-delete-btn:hover { color: #ef4444 !important; background: rgba(239,68,68,0.1); }

  .notif-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: var(--text-muted, #666);
    gap: 10px;
  }
  .notif-empty-icon { font-size: 36px; opacity: 0.4; }
  .notif-empty-text { font-size: 13px; }
  .notif-footer {
    padding: 10px 18px;
    border-top: 1px solid rgba(255,255,255,0.06);
    text-align: center;
    font-size: 11px;
    color: var(--text-muted, #666);
  }
`;

/* ────────────────────────────── helpers ─────────────────────────────────── */
const TYPE_ICONS = {
  success:     <CheckCircle size={15} />,
  info:        <Info size={15} />,
  warning:     <AlertTriangle size={15} />,
  error:       <XCircle size={15} />,
  achievement: <Trophy size={15} />,
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ────────────────────────────── component ───────────────────────────────── */
export default function Topbar() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead, deleteNotification, clearAll } =
    useNotifications();

  const [open, setOpen] = useState(false);
  const [bellAnim, setBellAnim] = useState(false);
  const panelRef = useRef(null);
  const prevUnread = useRef(unreadCount);

  // Ring bell when new notification arrives
  useEffect(() => {
    if (unreadCount > prevUnread.current) {
      setBellAnim(true);
      setTimeout(() => setBellAnim(false), 500);
    }
    prevUnread.current = unreadCount;
  }, [unreadCount]);

  // Close panel when clicking outside
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function handleItemClick(n) {
    if (!n.read) markRead(n._id);
    if (n.link) navigate(n.link);
    setOpen(false);
  }

  function handleDelete(e, id) {
    e.stopPropagation();
    deleteNotification(id);
  }

  return (
    <>
      <style>{topbarStyles}</style>
      <div className="topbar">
        <div className="search-container">
          <Search size={16} className="search-icon" />
          <input type="text" className="search-input" placeholder="Quick search tools..." />
        </div>

        <div className="top-actions">
          {/* ── Bell ── */}
          <div className="notif-bell-wrap" ref={panelRef}>
            <button
              id="notification-bell-btn"
              className={`action-btn ${bellAnim ? 'bell-icon-animate' : ''}`}
              onClick={() => setOpen((v) => !v)}
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>

            {/* ── Dropdown panel ── */}
            {open && (
              <div className="notif-panel" id="notification-panel">
                <div className="notif-header">
                  <span className="notif-header-title">
                    <Bell size={15} /> Notifications
                    {unreadCount > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 400, color: '#7c6af7' }}>
                        {unreadCount} new
                      </span>
                    )}
                  </span>
                  <div className="notif-header-actions">
                    {unreadCount > 0 && (
                      <button className="notif-action-btn" onClick={markAllRead} title="Mark all read">
                        <CheckCheck size={12} /> Mark all read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button className="notif-action-btn" onClick={clearAll} title="Clear all">
                        <Trash2 size={12} /> Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="notif-list">
                  {notifications.length === 0 ? (
                    <div className="notif-empty">
                      <div className="notif-empty-icon">🔔</div>
                      <div className="notif-empty-text">You're all caught up!</div>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n._id}
                        className={`notif-item ${!n.read ? 'unread' : ''}`}
                        onClick={() => handleItemClick(n)}
                      >
                        <div className={`notif-icon ${n.type}`}>
                          {TYPE_ICONS[n.type] || <Info size={15} />}
                        </div>
                        <div className="notif-body">
                          <div className="notif-title">{n.title}</div>
                          <div className="notif-msg">{n.message}</div>
                          <div className="notif-time">{timeAgo(n.createdAt)}</div>
                        </div>
                        <button
                          className="notif-delete-btn"
                          onClick={(e) => handleDelete(e, n._id)}
                          title="Delete"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="notif-footer">
                    Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Profile ── */}
          <button className="action-btn" onClick={() => navigate('/profile')} title="View Profile">
            <UserCircle size={24} />
          </button>
        </div>
      </div>
    </>
  );
}
