import React, { useEffect, useState } from "react";
import ConfirmDialog from "../ConfirmDialog";
import "../../App.css";
import "../Admin.css";
import {
  getAllTheatres,
  addTheatre,
  updateTheatre,
  deleteTheatre,
} from "../../services/theatreService";
import {
  getAllScreens,
  addScreen,
  updateScreen,
  deleteScreen,
  regenerateSeats,
} from "../../services/screenService";

// Matches TheatreRequest: theatreName, address, city, phone.
const EMPTY_THEATRE_FORM = {
  theatreName: "",
  address: "",
  city: "",
  phone: "",
};

// Matches ScreenRequest: screenName, totalSeats, theatreId. theatreId comes
// from whichever theatre panel is open, not typed by the admin.
const EMPTY_SCREEN_FORM = {
  screenName: "",
  totalSeats: "",
};

export default function AdminTheatres() {
  const [theatres, setTheatres] = useState([]);
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Theatre form
  const [theatreForm, setTheatreForm] = useState(EMPTY_THEATRE_FORM);
  const [editingTheatreId, setEditingTheatreId] = useState(null);
  const [submittingTheatre, setSubmittingTheatre] = useState(false);
  const [pendingDeleteTheatre, setPendingDeleteTheatre] = useState(null);

  // Which theatre's screens panel is open, plus that panel's own form state.
  const [expandedTheatreId, setExpandedTheatreId] = useState(null);
  const [screenForm, setScreenForm] = useState(EMPTY_SCREEN_FORM);
  const [editingScreenId, setEditingScreenId] = useState(null);
  const [submittingScreen, setSubmittingScreen] = useState(false);
  const [screenError, setScreenError] = useState(null);
  const [pendingDeleteScreen, setPendingDeleteScreen] = useState(null);
  const [fixingScreenId, setFixingScreenId] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [theatreData, screenData] = await Promise.all([
        getAllTheatres(),
        getAllScreens(),
      ]);
      setTheatres(theatreData);
      setScreens(screenData);
    } catch (err) {
      setError("Couldn't load theatres. Is the backend running on :8080?");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const screensFor = (theatreId) =>
    screens.filter((s) => String(s.theatreId) === String(theatreId));

  // ---------------- Theatre form ----------------

  const handleTheatreChange = (field) => (e) =>
    setTheatreForm((f) => ({ ...f, [field]: e.target.value }));

  const resetTheatreForm = () => {
    setTheatreForm(EMPTY_THEATRE_FORM);
    setEditingTheatreId(null);
    setError(null);
  };

  const startEditTheatre = (theatre) => {
    setEditingTheatreId(theatre.id);
    setTheatreForm({
      theatreName: theatre.theatreName ?? "",
      address: theatre.address ?? "",
      city: theatre.city ?? "",
      phone: theatre.phone ?? "",
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTheatreSubmit = async (e) => {
    e.preventDefault();

    const required = ["theatreName", "address", "city", "phone"];
    const missing = required.filter((f) => !String(theatreForm[f] ?? "").trim());
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.join(", ")}.`);
      return;
    }

    setSubmittingTheatre(true);
    setError(null);
    try {
      if (editingTheatreId) {
        await updateTheatre(editingTheatreId, theatreForm);
      } else {
        await addTheatre(theatreForm);
      }
      resetTheatreForm();
      await loadAll();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (editingTheatreId ? "Couldn't update the theatre." : "Couldn't add the theatre.")
      );
      console.error(err);
    } finally {
      setSubmittingTheatre(false);
    }
  };

  const confirmRemoveTheatre = async () => {
    try {
      await deleteTheatre(pendingDeleteTheatre.id);
      setTheatres((t) => t.filter((theatre) => theatre.id !== pendingDeleteTheatre.id));
      if (editingTheatreId === pendingDeleteTheatre.id) resetTheatreForm();
      if (expandedTheatreId === pendingDeleteTheatre.id) setExpandedTheatreId(null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Couldn't delete the theatre. Remove its screens first if it has any."
      );
      console.error(err);
    } finally {
      setPendingDeleteTheatre(null);
    }
  };

  // ---------------- Screens panel (per theatre) ----------------

  const resetScreenForm = () => {
    setScreenForm(EMPTY_SCREEN_FORM);
    setEditingScreenId(null);
    setScreenError(null);
  };

  const toggleScreensPanel = (theatreId) => {
    const opening = expandedTheatreId !== theatreId;
    setExpandedTheatreId(opening ? theatreId : null);
    resetScreenForm();
  };

  const handleScreenChange = (field) => (e) =>
    setScreenForm((f) => ({ ...f, [field]: e.target.value }));

  const startEditScreen = (screen) => {
    setEditingScreenId(screen.id);
    setScreenForm({
      screenName: screen.screenName ?? "",
      totalSeats: screen.totalSeats ?? "",
    });
    setScreenError(null);
  };

  const handleScreenSubmit = async (theatreId) => async (e) => {
    e.preventDefault();

    const required = ["screenName", "totalSeats"];
    const missing = required.filter((f) => !String(screenForm[f] ?? "").trim());
    if (missing.length > 0) {
      setScreenError(`Please fill in: ${missing.join(", ")}.`);
      return;
    }

    setSubmittingScreen(true);
    setScreenError(null);
    try {
      const payload = { ...screenForm, theatreId };
      if (editingScreenId) {
        await updateScreen(editingScreenId, payload);
      } else {
        await addScreen(payload);
      }
      resetScreenForm();
      await loadAll();
    } catch (err) {
      setScreenError(
        err.response?.data?.message ||
          (editingScreenId ? "Couldn't update the screen." : "Couldn't add the screen.")
      );
      console.error(err);
    } finally {
      setSubmittingScreen(false);
    }
  };

  const confirmRemoveScreen = async () => {
    try {
      await deleteScreen(pendingDeleteScreen.id);
      setScreens((s) => s.filter((screen) => screen.id !== pendingDeleteScreen.id));
      if (editingScreenId === pendingDeleteScreen.id) resetScreenForm();
    } catch (err) {
      setScreenError(err.response?.data?.message || "Couldn't delete the screen.");
      console.error(err);
    } finally {
      setPendingDeleteScreen(null);
    }
  };

  // A screen with totalSeats: 0 (from GET /api/screens) has no real Seat
  // rows generated for it — usually because it was created outside the
  // normal "Add screen" form. This regenerates its seat grid in place.
  const handleFixSeats = async (screenId) => {
    setFixingScreenId(screenId);
    setScreenError(null);
    try {
      await regenerateSeats(screenId);
      await loadAll();
    } catch (err) {
      setScreenError(err.response?.data?.message || "Couldn't regenerate seats for that screen.");
      console.error(err);
    } finally {
      setFixingScreenId(null);
    }
  };

  return (
    <div>
      <h1 className="admin-page-title">Theatres</h1>
      <p className="admin-page-subtext">
        Add a theatre, then open it to add its screens — that's what fills the Screen
        dropdown when scheduling a show.
      </p>

      {error && <p className="admin-empty-state admin-error-text">{error}</p>}

      <form className="admin-add-form admin-add-form--theatres" onSubmit={handleTheatreSubmit}>
        {editingTheatreId && (
          <div className="admin-form-banner">
            Editing <strong>{theatreForm.theatreName || "theatre"}</strong>
            <button type="button" className="admin-form-banner-cancel" onClick={resetTheatreForm}>
              Cancel
            </button>
          </div>
        )}

        <div className="admin-form-fields">
          <label className="admin-field">
            <span className="admin-field-label">Theatre name</span>
            <input value={theatreForm.theatreName} onChange={handleTheatreChange("theatreName")} required />
          </label>

          <label className="admin-field">
            <span className="admin-field-label">City</span>
            <input value={theatreForm.city} onChange={handleTheatreChange("city")} required />
          </label>

          <label className="admin-field">
            <span className="admin-field-label">Phone</span>
            <input value={theatreForm.phone} onChange={handleTheatreChange("phone")} required />
          </label>

          <label className="admin-field admin-field--full">
            <span className="admin-field-label">Address</span>
            <input value={theatreForm.address} onChange={handleTheatreChange("address")} required />
          </label>
        </div>

        <div className="admin-form-bottom">
          <div className="admin-form-actions">
            {editingTheatreId && (
              <button type="button" className="admin-cancel-btn" onClick={resetTheatreForm}>
                Cancel
              </button>
            )}
            <button type="submit" className="ticket-btn admin-add-btn" disabled={submittingTheatre}>
              {submittingTheatre
                ? editingTheatreId
                  ? "Saving..."
                  : "Adding..."
                : editingTheatreId
                ? "Save changes"
                : "Add theatre"}
            </button>
          </div>
        </div>
      </form>

      <div className="admin-table admin-table--theatres">
        <div className="admin-table-head">
          <span>Theatre</span>
          <span>City</span>
          <span>Phone</span>
          <span>Screens</span>
          <span></span>
        </div>

        {loading && <p className="admin-empty-state">Loading theatres…</p>}

        {!loading &&
          theatres.map((theatre) => {
            const isExpanded = expandedTheatreId === theatre.id;
            const theatreScreens = screensFor(theatre.id);

            return (
              <React.Fragment key={theatre.id}>
                <div
                  className={`admin-table-row${editingTheatreId === theatre.id ? " is-editing" : ""}`}
                >
                  <span>{theatre.theatreName}</span>
                  <span>{theatre.city}</span>
                  <span>{theatre.phone}</span>
                  <span>{theatreScreens.length}</span>
                  <span className="admin-row-actions">
                    <button
                      type="button"
                      className="admin-screens-toggle-btn"
                      onClick={() => toggleScreensPanel(theatre.id)}
                    >
                      {isExpanded ? "Hide screens" : "Manage screens"}
                    </button>
                    <button
                      type="button"
                      className="admin-edit-btn"
                      onClick={() => startEditTheatre(theatre)}
                      aria-label={`Edit ${theatre.theatreName}`}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      className="admin-remove-btn"
                      onClick={() => setPendingDeleteTheatre(theatre)}
                      disabled={theatreScreens.length > 0}
                      title={
                        theatreScreens.length > 0
                          ? "Remove its screens first"
                          : undefined
                      }
                      aria-label={`Remove ${theatre.theatreName}`}
                    >
                      Remove
                    </button>
                  </span>
                </div>

                {isExpanded && (
                  <div className="admin-screens-panel">
                    {screenError && (
                      <p className="admin-empty-state admin-error-text">{screenError}</p>
                    )}

                    <form
                      className="admin-screens-form"
                      onSubmit={handleScreenSubmit(theatre.id)}
                    >
                      {editingScreenId && (
                        <div className="admin-form-banner">
                          Editing screen <strong>#{editingScreenId}</strong>
                          <button
                            type="button"
                            className="admin-form-banner-cancel"
                            onClick={resetScreenForm}
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      <label className="admin-field">
                        <span className="admin-field-label">Screen name</span>
                        <input
                          value={screenForm.screenName}
                          onChange={handleScreenChange("screenName")}
                          placeholder="Screen 1"
                          required
                        />
                      </label>

                      <label className="admin-field">
                        <span className="admin-field-label">Total seats</span>
                        <input
                          type="number"
                          min="1"
                          value={screenForm.totalSeats}
                          onChange={handleScreenChange("totalSeats")}
                          required
                        />
                      </label>

                      <div className="admin-screens-form-actions">
                        {editingScreenId && (
                          <button type="button" className="admin-cancel-btn" onClick={resetScreenForm}>
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          className="ticket-btn admin-add-btn"
                          disabled={submittingScreen}
                        >
                          {submittingScreen
                            ? editingScreenId
                              ? "Saving..."
                              : "Adding..."
                            : editingScreenId
                            ? "Save changes"
                            : "Add screen"}
                        </button>
                      </div>
                    </form>

                    <div className="admin-screens-list">
                      {theatreScreens.length === 0 && (
                        <p className="admin-empty-state">
                          No screens yet — add one above.
                        </p>
                      )}
                      {theatreScreens.map((screen) => (
                        <div className="admin-screen-row" key={screen.id}>
                          <span>{screen.screenName}</span>
                          <span>
                            {/* totalSeats is the configured count the admin typed in;
                                actualSeatCount/misconfigured (from GET /api/screens) reflect
                                whether seats were really generated — a screen can show
                                totalSeats > 0 and still have 0 real seats. */}
                            {!screen.misconfigured ? (
                              `${screen.actualSeatCount ?? screen.totalSeats} seats`
                            ) : (
                              <span className="admin-fix-seats-hint">
                                <span className="admin-error-text" title="No seats generated for this screen.">
                                  0 seats — misconfigured
                                </span>
                                <button
                                  type="button"
                                  className="admin-fix-seats-btn"
                                  onClick={() => handleFixSeats(screen.id)}
                                  disabled={fixingScreenId === screen.id}
                                >
                                  {fixingScreenId === screen.id ? "Fixing…" : "Fix seats"}
                                </button>
                              </span>
                            )}
                          </span>
                          <span className="admin-row-actions">
                            <button
                              type="button"
                              className="admin-edit-btn"
                              onClick={() => startEditScreen(screen)}
                              aria-label={`Edit ${screen.screenName}`}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              className="admin-remove-btn"
                              onClick={() => setPendingDeleteScreen(screen)}
                              aria-label={`Remove ${screen.screenName}`}
                            >
                              Remove
                            </button>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}

        {!loading && theatres.length === 0 && (
          <p className="admin-empty-state">No theatres yet — add one above.</p>
        )}
      </div>

      {pendingDeleteTheatre && (
        <ConfirmDialog
          title="Remove this theatre?"
          message={`"${pendingDeleteTheatre.theatreName}" will be removed. This can't be undone.`}
          onCancel={() => setPendingDeleteTheatre(null)}
          onConfirm={confirmRemoveTheatre}
        />
      )}

      {pendingDeleteScreen && (
        <ConfirmDialog
          title="Remove this screen?"
          message={`"${pendingDeleteScreen.screenName}" will be removed. This fails if any shows are still scheduled on it — cancel those first.`}
          onCancel={() => setPendingDeleteScreen(null)}
          onConfirm={confirmRemoveScreen}
        />
      )}
    </div>
  );
}
