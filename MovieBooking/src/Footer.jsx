import React from "react";
import "./App.css";

const COLUMNS = [
  {
    heading: "Explore",
    links: ["Now Showing", "Coming Soon", "Cinemas", "Offers"],
  },
  {
    heading: "Company",
    links: ["About Us", "Careers", "Press", "Contact"],
  },
  {
    heading: "Support",
    links: ["FAQs", "Help Center", "Terms of Use", "Privacy Policy"],
  },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-tear" aria-hidden="true" />

      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <a href="#" className="navbar-logo footer-logo">
              <span className="navbar-logo-mark">✦</span>
              Velvet<span className="navbar-logo-accent">Reel</span>
            </a>
            <p className="footer-tagline">
              Booking the seats worth showing up for, since day one.
            </p>

            <div className="footer-social">
              <a href="#" className="footer-social-btn" aria-label="Instagram">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                </svg>
              </a>
              <a href="#" className="footer-social-btn" aria-label="Twitter / X">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4l16 16M20 4L4 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </a>
              <a href="#" className="footer-social-btn" aria-label="Facebook">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M14 9h3V6h-3c-1.66 0-3 1.34-3 3v2H9v3h2v6h3v-6h3l1-3h-4V9c0-.55.45-1 1-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div className="footer-col" key={col.heading}>
              <h4 className="footer-heading">{col.heading}</h4>
              <ul className="footer-links">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="footer-col footer-newsletter">
            <h4 className="footer-heading">Stay in the loop</h4>
            <p className="footer-newsletter-copy">
              New releases and last-minute offers, once a week.
            </p>
            <form
              className="footer-newsletter-form"
              onSubmit={(e) => e.preventDefault()}
            >
              <input type="email" placeholder="you@email.com" required />
              <button type="submit" className="ticket-btn footer-subscribe-btn">
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} VelvetReel. All rights reserved.</span>
          <div className="footer-legal">
            <a href="#">Terms</a>
            <a href="#">Privacy</a>
            <a href="#">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}