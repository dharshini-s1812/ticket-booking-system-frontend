import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { checkSession } from "../services/authService";
import { isAdminRole } from "../utils/roles";
import NotificationBell from "../Notificationbell";
import "../App.css";
import "./Admin.css";


const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/movies", label: "Movies" },
  { to: "/admin/theatres", label: "Theatres" },
  { to: "/admin/shows", label: "Shows" },
  { to: "/admin/offers", label: "Offers" },
  { to: "/admin/admins", label: "Admins" },
  { to: "/admin/logs", label: "Activity Log" },
];

// How often (and how promptly) a removed admin gets logged out. The access
// token itself carries no role and stays valid for up to an hour, so this
// poll is what actually notices "another admin just took my access away".
const SESSION_CHECK_INTERVAL_MS = 20000;

export default function AdminLayout() {
  const { admin, adminLogout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  const handleLogout = () => {
    adminLogout();
    navigate("/admin/login");
  };

  // Close the mobile drawer whenever the route changes (e.g. after tapping
  // a nav link) so it doesn't stay open over the next page.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  // Lock background scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  useEffect(() => {
    let cancelled = false;

    const forceLogout = async (message) => {
      if (cancelled) return;
      cancelled = true;
      await adminLogout();
      navigate("/admin/login", { replace: true, state: { message } });
    };

    const verifyStillAdmin = async () => {
      try {
        const session = await checkSession();
        if (!isAdminRole(session.role)) {
          await forceLogout(
            "Your admin access was removed. Please contact another admin if this is unexpected."
          );
        }
      } catch (err) {
        // A 401 means the token/session itself is no longer valid — e.g.
        // the refresh token was revoked when this account was removed as
        // an admin. Anything else (a network blip, etc.) is ignored so a
        // flaky connection doesn't log someone out.
        if (err.response?.status === 401) {
          await forceLogout("Your session has ended. Please sign in again.");
        }
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") verifyStillAdmin();
    };

    verifyStillAdmin();
    const interval = setInterval(verifyStillAdmin, SESSION_CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="admin-shell">
      {/* Mobile-only top bar: logo + hamburger. The sidebar itself becomes a
          slide-in drawer on small screens, toggled from here. */}
      <header className="admin-topbar">
        <a href="/" className="navbar-logo admin-topbar-logo">
          <span className="navbar-logo-mark">✦</span>
          Velvet<span className="navbar-logo-accent">Reel</span>
        </a>
        <button
          type="button"
          className="admin-nav-toggle"
          aria-label="Toggle admin menu"
          aria-expanded={navOpen}
          onClick={() => setNavOpen((v) => !v)}
        >
          <span style={{ transform: navOpen ? "translateY(7px) rotate(45deg)" : "none" }} />
          <span style={{ opacity: navOpen ? 0 : 1 }} />
          <span style={{ transform: navOpen ? "translateY(-7px) rotate(-45deg)" : "none" }} />
        </button>
      </header>

      {/* Backdrop behind the drawer on mobile; tapping it closes the menu. */}
      <div
        className={`admin-sidebar-backdrop${navOpen ? " is-open" : ""}`}
        onClick={() => setNavOpen(false)}
        aria-hidden="true"
      />

      <aside className={`admin-sidebar${navOpen ? " is-open" : ""}`}>
        <a href="/" className="navbar-logo admin-sidebar-logo">
          <span className="navbar-logo-mark">✦</span>
          Velvet<span className="navbar-logo-accent">Reel</span>
        </a>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `admin-nav-link${isActive ? " is-active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user">
            <span className="navbar-user-avatar">
              {admin?.name?.[0]?.toUpperCase() ?? "A"}
            </span>
            <div>
              <p className="admin-sidebar-user-name">{admin?.name}</p>
              <p className="admin-sidebar-user-email">{admin?.email}</p>
            </div>
            <NotificationBell />
          </div>
          <button className="admin-logout-btn" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
