import React, { useEffect, useState } from "react";
import { getActivityLogs } from "../../services/activityLogService";
import "../../App.css";
import "../Admin.css";

const ENTITY_ICON = {
  MOVIE: "🎬",
  SHOW: "🕐",
  THEATRE: "🏛️",
  SCREEN: "📽️",
  OFFER: "🏷️",
  ADMIN: "🛡️",
};

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;

  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// Poll interval for auto-refreshing the log list so activity (like an
// admin removal, which now also forces that admin's session out) shows up
// here without the viewer needing to manually reload the page.
const LOG_REFRESH_INTERVAL_MS = 15000;

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, LOG_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const loadLogs = async () => {
    try {
      const data = await getActivityLogs();
      setLogs(data);
    } catch (error) {
      console.error("Failed to load logs:", error);
    }
  };

  return (
    <div>
      <div className="admin-page-header-row">
        <div>
          <h1 className="admin-page-title">Activity Log</h1>
          <p className="admin-page-subtext">
            All admin activities are recorded here.
          </p>
        </div>
      </div>

      <div className="admin-log-list">
        {logs.length === 0 && (
          <p className="admin-empty-state">No activity yet.</p>
        )}

        {logs.map((entry) => (
          <div className="admin-log-row" key={entry.id}>
            <span className="admin-log-icon">
              {ENTITY_ICON[entry.entityType] ?? "📌"}
            </span>

            <span>
              <strong>{entry.adminEmail}</strong>
              <br />
              {entry.description}
              {entry.entityName ? ` — ${entry.entityName}` : ""}
            </span>

            <span className="admin-log-time">
              {timeAgo(entry.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
