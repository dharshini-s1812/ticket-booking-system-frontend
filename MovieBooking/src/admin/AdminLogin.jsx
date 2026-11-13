import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../App.css";
import "./Admin.css";

export default function AdminLogin() {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // AdminLayout redirects here with a reason (e.g. another admin removed
  // this account's admin access) — surface it instead of the blank form.
  const [error, setError] = useState(location.state?.message || "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Enter both email and password.");
      return;
    }
    try {
      setError("");
      await adminLogin({ email, password });
      navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password.");
    }
  };

  return (
    <div className="admin-login-shell">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <a href="/" className="navbar-logo admin-login-logo">
          <span className="navbar-logo-mark">✦</span>
          Velvet<span className="navbar-logo-accent">Reel</span>
        </a>

        <span className="hero-eyebrow">Staff Access Only</span>
        <h1 className="admin-login-title">Admin sign in</h1>
        <p className="admin-login-subtext">
          This is separate from customer accounts. Guests never need this
          screen to book a ticket.
        </p>

        {error && <p className="admin-login-error">{error}</p>}

        <label className="modal-field">
          <span>Email</span>
          <input
            type="email"
            placeholder="admin@velvetreel.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="modal-field">
          <span>Password</span>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button type="submit" className="ticket-btn modal-submit-btn">
          Sign in
        </button>

        <a href="/" className="admin-login-back">
          ← Back to the site
        </a>
      </form>
    </div>
  );
}
