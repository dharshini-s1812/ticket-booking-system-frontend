import React, { useEffect, useRef, useState } from "react";
import {
  getMyNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "./services/notificationService";

// Polling interval for the unread badge. Notifications themselves are
// naturally infrequent (booking events, occasional new-movie/login pings —
// see backend throttling), so this just needs to be often enough that the
// badge doesn't feel stale, not aggressive.
const POLL_MS = 60000;

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  const refreshCount = () => {
    getUnreadCount()
      .then(setUnreadCount)
      .catch(() => {});
  };

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      getMyNotifications()
        .then(setNotifications)
        .catch(() => setNotifications([]))
        .finally(() => setLoading(false));
    }
  };

  const handleNotificationClick = async (n) => {
    if (n.isRead) return;
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await markNotificationRead(n.id);
    } catch {
      // Not worth surfacing an error for this — worst case the badge is a
      // little stale until the next poll.
    }
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      // same as above
    }
  };

  return (
    <div className="navbar-bell-wrapper" ref={wrapperRef}>
      <button
        className="navbar-icon-btn navbar-bell"
        aria-label="Notifications"
        onClick={toggleOpen}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="navbar-bell-dot">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="navbar-notif-panel">
          <div className="navbar-notif-head">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className="navbar-notif-mark-all" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <p className="navbar-notif-empty">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="navbar-notif-empty">You're all caught up.</p>
          ) : (
            <div className="navbar-notif-list">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  className={`navbar-notif-item${n.isRead ? "" : " is-unread"}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <span className="navbar-notif-title">{n.title}</span>
                  <span className="navbar-notif-message">{n.message}</span>
                  <span className="navbar-notif-time">{timeAgo(n.createdAt)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}