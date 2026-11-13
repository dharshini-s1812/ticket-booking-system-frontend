import React, { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { getMyBookings } from "./services/bookingService";
import { getPublicOffers } from "./services/offerService";
import "./App.css";

// Bookings and offers both have real backend endpoints (GET /bookings/my,
// GET /offers) — this used to call three endpoints that were never built
// (/users/me/bookings, /users/me/offers, /users/me/reviews), so every
// section on this page permanently showed "Something went wrong loading
// this." The "Offers claimed" section is now just "Current offers" (there's
// no per-user "claimed offer" concept in the backend, so showing what's
// actually active is the honest version of this). Reviews are dropped
// entirely for now — there's no review feature anywhere in the backend to
// back it with real data.

function useAsync(fn, enabled) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    setLoading(true);
    setError("");

    fn()
      .then((result) => {
        if (!cancelled) setData(Array.isArray(result) ? result : []);
      })
      .catch(() => {
        if (!cancelled) setError("Something went wrong loading this.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { data, loading, error };
}

export default function Profile() {
  const { user } = useAuth();

  const bookings = useAsync(getMyBookings, !!user);
  const offers = useAsync(getPublicOffers, !!user);

  if (!user) {
    return (
      <section className="booking-section">
        <div className="booking-inner">
          <p className="booking-empty">Log in to view your profile.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="booking-section">
      <div className="booking-inner">
        {/* Header */}
        <div className="profile-header">
          <span className="navbar-user-avatar profile-avatar">
            {(user.name || user.email || "?")[0].toUpperCase()}
          </span>
          <div>
            <h1 className="movies-title">{user.name || "Your profile"}</h1>
            <p className="movie-meta">{user.email}</p>
          </div>
        </div>

        {/* Tickets booked */}
        <div className="booking-block">
          <h2 className="booking-block-title">Tickets booked</h2>

          {bookings.loading ? (
            <p className="booking-empty">Loading your bookings…</p>
          ) : bookings.error ? (
            <p className="admin-login-error">{bookings.error}</p>
          ) : bookings.data.length === 0 ? (
            <p className="admin-empty-state">No tickets booked yet.</p>
          ) : (
            <div className="admin-table">
              <div className="admin-table-head">
                <span>Movie</span>
                <span>Date &amp; time</span>
                <span>Seats</span>
                <span>Amount</span>
                <span>Status</span>
              </div>
              {bookings.data.map((booking) => (
                <div className="admin-table-row" key={booking.id}>
                  <span>{booking.movieName}</span>
                  <span>
                    {booking.showDate}
                    {booking.startTime ? ` · ${booking.startTime}` : ""}
                  </span>
                  <span>
                    {Array.isArray(booking.seatNumbers)
                      ? booking.seatNumbers.join(", ")
                      : booking.seatNumbers}
                  </span>
                  <span>
                    ₹{booking.totalAmount}
                    {booking.refundAmount != null && (
                      <span className="movie-meta"> (₹{booking.refundAmount} refunded)</span>
                    )}
                  </span>
                  <span>{booking.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current offers */}
        <div className="booking-block">
          <h2 className="booking-block-title">Current offers</h2>

          {offers.loading ? (
            <p className="booking-empty">Loading offers…</p>
          ) : offers.error ? (
            <p className="admin-login-error">{offers.error}</p>
          ) : offers.data.length === 0 ? (
            <p className="admin-empty-state">No active offers right now.</p>
          ) : (
            <div className="offers-grid">
              {offers.data.map((offer) => (
                <div className="offer-card" key={offer.id}>
                  <div className="offer-stub">
                    <span className="offer-percent">{offer.discountPercentage}%</span>
                    <span className="offer-off">OFF</span>
                  </div>
                  <div className="offer-content">
                    <h3 className="offer-title">{offer.offerName}</h3>
                    <p className="offer-desc">{offer.description}</p>
                    {offer.endDate && (
                      <span className="movie-meta">Valid until {offer.endDate}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}