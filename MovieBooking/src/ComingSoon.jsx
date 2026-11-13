import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import { getComingSoonMovies, getImageUrl } from "./services/streamingMovieService";
import { useLocationCity } from "./context/LocationContext";

// Formats an ISO date ("2026-08-14") as "Aug 14" to match the original design
const formatReleaseDate = (isoDate) => {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
};

export default function ComingSoon() {
  const trackRef = useRef(null);
  const [movies, setMovies] = useState([]);
  const [error, setError] = useState(null);
  const { location } = useLocationCity();

  useEffect(() => {
    loadMovies();
  }, [location]);

  const loadMovies = async () => {
    try {
      const data = await getComingSoonMovies(location);
      setMovies(data);
    } catch (err) {
      console.error("Failed to load coming soon movies:", err);
      setError("Couldn't load upcoming movies.");
    }
  };

  const scrollByCard = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector(".coming-card");
    const step = card ? card.offsetWidth + 20 : 240;
    track.scrollBy({ left: direction * step * 2, behavior: "smooth" });
  };

  return (
    <section className="coming">
      <div className="coming-inner">
        <div className="movies-header">
          <div>
            <span className="hero-eyebrow">Mark Your Calendar</span>
            <h2 className="movies-title">Coming Soon</h2>
          </div>

          <div className="coming-arrows">
            <button
              className="coming-arrow-btn"
              aria-label="Scroll left"
              onClick={() => scrollByCard(-1)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              className="coming-arrow-btn"
              aria-label="Scroll right"
              onClick={() => scrollByCard(1)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {error && <p className="admin-empty-state">{error}</p>}

        <div className="coming-track" ref={trackRef}>
          {movies.map((movie) => (
            <article className="coming-card" key={movie.id}>
              <div className="movie-poster coming-poster">
                <img src={getImageUrl(movie.coverImage)} alt={`${movie.movieName} poster`} />
                <span className="coming-date-badge">{formatReleaseDate(movie.releaseDate)}</span>
              </div>

              <h3 className="movie-name">{movie.movieName}</h3>
              <p className="movie-meta">{movie.genre}</p>

              <a
                href="#"
                className="ticket-btn ticket-btn--outline coming-notify-btn"
                onClick={(e) => e.preventDefault()}
              >
                Notify me
              </a>
            </article>
          ))}

          {!error && movies.length === 0 && (
            <p className="admin-empty-state">No upcoming movies yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
