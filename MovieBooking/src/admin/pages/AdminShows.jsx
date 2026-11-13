import React, { useEffect, useMemo, useState } from "react";
import ConfirmDialog from "../ConfirmDialog";
import "../../App.css";
import "../Admin.css";
import {
  getAllShows,
  addShow,
  updateShow,
  deleteShow,
  cancelShow,
  regenerateShowSeats,
  getRunsEndingSoon,
  extendRun,
  declineRunExtension,
  cancelRun,
} from "../../services/showService";
import { getAllMovies } from "../../services/streamingMovieService";
import { getAllTheatres } from "../../services/theatreService";
import { getAllScreens, regenerateSeats } from "../../services/screenService";

// Matches ShowRequest: movieId, screenId, showDate, endDate, startTime,
// language, basePrice. location/theatreId are UI-only steps used to narrow
// down the Screen dropdown — only screenId actually gets sent to the
// backend. endDate is optional on the backend (null/blank = same as
// showDate, a one-off show); leaving it blank here keeps existing
// single-day behaviour unchanged.
const EMPTY_FORM = {
  movieId: "",
  location: "",
  theatreId: "",
  screenId: "",
  showDate: "",
  endDate: "",
  startTime: "",
  language: "",
  basePrice: "",
};

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm ?? "0:0").slice(0, 5).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Fixed daily slots — admins pick one of these instead of typing an
// arbitrary time. Values are "HH:mm" (what the backend's LocalTime expects).
const SHOW_TIME_SLOTS = [
  { value: "09:00", label: "9:00 AM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "17:00", label: "5:00 PM" },
  { value: "21:00", label: "9:00 PM" },
];

// A screen can only run one movie at a time. Two shows "collide" if their
// [start, start+duration+buffer) windows overlap on the same screen and
// date. Mirrors ShowServiceImpl.computeEndTime/validateNoOverlap on the
// backend (same 15-min buffer) — this is just an early UI check, the
// server is still the real guard against two admins submitting at once.
const SHOW_BUFFER_MINUTES = 15;

export default function AdminShows() {
  const [shows, setShows] = useState([]);
  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [screens, setScreens] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingCancel, setPendingCancel] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [fixingScreenId, setFixingScreenId] = useState(null);
  const [fixingShowId, setFixingShowId] = useState(null);
  // Only used when creating (not editing) — lets an admin check off screens
  // across several theatres/locations at once instead of repeating the
  // whole form per screen. Editing still targets exactly one existing show,
  // so it keeps using form.screenId (singular) below.
  const [selectedScreenIds, setSelectedScreenIds] = useState([]);
  const [batchResult, setBatchResult] = useState(null);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [filterDate, setFilterDate] = useState(todayStr);
  const [filterMovieId, setFilterMovieId] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterTheatreId, setFilterTheatreId] = useState("");

  const [runsEndingSoon, setRunsEndingSoon] = useState([]);
  const [runActionId, setRunActionId] = useState(null);

  const loadRunsEndingSoon = async () => {
    try {
      setRunsEndingSoon(await getRunsEndingSoon());
    } catch (err) {
      console.error(err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [showData, movieData, theatreData, screenData] = await Promise.all([
        getAllShows(),
        getAllMovies(),
        getAllTheatres(),
        getAllScreens(),
      ]);
      setShows(showData);
      setMovies(movieData);
      setTheatres(theatreData);
      setScreens(screenData);
    } catch (err) {
      setError("Couldn't load shows. Is the backend running on :8080?");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    loadRunsEndingSoon();
  }, []);

  // theatreId -> theatre, used to label screens and to filter the theatre
  // list down to whatever location is picked.
  const theatreById = useMemo(
    () => new Map(theatres.map((t) => [String(t.id), t])),
    [theatres]
  );

  // Distinct, sorted list of theatre cities — this is the "location" step.
  const locations = useMemo(
    () =>
      Array.from(new Set(theatres.map((t) => t.city).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [theatres]
  );

  // Theatres in the chosen location. Empty location = show none yet, admin
  // has to pick a location first (that's the whole point of the cascade).
  const theatresForLocation = useMemo(
    () => theatres.filter((t) => t.city === form.location),
    [theatres, form.location]
  );

  // Same idea for the filter bar's own Location -> Theatre cascade,
  // independent of the create-show form above.
  const theatresForFilterLocation = useMemo(
    () => (filterLocation ? theatres.filter((t) => t.city === filterLocation) : theatres),
    [theatres, filterLocation]
  );

  // Clears an inconsistent theatre selection when the location filter
  // changes out from under it (e.g. picking a new city while a theatre
  // from the old one is still selected).
  useEffect(() => {
    if (!filterTheatreId) return;
    const stillValid = theatresForFilterLocation.some((t) => String(t.id) === String(filterTheatreId));
    if (!stillValid) setFilterTheatreId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterLocation]);

  const filteredShows = useMemo(
    () =>
      shows.filter((show) => {
        if (filterDate && show.showDate !== filterDate) return false;
        if (filterMovieId && String(show.movieId) !== String(filterMovieId)) return false;
        if (filterTheatreId && String(show.theatreId) !== String(filterTheatreId)) return false;
        if (filterLocation && !filterTheatreId && show.city !== filterLocation) return false;
        return true;
      }),
    [shows, filterDate, filterMovieId, filterLocation, filterTheatreId]
  );

  // Groups filtered shows sharing a runId into one row (so a 7-day run
  // shows as "Aug 20 - Aug 27" instead of 7 separate rows). Shows without a
  // runId (one-off shows, or any run day that's outside the current
  // filters) stay as their own row.
  const groupedShows = useMemo(() => {
    const runGroups = new Map();
    const singles = [];
    for (const show of filteredShows) {
      if (show.runId) {
        if (!runGroups.has(show.runId)) runGroups.set(show.runId, []);
        runGroups.get(show.runId).push(show);
      } else {
        singles.push({ kind: "single", show });
      }
    }
    const groups = Array.from(runGroups.entries()).map(([runId, runShows]) => ({
      kind: "run",
      runId,
      shows: runShows.sort((a, b) => a.showDate.localeCompare(b.showDate)),
    }));
    return [...groups, ...singles].sort((a, b) => {
      const dateA = a.kind === "run" ? a.shows[0].showDate : a.show.showDate;
      const dateB = b.kind === "run" ? b.shows[0].showDate : b.show.showDate;
      return dateA.localeCompare(dateB);
    });
  }, [filteredShows]);

  // screen.totalSeats is just the *configured* number the admin typed in —
  // it does NOT mean seats were actually generated. The backend also
  // returns actualSeatCount/misconfigured (real Seat row count), which is
  // what we need here: a screen can show totalSeats: 50 and still have 0
  // real seats if it was created outside the normal "Add screen" flow.
  // Fall back to totalSeats only for older API responses that don't send
  // the new fields yet.
  const hasSeats = (s) =>
    s.misconfigured != null || s.actualSeatCount != null
      ? Number(s.actualSeatCount) > 0
      : Number(s.totalSeats) > 0;

  const seatCountLabel = (s) => (s.actualSeatCount != null ? s.actualSeatCount : s.totalSeats);

  // Screens on the chosen theatre, broken ones last so they don't get
  // buried among usable options.
  const screensForTheatre = useMemo(
    () =>
      screens
        .filter((s) => String(s.theatreId) === String(form.theatreId))
        .sort((a, b) => Number(hasSeats(b)) - Number(hasSeats(a))),
    [screens, form.theatreId]
  );

  const selectedScreen = useMemo(
    () => screens.find((s) => String(s.id) === String(form.screenId)) || null,
    [screens, form.screenId]
  );

  const screenLabel = (s) =>
    hasSeats(s)
      ? `${s.screenName} (${seatCountLabel(s)} seats)`
      : `${s.screenName} — no seats set up`;

  // Groups every screen by location -> theatre for the batch-schedule
  // checklist, so an admin can scan and check screens across many
  // theatres/locations without re-picking a cascade each time.
  const screensByLocation = useMemo(() => {
    const byLocation = new Map();
    for (const theatre of theatres) {
      const loc = theatre.city || "Unknown location";
      const theatreScreens = screens
        .filter((s) => String(s.theatreId) === String(theatre.id))
        .sort((a, b) => Number(hasSeats(b)) - Number(hasSeats(a)));
      if (theatreScreens.length === 0) continue;
      if (!byLocation.has(loc)) byLocation.set(loc, []);
      byLocation.get(loc).push({ theatre, theatreScreens });
    }
    return Array.from(byLocation.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [theatres, screens]);

  const toggleScreenSelected = (screenId) => {
    setSelectedScreenIds((prev) =>
      prev.includes(screenId) ? prev.filter((id) => id !== screenId) : [...prev, screenId]
    );
  };

  const toggleTheatreSelected = (theatreScreens) => {
    const ids = theatreScreens.filter(hasSeats).map((s) => s.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedScreenIds.includes(id));
    setSelectedScreenIds((prev) =>
      allSelected
        ? prev.filter((id) => !ids.includes(id))
        : Array.from(new Set([...prev, ...ids]))
    );
  };

  // Same overlap check as findScheduleConflict, but for an arbitrary
  // screenId — used per-screen while batch-scheduling, since each screen
  // in the selection can have a different existing schedule.
  const findConflictFor = (screenId) => {
    if (!form.showDate || !form.startTime) return null;
    const newStart = toMinutes(form.startTime);
    const newEnd = newStart + (Number(selectedMovie?.duration) || 90) + SHOW_BUFFER_MINUTES;
    return (
      shows.find((show) => {
        if (String(show.screenId) !== String(screenId)) return false;
        if (show.showDate !== form.showDate) return false;
        const existingStart = toMinutes(show.startTime);
        const existingEnd = show.endTime
          ? toMinutes(show.endTime)
          : existingStart + (Number(movies.find((m) => String(m.id) === String(show.movieId))?.duration) || 90) + SHOW_BUFFER_MINUTES;
        return newStart < existingEnd && existingStart < newEnd;
      }) || null
    );
  };

  const selectedMovie = useMemo(
    () => movies.find((m) => String(m.id) === String(form.movieId)),
    [movies, form.movieId]
  );

  // A screen can only run one movie at a time. Two shows "collide" if their
  // [start, start+duration+buffer) windows overlap on the same screen and
  // date. Mirrors ShowServiceImpl.computeEndTime/validateNoOverlap on the
  // backend (same 15-min buffer) — this is just an early UI check, the
  // server is still the real guard against two admins submitting at once.
  const findScheduleConflict = () => {
    if (!form.screenId || !form.showDate || !form.startTime) return null;
    const newStart = toMinutes(form.startTime);
    const newEnd = newStart + (Number(selectedMovie?.duration) || 90) + SHOW_BUFFER_MINUTES;

    return (
      shows.find((show) => {
        if (editingId && String(show.id) === String(editingId)) return false;
        if (String(show.screenId) !== String(form.screenId)) return false;
        if (show.showDate !== form.showDate) return false;

        const existingStart = toMinutes(show.startTime);
        // The backend already returns endTime with the buffer baked in.
        const existingEnd = show.endTime
          ? toMinutes(show.endTime)
          : existingStart + (Number(movies.find((m) => String(m.id) === String(show.movieId))?.duration) || 90) + SHOW_BUFFER_MINUTES;

        return newStart < existingEnd && existingStart < newEnd;
      }) || null
    );
  };

  const timeLabel = (hhmmss) => {
    const hhmm = String(hhmmss ?? "").slice(0, 5);
    return SHOW_TIME_SLOTS.find((slot) => slot.value === hhmm)?.label ?? hhmm;
  };

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      // Language now rides along with the movie pick — no manual entry.
      if (field === "movieId") {
        const movie = movies.find((m) => String(m.id) === String(value));
        return { ...f, movieId: value, language: movie?.language ?? "" };
      }
      // Cascade: picking a new location invalidates whatever theatre/screen
      // was picked before it; picking a new theatre invalidates the screen.
      if (field === "location") {
        return { ...f, location: value, theatreId: "", screenId: "" };
      }
      if (field === "theatreId") {
        return { ...f, theatreId: value, screenId: "" };
      }
      return { ...f, [field]: value };
    });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setSelectedScreenIds([]);
    setBatchResult(null);
    setError(null);
  };

  const startEdit = (show) => {
    setEditingId(show.id);
    const movie = movies.find((m) => String(m.id) === String(show.movieId));
    const screen = screens.find((s) => String(s.id) === String(show.screenId));
    const theatre = theatreById.get(String(screen?.theatreId ?? show.theatreId));
    setForm({
      movieId: String(show.movieId),
      location: theatre?.city ?? "",
      theatreId: theatre ? String(theatre.id) : "",
      screenId: String(show.screenId),
      showDate: show.showDate ?? "",
      startTime: (show.startTime ?? "").slice(0, 5), // "HH:mm:ss" -> "HH:mm"
      language: movie?.language ?? show.language ?? "",
      basePrice: show.basePrice ?? "",
    });
    setSelectedScreenIds([]);
    setBatchResult(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBatchResult(null);

    if (editingId) {
      // Editing targets exactly one existing show — same single-screen
      // validation and submit path as before.
      const required = ["movieId", "location", "theatreId", "screenId", "showDate", "startTime", "basePrice"];
      const missing = required.filter((f) => !String(form[f] ?? "").trim());
      if (missing.length > 0) {
        setError(`Please fill in: ${missing.join(", ")}.`);
        return;
      }

      if (selectedScreen && !hasSeats(selectedScreen)) {
        setError(
          `"${selectedScreen.screenName}" has no seats set up yet, so it can't host a show. ` +
            `Fix it from the Theatres page first (open the theatre → edit that screen with a seat count).`
        );
        return;
      }

      const conflict = findScheduleConflict();
      if (conflict) {
        setError(
          `That screen is already showing "${conflict.movieName}" at ${timeLabel(
            conflict.startTime
          )} on ${conflict.showDate}. Pick a different time or screen.`
        );
        return;
      }

      setSubmitting(true);
      setError(null);
      try {
        await updateShow(editingId, form);
        resetForm();
        await loadAll();
      } catch (err) {
        setError(err.response?.data?.message || "Couldn't update the show.");
        console.error(err);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Creating: schedule the same movie/date/time/price across every
    // checked screen. Screens can span multiple theatres and locations —
    // that's the whole point, so the admin doesn't have to redo this form
    // once per screen.
    const required = ["movieId", "showDate", "startTime", "basePrice"];
    const missing = required.filter((f) => !String(form[f] ?? "").trim());
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.join(", ")}.`);
      return;
    }
    if (selectedScreenIds.length === 0) {
      setError("Check at least one screen to schedule this movie on.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const results = await Promise.allSettled(
        selectedScreenIds.map(async (screenId) => {
          const screen = screens.find((s) => String(s.id) === String(screenId));
          if (screen && !hasSeats(screen)) {
            throw new Error(`${screen.screenName} has no seats set up`);
          }
          const conflict = findConflictFor(screenId);
          if (conflict) {
            throw new Error(
              `${screen?.screenName ?? "Screen"} already has "${conflict.movieName}" at ${timeLabel(conflict.startTime)}`
            );
          }
          await addShow({ ...form, screenId });
          return screen?.screenName ?? `Screen ${screenId}`;
        })
      );

      const succeeded = results.filter((r) => r.status === "fulfilled");
      const failed = results
        .map((r, i) => ({ r, screenId: selectedScreenIds[i] }))
        .filter(({ r }) => r.status === "rejected");

      setBatchResult({
        succeeded: succeeded.map((r) => r.value),
        failed: failed.map(({ r, screenId }) => {
          const screen = screens.find((s) => String(s.id) === String(screenId));
          return `${screen?.screenName ?? "Screen"}: ${r.reason?.response?.data?.message || r.reason?.message || "failed"}`;
        }),
      });

      if (failed.length === 0) {
        resetForm();
      } else {
        // Keep the failed screens checked so the admin can see what to
        // retry; drop the ones that succeeded.
        setSelectedScreenIds(failed.map(({ screenId }) => screenId));
      }
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't schedule the show.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmRemove = async () => {
    try {
      await deleteShow(pendingDelete.id);
      setShows((s) => s.filter((show) => show.id !== pendingDelete.id));
      if (editingId === pendingDelete.id) resetForm();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't delete the show.");
      console.error(err);
    } finally {
      setPendingDelete(null);
    }
  };

  // Admin-initiated cancellation: refunds any confirmed bookings in full
  // (no cancellation fee — that's only for a customer cancelling their own
  // booking) and releases every seat, but keeps the show record itself so
  // booking/refund history isn't lost. Confirmed separately from Remove
  // since it moves real money.
  const confirmCancelShow = async () => {
    try {
      await cancelShow(pendingCancel.id);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't cancel the show.");
      console.error(err);
    } finally {
      setPendingCancel(null);
    }
  };

  // Generates the missing seat grid for a screen that has 0 real seats
  // (POST /api/screens/{id}/regenerate-seats — backend refuses if the
  // screen already has seats, so this is safe to offer whenever the UI
  // shows 0). Refreshes screens + shows afterwards so totals update
  // everywhere (this form's dropdown and the table below both read from
  // the same `screens`/`shows` state).
  const handleFixSeats = async (screenId) => {
    setFixingScreenId(screenId);
    setError(null);
    try {
      await regenerateSeats(screenId);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't regenerate seats for that screen.");
      console.error(err);
    } finally {
      setFixingScreenId(null);
    }
  };

  // Runs ending soon: extend pushes the endDate out and creates the new
  // days' shows; declining just stops the reminder for this endDate (the
  // run still ends and gets cleaned up automatically on schedule — see
  // ShowRunScheduler on the backend).
  const handleExtendRun = async (runId, days) => {
    setRunActionId(runId);
    setError(null);
    try {
      await extendRun(runId, days);
      await Promise.all([loadRunsEndingSoon(), loadAll()]);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't extend that run.");
      console.error(err);
    } finally {
      setRunActionId(null);
    }
  };

  const handleDeclineExtension = async (runId) => {
    setRunActionId(runId);
    setError(null);
    try {
      await declineRunExtension(runId);
      await loadRunsEndingSoon();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't update that run.");
      console.error(err);
    } finally {
      setRunActionId(null);
    }
  };

  const handleCancelRun = async (runId) => {
    setRunActionId(runId);
    setError(null);
    try {
      await cancelRun(runId);
      await Promise.all([loadRunsEndingSoon(), loadAll()]);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't cancel that run.");
      console.error(err);
    } finally {
      setRunActionId(null);
    }
  };

  // Fixes a SHOW that has 0 real ShowSeat rows — this is different from
  // handleFixSeats above: that one fixes a screen's seat grid, this one
  // fixes a specific show's copy of it. A show scheduled before its screen
  // had seats stays at 0 forever until this runs, even after the screen
  // itself gets fixed — that mismatch is exactly what shows up as a full
  // seat count in this table but an empty seat map on the booking page.
  const handleFixShowSeats = async (showId) => {
    setFixingShowId(showId);
    setError(null);
    try {
      await regenerateShowSeats(showId);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't regenerate seats for that show.");
      console.error(err);
    } finally {
      setFixingShowId(null);
    }
  };

  // The original per-show row markup, extracted so it can be reused for
  // both a standalone one-off show and (if filters narrow a run down to
  // one visible day) a run's individual day.
  const renderShowRow = (show) => (
    <div
      className={`admin-table-row${editingId === show.id ? " is-editing" : ""}`}
      key={show.id}
    >
      <span>
        {show.movieName}
        {show.cancelled && (
          <span className="admin-status-pill admin-status-pill--cancelled" title="Cancelled by an admin — refunded and no longer bookable.">
            Cancelled
          </span>
        )}
      </span>
      <span>
        {show.theatreName} · {show.screenName}
      </span>
      <span>
        {show.showDate} · {timeLabel(show.startTime)}
      </span>
      <span>
        {!show.misconfigured ? (
          `${show.availableSeats}/${show.totalSeats} available`
        ) : (
          (() => {
            // Two different problems can cause a show to have 0
            // seats: its screen itself has none generated yet (fix
            // the screen), or the screen is fine but this show was
            // scheduled before the screen got fixed (fix the show).
            const screen = screens.find((sc) => String(sc.id) === String(show.screenId));
            const screenBroken = screen ? !hasSeats(screen) : false;
            return (
              <span className="admin-fix-seats-hint">
                <span
                  className="admin-error-text"
                  title={
                    screenBroken
                      ? "This show's screen has no seats generated."
                      : "This show has no seats generated — its screen is fine, this show just needs regenerating."
                  }
                >
                  0 seats ({screenBroken ? "screen" : "show"} misconfigured)
                </span>
                {screenBroken ? (
                  <button
                    type="button"
                    className="admin-fix-seats-btn"
                    onClick={() => handleFixSeats(show.screenId)}
                    disabled={fixingScreenId === show.screenId}
                  >
                    {fixingScreenId === show.screenId ? "Fixing…" : "Fix screen"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="admin-fix-seats-btn"
                    onClick={() => handleFixShowSeats(show.id)}
                    disabled={fixingShowId === show.id}
                  >
                    {fixingShowId === show.id ? "Fixing…" : "Fix seats"}
                  </button>
                )}
              </span>
            );
          })()
        )}
      </span>
      <span className="admin-row-actions">
        <button
          type="button"
          className="admin-edit-btn"
          onClick={() => startEdit(show)}
          aria-label={`Edit show ${show.id}`}
          title="Edit"
        >
          ✏️
        </button>
        {!show.cancelled && (
          <button
            type="button"
            className="admin-cancel-show-btn"
            onClick={() => setPendingCancel(show)}
            aria-label={`Cancel show ${show.id}`}
            title="Cancel this show — refunds any confirmed bookings in full and frees the seats."
          >
            Cancel show
          </button>
        )}
        <button
          className="admin-remove-btn"
          onClick={() => setPendingDelete(show)}
          aria-label={`Remove show ${show.id}`}
        >
          Remove
        </button>
      </span>
    </div>
  );

  return (
    <div>
      <h1 className="admin-page-title">Shows</h1>
      <p className="admin-page-subtext">
        Schedule a movie onto a screen — this also opens up its seat map for booking.
      </p>

      {error && <p className="admin-empty-state admin-error-text">{error}</p>}

      {runsEndingSoon.length > 0 && (
        <div className="admin-runs-ending-panel">
          <h2 className="admin-runs-ending-title">Runs ending soon</h2>
          {runsEndingSoon.map((run) => (
            <div className="admin-runs-ending-row" key={run.id}>
              <div className="admin-runs-ending-info">
                <strong>{run.movieName}</strong>
                <span>
                  {run.theatreName} · {run.screenName} · ends {run.endDate}
                </span>
              </div>
              <div className="admin-runs-ending-actions">
                {[3, 5, 7].map((days) => (
                  <button
                    key={days}
                    type="button"
                    className="admin-runs-ending-extend-btn"
                    onClick={() => handleExtendRun(run.id, days)}
                    disabled={runActionId === run.id}
                  >
                    +{days}d
                  </button>
                ))}
                <button
                  type="button"
                  className="admin-cancel-btn"
                  onClick={() => handleDeclineExtension(run.id)}
                  disabled={runActionId === run.id}
                >
                  Let it end
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && screens.length === 0 && (
        <p className="admin-empty-state">
          No screens yet. Go to the Theatres page, add a theatre, then open it and add a
          screen with a seat count before scheduling a show.
        </p>
      )}

      <form className="admin-add-form admin-add-form--shows" onSubmit={handleSubmit}>
        {editingId && (
          <div className="admin-form-banner">
            Editing show <strong>#{editingId}</strong>
            <button type="button" className="admin-form-banner-cancel" onClick={resetForm}>
              Cancel
            </button>
          </div>
        )}

        <div className="admin-form-fields">
          <label className="admin-field">
            <span className="admin-field-label">Movie</span>
            <select value={form.movieId} onChange={handleChange("movieId")} required>
              <option value="">Select a movie</option>
              {movies.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.movieName}
                </option>
              ))}
            </select>
            {selectedMovie && (
              <span className="admin-field-hint">Language: {selectedMovie.language}</span>
            )}
          </label>

          {editingId ? (
            <>
              <label className="admin-field">
                <span className="admin-field-label">Location</span>
                <select value={form.location} onChange={handleChange("location")} required>
                  <option value="">Select a location</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span className="admin-field-label">Theatre</span>
                <select
                  value={form.theatreId}
                  onChange={handleChange("theatreId")}
                  disabled={!form.location}
                  required
                >
                  <option value="">
                    {form.location ? "Select a theatre" : "Pick a location first"}
                  </option>
                  {theatresForLocation.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.theatreName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span className="admin-field-label">Screen</span>
                <select
                  value={form.screenId}
                  onChange={handleChange("screenId")}
                  disabled={!form.theatreId}
                  required
                >
                  <option value="">
                    {form.theatreId ? "Select a screen" : "Pick a theatre first"}
                  </option>
                  {screensForTheatre.map((s) => (
                    <option key={s.id} value={s.id} disabled={!hasSeats(s)}>
                      {screenLabel(s)}
                    </option>
                  ))}
                </select>
                {form.theatreId && screensForTheatre.length === 0 && (
                  <span className="admin-field-hint admin-error-text">
                    This theatre has no screens yet — add one from the Theatres page.
                  </span>
                )}
                {selectedScreen && !hasSeats(selectedScreen) && (
                  <span className="admin-field-hint admin-error-text admin-fix-seats-hint">
                    This screen has no seats set up — it can't host a show yet.
                    <button
                      type="button"
                      className="admin-fix-seats-btn"
                      onClick={() => handleFixSeats(selectedScreen.id)}
                      disabled={fixingScreenId === selectedScreen.id}
                    >
                      {fixingScreenId === selectedScreen.id ? "Fixing…" : "Fix seats now"}
                    </button>
                  </span>
                )}
              </label>
            </>
          ) : (
            <label className="admin-field admin-field--wide">
              <span className="admin-field-label">
                Screens ({selectedScreenIds.length} selected)
              </span>
              {screensByLocation.length === 0 ? (
                <span className="admin-field-hint">
                  No screens yet — add a theatre and screen from the Theatres page first.
                </span>
              ) : (
                <div className="admin-screen-checklist">
                  {screensByLocation.map(([location, theatreGroups]) => (
                    <div className="admin-screen-checklist-location" key={location}>
                      <span className="admin-screen-checklist-location-label">{location}</span>
                      {theatreGroups.map(({ theatre, theatreScreens }) => {
                        const usableIds = theatreScreens.filter(hasSeats).map((s) => s.id);
                        const allSelected =
                          usableIds.length > 0 && usableIds.every((id) => selectedScreenIds.includes(id));
                        return (
                          <div className="admin-screen-checklist-theatre" key={theatre.id}>
                            <div className="admin-screen-checklist-theatre-head">
                              <span>{theatre.theatreName}</span>
                              {usableIds.length > 1 && (
                                <button
                                  type="button"
                                  className="admin-screen-checklist-select-all"
                                  onClick={() => toggleTheatreSelected(theatreScreens)}
                                >
                                  {allSelected ? "Unselect all" : "Select all"}
                                </button>
                              )}
                            </div>
                            <div className="admin-screen-checklist-options">
                              {theatreScreens.map((s) => (
                                <label
                                  key={s.id}
                                  className={`admin-screen-checklist-item${!hasSeats(s) ? " is-disabled" : ""}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedScreenIds.includes(s.id)}
                                    disabled={!hasSeats(s)}
                                    onChange={() => toggleScreenSelected(s.id)}
                                  />
                                  {screenLabel(s)}
                                  {!hasSeats(s) && (
                                    <button
                                      type="button"
                                      className="admin-fix-seats-btn"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleFixSeats(s.id);
                                      }}
                                      disabled={fixingScreenId === s.id}
                                    >
                                      {fixingScreenId === s.id ? "Fixing…" : "Fix seats"}
                                    </button>
                                  )}
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </label>
          )}

          <label className="admin-field">
            <span className="admin-field-label">Start date</span>
            <input type="date" value={form.showDate} onChange={handleChange("showDate")} required />
          </label>

          {!editingId && (
            <label className="admin-field">
              <span className="admin-field-label">End date</span>
              <input
                type="date"
                value={form.endDate}
                min={form.showDate || undefined}
                onChange={handleChange("endDate")}
              />
              <span className="admin-field-hint">
                Leave blank to schedule just one day. Runs for multiple days show one row
                below and can be extended (3/5/7 days) before they end.
              </span>
            </label>
          )}

          <label className="admin-field">
            <span className="admin-field-label">Start time</span>
            <select value={form.startTime} onChange={handleChange("startTime")} required>
              <option value="">Select a time</option>
              {SHOW_TIME_SLOTS.map((slot) => (
                <option key={slot.value} value={slot.value}>
                  {slot.label}
                </option>
              ))}
            </select>
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

        {batchResult && (
          <div className="admin-batch-result">
            {batchResult.succeeded.length > 0 && (
              <p className="admin-batch-result-success">
                Scheduled on {batchResult.succeeded.length}: {batchResult.succeeded.join(", ")}
              </p>
            )}
            {batchResult.failed.length > 0 && (
              <p className="admin-batch-result-failed">
                Skipped {batchResult.failed.length}: {batchResult.failed.join("; ")}
              </p>
            )}
          </div>
        )}

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
                  : "Scheduling..."
                : editingId
                ? "Save changes"
                : selectedScreenIds.length > 1
                ? `Schedule on ${selectedScreenIds.length} screens`
                : "Schedule show"}
            </button>
          </div>
        </div>
      </form>

      <div className="admin-shows-filters">
        <label className="admin-field">
          <span className="admin-field-label">Date</span>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        </label>
        <label className="admin-field">
          <span className="admin-field-label">Movie</span>
          <select value={filterMovieId} onChange={(e) => setFilterMovieId(e.target.value)}>
            <option value="">All movies</option>
            {movies.map((m) => (
              <option key={m.id} value={m.id}>
                {m.movieName}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span className="admin-field-label">Location</span>
          <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
            <option value="">All locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span className="admin-field-label">Theatre</span>
          <select value={filterTheatreId} onChange={(e) => setFilterTheatreId(e.target.value)}>
            <option value="">All theatres</option>
            {theatresForFilterLocation.map((t) => (
              <option key={t.id} value={t.id}>
                {t.theatreName}
              </option>
            ))}
          </select>
        </label>
        {(filterDate !== todayStr || filterMovieId || filterLocation || filterTheatreId) && (
          <button
            type="button"
            className="admin-cancel-btn admin-shows-filters-clear"
            onClick={() => {
              setFilterDate(todayStr);
              setFilterMovieId("");
              setFilterLocation("");
              setFilterTheatreId("");
            }}
          >
            Reset filters
          </button>
        )}
      </div>

      <div className="admin-table admin-table--shows">
        <div className="admin-table-head">
          <span>Movie</span>
          <span>Theatre / Screen</span>
          <span>When</span>
          <span>Seats</span>
          <span></span>
        </div>

        {loading && <p className="admin-empty-state">Loading shows…</p>}

        {!loading &&
          groupedShows.map((group) => {
            if (group.kind === "run") {
              const first = group.shows[0];
              const last = group.shows[group.shows.length - 1];
              const totalAvailable = group.shows.reduce((sum, s) => sum + (s.availableSeats || 0), 0);
              const totalSeats = group.shows.reduce((sum, s) => sum + (s.totalSeats || 0), 0);
              const anyCancelled = group.shows.some((s) => s.cancelled);
              return (
                <div className="admin-table-row" key={`run-${group.runId}`}>
                  <span>
                    {first.movieName}
                    {anyCancelled && (
                      <span className="admin-status-pill admin-status-pill--cancelled" title="Cancelled by an admin — refunded and no longer bookable.">
                        Cancelled
                      </span>
                    )}
                  </span>
                  <span>
                    {first.theatreName} · {first.screenName}
                  </span>
                  <span>
                    {first.showDate} – {last.showDate} · {timeLabel(first.startTime)} ·{" "}
                    {group.shows.length} shows
                  </span>
                  <span>
                    {totalAvailable}/{totalSeats} available
                  </span>
                  <span className="admin-row-actions">
                    {!anyCancelled && (
                      <button
                        type="button"
                        className="admin-cancel-show-btn"
                        onClick={() => handleCancelRun(group.runId)}
                        disabled={runActionId === group.runId}
                        title="Cancel every remaining show in this run — refunds any confirmed bookings in full."
                      >
                        {runActionId === group.runId ? "Cancelling…" : "Cancel run"}
                      </button>
                    )}
                  </span>
                </div>
              );
            }
            return renderShowRow(group.show);
          })}

        {!loading && groupedShows.length === 0 && (
          <p className="admin-empty-state">
            {shows.length === 0
              ? "No shows scheduled yet — add one above."
              : "No shows match these filters."}
          </p>
        )}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Remove this show?"
          message={`The show for "${pendingDelete.movieName}" on ${pendingDelete.showDate} will be removed. This can't be undone.`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmRemove}
        />
      )}

      {pendingCancel && (
        <ConfirmDialog
          title="Cancel this show?"
          message={`Any confirmed bookings for "${pendingCancel.movieName}" on ${pendingCancel.showDate} will be refunded in full, and the show will no longer be bookable. This can't be undone.`}
          onCancel={() => setPendingCancel(null)}
          onConfirm={confirmCancelShow}
        />
      )}
    </div>
  );
}