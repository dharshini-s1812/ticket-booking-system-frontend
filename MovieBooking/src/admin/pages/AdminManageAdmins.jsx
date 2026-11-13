import React, { useEffect, useState } from "react";
import ConfirmDialog from "../ConfirmDialog";
import "../../App.css";
import "../Admin.css";
import { getAllAdmins, addAdmin, deleteAdmin } from "../../services/adminService";
import { useAuth } from "../../context/AuthContext";

export default function AdminManageAdmins() {
  const { admin: currentAdmin } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [email, setEmail] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadAdmins = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllAdmins();
      setAdmins(data);
    } catch (err) {
      setError("Couldn't load admins. Is the backend running on :8080?");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Please enter an email.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // Backend promotes an existing user to Admin if that email already
      // has an account, or creates a new Admin-role user if it doesn't.
      await addAdmin(email.trim());
      setEmail("");
      await loadAdmins();
    } catch (err) {
      setError("Couldn't add the admin. Check the console for details.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmRemove = async () => {
    try {
      await deleteAdmin(pendingDelete.id);
      setAdmins((a) => a.filter((admin) => admin.id !== pendingDelete.id));
    } catch (err) {
      setError("Couldn't remove the admin. Check the console for details.");
      console.error(err);
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div>
      <h1 className="admin-page-title">Admins</h1>
      <p className="admin-page-subtext">
        Add teammates by email — existing users get promoted, new emails get a fresh admin account.
      </p>

      {error && <p className="admin-empty-state admin-error-text">{error}</p>}

      <form className="admin-add-form" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="ticket-btn admin-add-btn" disabled={submitting}>
          {submitting ? "Adding..." : "Add admin"}
        </button>
      </form>

      <div className="admin-table admin-table--admins">
        <div className="admin-table-head">
          <span>Email</span>
          <span></span>
        </div>

        {loading && <p className="admin-empty-state">Loading admins…</p>}

        {!loading &&
          admins.map((adminItem) => {
            const isSelf = currentAdmin?.email === adminItem.email;
            return (
              <div className="admin-table-row" key={adminItem.id}>
                <span>{adminItem.email}</span>
                <span className="admin-row-actions">
                  <button
                    className="admin-remove-btn"
                    onClick={() => setPendingDelete(adminItem)}
                    disabled={isSelf}
                    title={isSelf ? "You can't remove your own account" : "Remove"}
                    aria-label={`Remove ${adminItem.email}`}
                  >
                    Remove
                  </button>
                </span>
              </div>
            );
          })}

        {!loading && admins.length === 0 && (
          <p className="admin-empty-state">No admins yet — add one above.</p>
        )}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Remove this admin?"
          message={`"${pendingDelete.email}" will lose dashboard access. This can't be undone.`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmRemove}
        />
      )}
    </div>
  );
}
