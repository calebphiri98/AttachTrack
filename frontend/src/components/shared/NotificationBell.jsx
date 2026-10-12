import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as notificationsApi from '../../api/notifications.api';
import './NotificationBell.css';

const POLL_INTERVAL_MS = 60000;
const LIST_LIMIT = 20;

function timeAgo(value) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(value).toLocaleDateString();
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const containerRef = useRef(null);

  const refreshCount = useCallback(() => {
    notificationsApi
      .getUnreadCount()
      .then((res) => setUnread(res.data.count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshCount();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refreshCount();
    }, POLL_INTERVAL_MS);
    window.addEventListener('focus', refreshCount);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refreshCount);
    };
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointer(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKey(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  async function loadItems() {
    setLoading(true);
    setError('');
    try {
      const res = await notificationsApi.getNotifications(LIST_LIMIT);
      setItems(res.data);
      setUnread(res.unreadCount);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) loadItems();
  }

  async function handleItemClick(item) {
    if (item.read_at) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, read_at: now } : entry)));
    setUnread((count) => Math.max(0, count - 1));
    try {
      await notificationsApi.markNotificationRead(item.id);
    } catch {
      refreshCount();
    }
  }

  async function handleMarkAll() {
    try {
      await notificationsApi.markAllNotificationsRead();
      const now = new Date().toISOString();
      setItems((prev) => prev.map((entry) => (entry.read_at ? entry : { ...entry, read_at: now })));
      setUnread(0);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        type="button"
        className="notification-bell__button"
        onClick={handleToggle}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="notification-bell__badge">{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="notification-bell__panel" role="dialog" aria-label="Notifications">
          <div className="notification-bell__header">
            <strong>Notifications</strong>
            <button
              type="button"
              className="notification-bell__link-button"
              onClick={handleMarkAll}
              disabled={unread === 0}
            >
              Mark all as read
            </button>
          </div>

          <div className="notification-bell__list">
            {loading && <p className="notification-bell__empty">Loading...</p>}
            {!loading && error && <p className="notification-bell__error">{error}</p>}
            {!loading && !error && items.length === 0 && (
              <p className="notification-bell__empty">You have no notifications yet.</p>
            )}
            {!loading &&
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`notification-bell__item${item.read_at ? '' : ' notification-bell__item--unread'}`}
                  onClick={() => handleItemClick(item)}
                >
                  <span className="notification-bell__item-title">{item.title}</span>
                  {item.body && <span className="notification-bell__item-body">{item.body}</span>}
                  <span className="notification-bell__item-time">{timeAgo(item.created_at)}</span>
                </button>
              ))}
          </div>

          <div className="notification-bell__footer">
            <Link to="/settings/notifications" onClick={() => setOpen(false)}>
              Notification settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}