import React, { useMemo, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import { addShow, updateShow, deleteShow } from "../services/showService";
import {
  findScreenConflict,
  formatTimeRange,
  getShowWindow,
} from "./scheduleUtils";

// Scheduling lives here instead of a second "Shows" form: pick this movie
// once (from the Movies table), then just pick screens + a date/time. One
// submit can fan out to several screens at once; each screen already
// showing something else at that time is disabled with a reason.
export default function ScheduleModal({
  movie,
  theatres,
  screens,
  shows,
  onClose,
  onSaved,
}) {
  const emptyAddForm = {
    theatreId: theatres[0]?.id != null ? String(theatres[0].id) : "",
    screenIds: [],
    showDate: "",
    startTime: "",
    language: movie.language || "",
    basePrice: "",
  };

  const [form, setForm] = useState(emptyAddForm);
  const [editingShow, setEditingShow] = useState(null); // the show object being edited, or null = add mode
  const [pendingDelete, setPendingDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const myShows = useMemo(
    () =>
      (shows || [])
        .filter((s) => String(s.movieId) === String(movie.id))
        .sort((a, b) =>
          `${a.showDate} ${a.startTime}`.localeCompare(`${b.showDate} ${b.startTime}`)
        ),
    [shows, movie.id]
  );

  const screensForTheatre = useMemo(
    () => screens.filter((s) => String(s.theatreId) === String(form.theatreId)),
    [screens, form.theatreId]
  );

  // For every screen at the chosen theatre, work out whether the chosen
  // date/time would collide with something already scheduled there.
  const conflictByScreen = useMemo(() => {
    const map = new Map();
    if (!form.showDate || !form.startTime) return map;
    for (const screen of screensForTheatre) {
      const conflict = findScreenConflict({
        screenId: screen.id,
        date: form.showDate,
        startTime: form.startTime,
        durationMinutes: movie.duration,
        shows,
        excludeShowId: editingShow?.id,
      });
      if (conflict) map.set(String(screen.id), conflict);
    }
    return map;
  }, [screensForTheatre, form.showDate, form.startTime, movie.duration, shows, editingShow]);

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      if (field === "theatreId") return { ...f, theatreId: value, screenIds: [] };
      return { ...f, [field]: value };
    });
  };

  const toggleScreen = (screenId) => {
    setForm((f) => {
      const id = String(screenId);
      const has = f.screenIds.includes(id);
      return {
        ...f,
        screenIds: has ? f.screenIds.filter((s) => s !== id) : [...f.screenIds, id],
      };
    });
  };

  const resetToAdd = () => {
    setEditingShow(null);
    setForm(emptyAddForm);
    setError(null);
  };

  const startEditShow = (show) => {
    setEditingShow(show);
    setForm({
      theatreId: String(show.theatreId),
      screenIds: [String(show.screenId)],
      showDate: show.showDate ?? "",
      startTime: (show.startTime ?? "").slice(0, 5),
      language: show.language ?? movie.language ?? "",
      basePrice: show.basePrice ?? "",
    });
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const required = ["showDate", "startTime", "language", "basePrice"];
    const missing = required.filter((f) => !String(form[f] ?? "").trim());
    if (missing.length > 0 || form.screenIds.length === 0) {
      setError(
        `Please fill in: ${[...missing, ...(form.screenIds.length === 0 ? ["at least one screen"] : [])].join(", ")}.`
      );
      return;
    }

    setSubmitting(true);
    try {
      if (editingShow) {
        await updateShow(editingShow.id, {
          movieId: movie.id,
          screenId: form.screenIds[0],
          showDate: form.showDate,
          startTime: form.startTime,
          language: form.language,
          basePrice: form.basePrice,
        });
        await onSaved();
        resetToAdd();
        setNotice("Schedule updated.");
      } else {
        const failures = [];
        for (const screenId of form.screenIds) {
          const screenName =
            screensForTheatre.find((s) => String(s.id) === screenId)?.screenName ??
            `Screen ${screenId}`;
          try {
            await addShow({
              movieId: movie.id,
              screenId,
              showDate: form.showDate,
              startTime: form.startTime,
              language: form.language,
              basePrice: form.basePrice,
            });
          } catch (err) {
            failures.push(
              `${screenName}: ${err.response?.data?.message || "couldn't be scheduled"}`
            );
          }
        }
        await onSaved();
        if (failures.length === 0) {
          setNotice(
            `Scheduled on ${form.screenIds.length} screen${form.screenIds.length > 1 ? "s" : ""}.`
          );
          setForm((f) => ({ ...emptyAddForm, theatreId: f.theatreId, showDate: f.showDate, startTime: f.startTime, language: f.language, basePrice: f.basePrice }));
        } else {
          setError(failures.join(" · "));
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (editingShow ? "Couldn't update the schedule." : "Couldn't add the schedule.")
      );
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmRemove = async () => {
    try {
      await deleteShow(pendingDelete.id);
      await onSaved();
      if (editingShow?.id === pendingDelete.id) resetToAdd();
      setNotice("Schedule removed.");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't remove that schedule.");
      console.error(err);
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card admin-schedule-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          &times;
        </button>

        <h3 className="modal-title">Schedule — {movie.movieName}</h3>
        <p className="modal-subtext">
          {movie.language} · {movie.duration} min. Pick one or more screens; screens already
          busy at the chosen time are disabled.
        </p>

        {error && <p className="admin-empty-state admin-error-text admin-schedule-alert">{error}</p>}
        {notice && !error && (
          <p className="admin-empty-state admin-schedule-notice">{notice}</p>
        )}

        <div className="admin-schedule-existing">
          <h4 className="admin-schedule-subhead">Currently scheduled</h4>
          {myShows.length === 0 && (
            <p className="admin-empty-state admin-schedule-empty">Not scheduled anywhere yet.</p>
          )}
          {myShows.map((show) => {
            const win = getShowWindow(show);
            return (
              <div
                className={`admin-schedule-row${editingShow?.id === show.id ? " is-editing" : ""}`}
                key={show.id}
              >
                <div>
                  <strong>{show.theatreName}</strong> · {show.screenName}
                  <div className="admin-schedule-row-meta">
                    {show.showDate} · {formatTimeRange(win.start, win.end)} ·{" "}
                    {show.availableSeats}/{show.totalSeats} seats
                  </div>
                </div>
                <div className="admin-row-actions">
                  <button
                    type="button"
                    className="admin-edit-btn"
                    onClick={() => startEditShow(show)}
                    aria-label="Edit this schedule"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    className="admin-remove-btn"
                    onClick={() => setPendingDelete(show)}
                    aria-label="Remove this schedule"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <form className="admin-schedule-form" onSubmit={handleSubmit}>
          <div className="admin-form-banner admin-schedule-form-banner">
            {editingShow ? (
              <>
                Editing schedule on <strong>{editingShow.screenName}</strong>
                <button type="button" className="admin-form-banner-cancel" onClick={resetToAdd}>
                  Cancel
                </button>
              </>
            ) : (
              "Add a new schedule"
            )}
          </div>

          <div className="admin-form-fields">
            <label className="admin-field">
              <span className="admin-field-label">Theatre</span>
              <select value={form.theatreId} onChange={handleChange("theatreId")} required>
                <option value="">Select a theatre</option>
                {theatres.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.theatreName} — {t.city}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span className="admin-field-label">Date</span>
              <input
                type="date"
                value={form.showDate}
                onChange={handleChange("showDate")}
                required
              />
            </label>

            <label className="admin-field">
              <span className="admin-field-label">Start time</span>
              <input
                type="time"
                value={form.startTime}
                onChange={handleChange("startTime")}
                required
              />
            </label>

            <label className="admin-field">
              <span className="admin-field-label">Language</span>
              <input value={form.language} onChange={handleChange("language")} required />
            </label>

            <label className="admin-field">
              <span className="admin-field-label">Base price (₹)</span>
              <input
                type="number"
                min="0"
                value={form.basePrice}
                onChange={handleChange("basePrice")}
                required
              />
            </label>
          </div>

          <div className="admin-field admin-field--full">
            <span className="admin-field-label">
              {editingShow ? "Screen" : "Screens (select one or more)"}
            </span>

            {!form.theatreId && (
              <p className="admin-empty-state admin-schedule-empty">Pick a theatre first.</p>
            )}

            {form.theatreId && screensForTheatre.length === 0 && (
              <p className="admin-empty-state admin-schedule-empty">
                This theatre has no screens yet.
              </p>
            )}

            <div className="admin-screen-grid">
              {screensForTheatre.map((screen) => {
                const conflict = conflictByScreen.get(String(screen.id));
                const busy = Boolean(conflict);
                const selected = form.screenIds.includes(String(screen.id));
                const conflictWin = conflict ? getShowWindow(conflict) : null;

                return (
                  <label
                    key={screen.id}
                    className={`admin-screen-option${busy ? " is-busy" : ""}${
                      selected ? " is-selected" : ""
                    }`}
                    title={
                      busy
                        ? `Busy with "${conflict.movieName}" ${formatTimeRange(
                            conflictWin.start,
                            conflictWin.end
                          )}`
                        : undefined
                    }
                  >
                    <input
                      type={editingShow ? "radio" : "checkbox"}
                      name="screenPick"
                      disabled={busy}
                      checked={selected}
                      onChange={() =>
                        editingShow
                          ? setForm((f) => ({ ...f, screenIds: [String(screen.id)] }))
                          : toggleScreen(screen.id)
                      }
                    />
                    <span className="admin-screen-option-name">
                      {screen.screenName}
                      <span className="admin-screen-option-seats">
                        {screen.totalSeats} seats
                      </span>
                    </span>
                    {busy && (
                      <span className="admin-screen-option-busy">
                        Busy {formatTimeRange(conflictWin.start, conflictWin.end)}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="admin-form-bottom">
            <div className="admin-form-actions">
              <button type="button" className="admin-cancel-btn" onClick={onClose}>
                Done
              </button>
              <button type="submit" className="ticket-btn admin-add-btn" disabled={submitting}>
                {submitting
                  ? "Saving..."
                  : editingShow
                  ? "Save changes"
                  : `Schedule${form.screenIds.length > 1 ? ` (${form.screenIds.length} screens)` : ""}`}
              </button>
            </div>
          </div>
        </form>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Remove this schedule?"
          message={`"${movie.movieName}" on ${pendingDelete.screenName} at ${pendingDelete.showDate} ${pendingDelete.startTime} will be removed. This can't be undone.`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmRemove}
        />
      )}
    </div>
  );
}
