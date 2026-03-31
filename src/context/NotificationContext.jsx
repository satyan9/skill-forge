import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, API_BASE } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const eventSourceRef = useRef(null);

  // ── Fetch existing notifications from DB ────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/notifications?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [token]);

  // ── Connect to SSE Change Stream ────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    fetchNotifications();

    // Build SSE URL with token (EventSource doesn't support custom headers)
    const url = `${API_BASE}/notifications/stream`;

    // Use fetch-based SSE with Authorization header
    let abortController = new AbortController();

    async function connectSSE() {
      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortController.signal,
        });

        if (!response.ok) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // keep incomplete line

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6));
                if (event.type === 'notification') {
                  const notif = event.payload;
                  setNotifications((prev) => {
                    // Avoid duplicates
                    const exists = prev.some((n) => n._id === notif._id);
                    if (exists) return prev;
                    return [notif, ...prev];
                  });
                  if (!notif.read) {
                    setUnreadCount((c) => c + 1);
                  }
                }
              } catch (_) {}
            }
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('SSE disconnected, retrying in 5s…');
          setTimeout(connectSSE, 5000);
        }
      }
    }

    connectSSE();

    return () => {
      abortController.abort();
    };
  }, [isAuthenticated, token, fetchNotifications]);

  // ── Mark one as read ────────────────────────────────────────────────────
  const markRead = useCallback(async (id) => {
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  }, [token]);

  // ── Mark all as read ────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  }, [token]);

  // ── Delete one ──────────────────────────────────────────────────────────
  const deleteNotification = useCallback(async (id) => {
    try {
      await fetch(`${API_BASE}/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => {
        const removed = prev.find((n) => n._id === id);
        if (removed && !removed.read) setUnreadCount((c) => Math.max(0, c - 1));
        return prev.filter((n) => n._id !== id);
      });
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  }, [token]);

  // ── Clear all ───────────────────────────────────────────────────────────
  const clearAll = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/notifications`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to clear all:', err);
    }
  }, [token]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markRead, markAllRead, deleteNotification, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
