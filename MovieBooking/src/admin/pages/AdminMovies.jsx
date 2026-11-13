import React, { useEffect, useState } from "react";
import ConfirmDialog from "../ConfirmDialog";
import "../../App.css";
import "../Admin.css";
import {
  getAllMovies,
  addMovie,
  updateMovie,
  deleteMovie,
  getImageUrl,
} from "../../services/streamingMovieService";
import {
  GENRE_OPTIONS,
  LANGUAGE_OPTIONS,
  CERTIFICATE_OPTIONS,
} from "../../utils/movieOptions";

// duration is stored/sent to the backend as total minutes (StreamingMovie.duration).
// The admin enters it as hours + minutes; these two combine into that one
// number on submit and split back apart when editing.
// Note: no "location" or "status" fields here anymore. Which city a movie
// shows in, and whether it's "Now Showing" vs "Coming Soon", are both
// derived from whether/where it's actually scheduled (Shows) — not typed in
// by hand. Set that up on the Shows page; the badge below is read-only.
// Same reasoning for "screen number": which screen(s) a movie plays on is
// picked per-show in the Shows section (a movie can run on several screens
// at once), so it never belonged on the movie record itself.
const EMPTY_FORM = {
  movieName: "",
  genre: "",
  language: "",
  certificate: "",
  durationHours: "",
  durationMinutes: "",
  releaseDate: "",
  description: "",
};

const toTotalMinutes = (hours, minutes) =>
  (Number(hours) || 0) * 60 + (Number(minutes) || 0);

const splitMinutes = (totalMinutes) => {
  const total = Number(totalMinutes) || 0;
  return {
    hours: String(Math.floor(total / 60)),
    minutes: String(total % 60),
  };
};

// e.g. 135 -> "2h 15m", 60 -> "2h", 45 -> "45m"
const formatDuration = (totalMinutes) => {
  const total = Number(totalMinutes) || 0;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
};

export default function AdminMovies() {
  const [movies, setMovies] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const loadMovies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllMovies();
      setMovies(data);
    } catch (err) {
      setError("Couldn't load movies. Is the backend running on :8080?");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovies();
  }, []);

  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview(null);
    setEditingId(null);
    setError(null);
  };

  const startEdit = (movie) => {
    setEditingId(movie.id);
    const { hours, minutes } = splitMinutes(movie.duration);
    setForm({
      movieName: movie.movieName ?? "",
      genre: movie.genre ?? "",
      language: movie.language ?? "",
      certificate: movie.certificate ?? "",
      durationHours: hours,
      durationMinutes: minutes,
      releaseDate: movie.releaseDate ?? "",
      description: movie.description ?? "",
    });
    setImageFile(null);
    setImagePreview(movie.coverImage ? getImageUrl(movie.coverImage) : null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mirrors the NOT NULL constraints on StreamingMovie: movieName, genre,
    // language, certificate, duration, releaseDate, coverImage.
    // description is nullable, so it's excluded. There's no location or
    // screen number field to validate anymore — see EMPTY_FORM comment.
    const requiredFields = [
      "movieName",
      "genre",
      "language",
      "certificate",
      "releaseDate",
    ];
    const missing = requiredFields.filter((f) => !String(form[f] ?? "").trim());
    const totalDuration = toTotalMinutes(form.durationHours, form.durationMinutes);
    const durationMissing = totalDuration <= 0;
    // A cover image is only mandatory when creating a new movie — editing
    // can keep the existing cover if no new file is chosen.
    const needsImage = !editingId && !imageFile;

    if (missing.length > 0 || durationMissing || needsImage) {
      setError(
        `Please fill in: ${[
          ...missing,
          ...(durationMissing ? ["duration"] : []),
          ...(needsImage ? ["cover image"] : []),
        ].join(", ")}.`
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = { ...form, duration: totalDuration };
      if (editingId) {
        await updateMovie(editingId, payload, imageFile);
      } else {
        await addMovie(payload, imageFile);
      }
      resetForm();
      await loadMovies(); // refresh from backend
    } catch (err) {
      const backendMessage = err.response?.data?.message;
      setError(
        backendMessage ||
          (editingId
            ? "Couldn't update the movie. Check the console for details."
            : "Couldn't add the movie. Check the console for details.")
      );
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmRemove = async () => {
    try {
      await deleteMovie(pendingDelete.id);
      setMovies((m) => m.filter((movie) => movie.id !== pendingDelete.id));
      if (editingId === pendingDelete.id) resetForm();
    } catch (err) {
      setError(
        err.response?.data?.message || "Couldn't delete the movie. Check the console for details."
      );
      console.error(err);
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div>
      <h1 className="admin-page-title">Movies</h1>
      <p className="admin-page-subtext">
        Add new releases with cover art, language, and certificate — or pull
        ones that finished their run.
      </p>

      {error && <p className="admin-empty-state admin-error-text">{error}</p>}

      <form className="admin-add-form admin-add-form--movies" onSubmit={handleSubmit}>
        {editingId && (
          <div className="admin-form-banner">
            Editing <strong>{form.movieName || "movie"}</strong>
            <button type="button" className="admin-form-banner-cancel" onClick={resetForm}>
              Cancel
            </button>
          </div>
        )}

        <div className="admin-form-top">
          <label className="admin-cover-upload">
            {imagePreview ? (
              <img src={imagePreview} alt="Cover preview" />
            ) : (
              <span>+ Cover</span>
            )}
            <input type="file" accept="image/*" onChange={handleImageChange} hidden />
          </label>

          <div className="admin-form-fields">
            <label className="admin-field">
              <span className="admin-field-label">Movie name</span>
              <input value={form.movieName} onChange={handleChange("movieName")} required />
            </label>
            <label className="admin-field">
              <span className="admin-field-label">Genre</span>
              <select value={form.genre} onChange={handleChange("genre")} required>
                <option value="" disabled>
                  Select genre
                </option>
                {GENRE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span className="admin-field-label">Language</span>
              <select value={form.language} onChange={handleChange("language")} required>
                <option value="" disabled>
                  Select language
                </option>
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span className="admin-field-label">Certificate</span>
              <select
                value={form.certificate}
                onChange={handleChange("certificate")}
                required
              >
                <option value="" disabled>
                  Select certificate
                </option>
                {CERTIFICATE_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span className="admin-field-label">Duration</span>
              <div className="admin-field-row">
                <input
                  type="number"
                  min="0"
                  placeholder="Hrs"
                  aria-label="Duration hours"
                  value={form.durationHours}
                  onChange={handleChange("durationHours")}
                  required
                />
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="Min"
                  aria-label="Duration minutes"
                  value={form.durationMinutes}
                  onChange={handleChange("durationMinutes")}
                  required
                />
              </div>
            </label>
            <label className="admin-field">
              <span className="admin-field-label">Release date</span>
              <input
                type="date"
                value={form.releaseDate}
                onChange={handleChange("releaseDate")}
                required
              />
            </label>
            <label className="admin-field admin-field--full">
              <span className="admin-field-label">Description (optional)</span>
              <textarea value={form.description} onChange={handleChange("description")} />
            </label>
          </div>
        </div>

        <div className="admin-form-bottom">
          <div className="admin-form-actions">
            {editingId && (
              <button type="button" className="admin-cancel-btn" onClick={resetForm}>
                Cancel
              </button>
            )}
            <button type="submit" className="ticket-btn admin-add-btn" disabled={submitting}>
              {submitting
                ? editingId
                  ? "Saving..."
                  : "Adding..."
                : editingId
                ? "Save changes"
                : "Add movie"}
            </button>
          </div>
        </div>
      </form>

      <div className="admin-table admin-table--movies">
        <div className="admin-table-head">
          <span></span>
          <span>Title</span>
          <span>Genre / Language</span>
          <span>Duration</span>
          <span>Certificate</span>
          <span>Status</span>
          <span></span>
        </div>

        {loading && <p className="admin-empty-state">Loading movies…</p>}

        {!loading &&
          movies.map((movie) => (
            <div
              className={`admin-table-row${editingId === movie.id ? " is-editing" : ""}`}
              key={movie.id}
            >
              <span className="admin-table-cover">
                {movie.coverImage ? (
                  <img src={getImageUrl(movie.coverImage)} alt="" />
                ) : (
                  <span className="admin-table-cover-placeholder">🎬</span>
                )}
              </span>
              <span>{movie.movieName}</span>
              <span>
                {movie.genre || "—"}
                {movie.language ? ` · ${movie.language}` : ""}
              </span>
              <span>{formatDuration(movie.duration)}</span>
              <span>{movie.certificate || "—"}</span>
              <span>
                <span
                  className={`admin-status-pill${
                    movie.status === "NOW_SHOWING" ? " admin-status-pill--live" : ""
                  }`}
                  title="Derived from whether this movie has any show scheduled — set that up on the Shows page."
                >
                  {movie.status === "NOW_SHOWING" ? "Now Showing" : "Coming Soon"}
                </span>
              </span>
              <span className="admin-row-actions">
                <button
                  type="button"
                  className="admin-edit-btn"
                  onClick={() => startEdit(movie)}
                  aria-label={`Edit ${movie.movieName}`}
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  className="admin-remove-btn"
                  onClick={() => setPendingDelete(movie)}
                  aria-label={`Remove ${movie.movieName}`}
                >
                  Remove
                </button>
              </span>
            </div>
          ))}

        {!loading && movies.length === 0 && (
          <p className="admin-empty-state">No movies yet — add one above.</p>
        )}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Remove this movie?"
          message={`"${pendingDelete.movieName}" will be removed from the listing. This can't be undone.`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmRemove}
        />
      )}
    </div>
  );
}