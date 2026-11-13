import React from "react";
import "../App.css";
import "./Admin.css";

export default function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="admin-confirm-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title admin-confirm-title">{title}</h3>
        <p className="modal-subtext">{message}</p>

        <div className="admin-confirm-actions">
          <button className="admin-logout-btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="admin-confirm-delete-btn" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}