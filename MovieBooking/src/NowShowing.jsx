import React from "react";
import { Link } from "react-router-dom";
import "./App.css";
import { useEffect, useState } from "react";
import { getNowShowingMovies } from "./services/streamingMovieService";
import { useLocationCity } from "./context/LocationContext";

export default function NowShowing() {
  const [movies, setMovies] = useState([]);
  const { location } = useLocationCity();

  useEffect(() => {
    loadMovies();
  }, [location]);

  const loadMovies = async () => {
    try {
      const data = await getNowShowingMovies(location);
      setMovies(data);
    } catch (error) {
      console.error("Failed to load movies:", error);
    }
  };
  return (
    <section className="movies">
      <div className="movies-inner">
        <div className="movies-header">
          <div>
            <span className="hero-eyebrow">In Theatres This Week</span>
            <h2 className="movies-title">Now Showing</h2>
          </div>
          <a href="#" className="hero-link movies-viewall">
            View all
          </a>
        </div>

        <div className="movies-grid">
          {movies.length === 0 && (
            <p className="admin-empty-state">
              No movies showing in {location} right now.
            </p>
          )}

          {movies.map((movie) => (
            <article className="movie-card" key={movie.id}>
              <div className="movie-poster">
                <img src={movie.coverImage} alt={`${movie.movieName} poster`} />

                <span className="movie-rating">{movie.certificate}</span>

                <div className="movie-poster-overlay">
                  <Link
                    to="/book"
                    state={{ movie }}
                    className="ticket-btn movie-book-btn"
                  >
                    Book now
                  </Link>
                </div>
              </div>

              <h3 className="movie-name">{movie.movieName}</h3>

              <p className="movie-meta">
                {movie.genre} · {movie.duration} mins
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
