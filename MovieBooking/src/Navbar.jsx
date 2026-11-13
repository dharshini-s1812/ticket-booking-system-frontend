import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LoginModal from "./LoginModal";
import NotificationBell from "./NotificationBell";
import "./App.css";

const NAV_LINKS = ["Now Showing", "Coming Soon", "Cinemas", "Offers"];

function TicketBookBtn({ className = "" }) {
  return (
    <Link to="/book" className={`ticket-btn ticket-btn--stub ${className}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M2 9a3 3 0 1 0 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 1 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M13 5v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M13 17v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M13 11v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="ticket-btn-divider" aria-hidden="true" />
      Book tickets
    </Link>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <a href="#" className="navbar-logo">
          <span className="navbar-logo-mark">✦</span>
          Velvet<span className="navbar-logo-accent">Reel</span>
        </a>

        <nav className={`navbar-links ${open ? "is-open" : ""}`} aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a key={link} href="#" className="navbar-link">
              {link}
            </a>
          ))}
          <TicketBookBtn className="navbar-book-btn--mobile" />
        </nav>

        <div className="navbar-actions">
          {user && <NotificationBell />}

          <TicketBookBtn />

          {user ? (
            <div className="navbar-user">
              <button
                className="navbar-user-btn"
                onClick={() => setShowUserMenu((s) => !s)}
              >
                <span className="navbar-user-avatar">{(user.name || user.email || "?")[0].toUpperCase()}</span>
              </button>

              {showUserMenu && (
                <div className="navbar-user-menu">
                  <p className="navbar-user-menu-name">{user.name}</p>
                  <p className="navbar-user-menu-email">{user.email || user.phone}</p>
                  <Link
                    to="/profile"
                    className="navbar-user-menu-item"
                    onClick={() => setShowUserMenu(false)}
                  >
                    My Profile
                  </Link>
                  <button
                    className="navbar-user-menu-item navbar-user-menu-logout"
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="navbar-login-btn" onClick={() => setShowLogin(true)}>
              Log in
            </button>
          )}

          <button
            className="navbar-toggle"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <span style={{ transform: open ? "translateY(7px) rotate(45deg)" : "none" }} />
            <span style={{ opacity: open ? 0 : 1 }} />
            <span style={{ transform: open ? "translateY(-7px) rotate(-45deg)" : "none" }} />
          </button>
        </div>
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </header>
  );
}