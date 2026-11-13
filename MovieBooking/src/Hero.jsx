import React from "react";
import { useLocationCity } from "./context/LocationContext";
import "./App.css";

export default function Hero() {
  const { location, setLocation, locations } = useLocationCity();
  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-copy">
          <span className="hero-eyebrow">Book in Under a Minute</span>

          <h1 className="hero-title">
            Skip the queue.
            <br />
            Get the <em>good seats</em>.
          </h1>

          <p className="hero-subtext">
            Find what's playing nearby, pick your seats on a live map, and
            have your ticket ready before you've left the house. No box
            office line required.
          </p>

          <div className="hero-cta-row">
            <a href="#" className="hero-link">
              See this week's lineup
            </a>
          </div>

          <form className="hero-search" onSubmit={(e) => e.preventDefault()}>
            <label className="hero-search-field">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input type="text" placeholder="Search movies" />
            </label>

            <span className="hero-search-divider" />

            <label className="hero-search-field">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />
              </svg>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                aria-label="Select your city"
              >
                {locations.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" className="ticket-btn">
              Find shows
            </button>
          </form>
        </div>

        <div className="hero-visual">
          <div className="hero-ticket hero-ticket--back" aria-hidden="true">
            <div className="hero-ticket-stub">
              <span className="hero-ticket-stub-text">ADMIT ONE</span>
            </div>
            <div className="hero-ticket-body">
              <span className="hero-ticket-eyebrow">Screen 3 · 9:40 PM</span>
              <span className="hero-ticket-title">Late Night Reel</span>
              <span className="hero-ticket-seat">Seat E12</span>
              <div className="hero-ticket-barcode" />
            </div>
          </div>

          <div className="hero-ticket-front-wrap">
            <div className="hero-ticket hero-ticket--front">
              <div className="hero-ticket-stub">
                <span className="hero-ticket-stub-text">ADMIT ONE</span>
              </div>
              <div className="hero-ticket-body">
                <span className="hero-ticket-eyebrow">Screen 1 · 7:45 PM</span>
                <span className="hero-ticket-title">The Last Reel</span>
                <span className="hero-ticket-seat">Seat H7</span>
                <div className="hero-ticket-barcode" />
              </div>
            </div>
            <span className="hero-ticket-badge">Booking Now</span>
          </div>
        </div>
      </div>
    </section>
  );
}
