import React, { useEffect, useState } from "react";
import ConfirmDialog from "../ConfirmDialog";
import "../../App.css";
import "../Admin.css";
import {
  getAllOffers,
  addOffer,
  updateOffer,
  deleteOffer,
} from "../../services/offerService";

// Matches OfferRequest exactly: offerName, description, discountPercentage,
// startDate, endDate.
const EMPTY_FORM = {
  offerName: "",
  description: "",
  discountPercentage: "",
  startDate: "",
  endDate: "",
};

export default function AdminOffers() {
  const [offers, setOffers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadOffers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllOffers();
      setOffers(data);
    } catch (err) {
      setError("Couldn't load offers. Is the backend running on :8080?");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError(null);
  };

  const startEdit = (offer) => {
    setEditingId(offer.id);
    setForm({
      offerName: offer.offerName ?? "",
      description: offer.description ?? "",
      discountPercentage: offer.discountPercentage ?? "",
      startDate: offer.startDate ?? "",
      endDate: offer.endDate ?? "",
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const requiredFields = ["offerName", "discountPercentage", "startDate", "endDate"];
    const missing = requiredFields.filter((f) => !String(form[f] ?? "").trim());

    if (missing.length > 0) {
      setError(`Please fill in: ${missing.join(", ")}.`);
      return;
    }

    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setError("End date can't be before the start date.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        await updateOffer(editingId, form);
      } else {
        await addOffer(form);
      }
      resetForm();
      await loadOffers(); // refresh from backend
    } catch (err) {
      setError(
        editingId
          ? "Couldn't update the offer. Check the console for details."
          : "Couldn't add the offer. Check the console for details."
      );
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmRemove = async () => {
    try {
      await deleteOffer(pendingDelete.id);
      setOffers((o) => o.filter((offer) => offer.id !== pendingDelete.id));
      if (editingId === pendingDelete.id) resetForm();
    } catch (err) {
      setError("Couldn't delete the offer. Check the console for details.");
      console.error(err);
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div>
      <h1 className="admin-page-title">Offers</h1>
      <p className="admin-page-subtext">
        Create time-boxed discounts or retire ones that expired.
      </p>

      {error && <p className="admin-empty-state admin-error-text">{error}</p>}

      <form className="admin-add-form admin-add-form--offers" onSubmit={handleSubmit}>
        {editingId && (
          <div className="admin-form-banner">
            Editing <strong>{form.offerName || "offer"}</strong>
            <button type="button" className="admin-form-banner-cancel" onClick={resetForm}>
              Cancel
            </button>
          </div>
        )}

        <div className="admin-form-fields">
          <label className="admin-field">
            <span className="admin-field-label">Offer name</span>
            <input value={form.offerName} onChange={handleChange("offerName")} required />
          </label>

          <label className="admin-field">
            <span className="admin-field-label">Discount (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              value={form.discountPercentage}
              onChange={handleChange("discountPercentage")}
              required
            />
          </label>

          <label className="admin-field">
            <span className="admin-field-label">Start date</span>
            <input
              type="date"
              value={form.startDate}
              onChange={handleChange("startDate")}
              required
            />
          </label>

          <label className="admin-field">
            <span className="admin-field-label">End date</span>
            <input
              type="date"
              value={form.endDate}
              onChange={handleChange("endDate")}
              required
            />
          </label>

          <label className="admin-field admin-field--full">
            <span className="admin-field-label">Description (optional)</span>
            <textarea value={form.description} onChange={handleChange("description")} />
          </label>
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
                : "Add offer"}
            </button>
          </div>
        </div>
      </form>

      <div className="admin-table admin-table--offers">
        <div className="admin-table-head">
          <span>Offer</span>
          <span>Discount</span>
          <span>Valid</span>
          <span></span>
        </div>

        {loading && <p className="admin-empty-state">Loading offers…</p>}

        {!loading &&
          offers.map((offer) => (
            <div
              className={`admin-table-row${editingId === offer.id ? " is-editing" : ""}`}
              key={offer.id}
            >
              <span>{offer.offerName}</span>
              <span>{offer.discountPercentage != null ? `${offer.discountPercentage}%` : "—"}</span>
              <span>
                {offer.startDate || "—"} → {offer.endDate || "—"}
              </span>
              <span className="admin-row-actions">
                <button
                  type="button"
                  className="admin-edit-btn"
                  onClick={() => startEdit(offer)}
                  aria-label={`Edit ${offer.offerName}`}
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  className="admin-remove-btn"
                  onClick={() => setPendingDelete(offer)}
                  aria-label={`Remove ${offer.offerName}`}
                >
                  Remove
                </button>
              </span>
            </div>
          ))}

        {!loading && offers.length === 0 && (
          <p className="admin-empty-state">No offers yet — add one above.</p>
        )}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Remove this offer?"
          message={`"${pendingDelete.offerName}" will be removed. This can't be undone.`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmRemove}
        />
      )}
    </div>
  );
}
