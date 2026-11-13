import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useLocationCity } from "./context/LocationContext";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { searchShows, getSeatMap } from "./services/showService";
import { createBooking, payForBooking } from "./services/bookingService";
import "./App.css";

const MAX_SEATS = 8;
const HOLD_MINUTES = 10;

const FALLBACK_MOVIE = {
  movieName: "Pick a movie to book",
  genre: "",
  language: "",
  duration: null,
  certificate: "",
  description: "Head back to Now Showing and choose a movie first.",
  coverImage:
    "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&q=80",
};

// Booking now goes through five real steps against the backend:
// 1. pick a date from this movie's scheduled shows
// 2. pick a specific show (theatre / screen / time) on that date
// 3. load that show's live seat map and pick seats
// 4. create the booking (locks the seats server-side for 10 min)
// 5. pay -> confirmed
export default function BookingPage() {
  const { user } = useAuth();
  const { location: city } = useLocationCity();
  const routerLocation = useLocation();
  const MOVIE = routerLocation.state?.movie ?? FALLBACK_MOVIE;

  const [shows, setShows] = useState([]);
  const [loadingShows, setLoadingShows] = useState(false);
  const [showsError, setShowsError] = useState(null);

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedShowId, setSelectedShowId] = useState(null);

  const [seatMap, setSeatMap] = useState(null);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [seatsError, setSeatsError] = useState(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);

  const [booking, setBooking] = useState(null); // PENDING booking, awaiting payment
  const [confirmed, setConfirmed] = useState(null); // paid + confirmed
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  // ---- load this movie's upcoming shows ----
  useEffect(() => {
    if (!MOVIE.id) return;
    setLoadingShows(true);
    setShowsError(null);
    searchShows({ movieId: MOVIE.id, location: city })
      .then((data) => {
        setShows(data);
        if (data.length > 0) setSelectedDate(data[0].showDate);
      })
      .catch((err) => {
        setShowsError("Couldn't load showtimes. Is the backend running on :8080?");
        console.error(err);
      })
      .finally(() => setLoadingShows(false));
  }, [MOVIE.id, city]);

  const dates = useMemo(
    () => [...new Set(shows.map((s) => s.showDate))].sort(),
    [shows]
  );
  const showsOnDate = useMemo(
    () => shows.filter((s) => s.showDate === selectedDate),
    [shows, selectedDate]
  );

  const selectedShow = useMemo(
    () => shows.find((s) => s.id === selectedShowId) ?? null,
    [shows, selectedShowId]
  );

  // ---- load the seat map once a show is picked ----
  useEffect(() => {
    if (!selectedShowId) {
      setSeatMap(null);
      return;
    }
    setLoadingSeats(true);
    setSeatsError(null);
    setSelectedSeatIds([]);
    getSeatMap(selectedShowId)
      .then(setSeatMap)
      .catch((err) => {
        setSeatsError("Couldn't load the seat map.");
        console.error(err);
      })
      .finally(() => setLoadingSeats(false));
  }, [selectedShowId]);

  const total = useMemo(() => {
    if (!seatMap) return 0;
    return seatMap.seats
      .filter((s) => selectedSeatIds.includes(s.showSeatId))
      .reduce((sum, s) => sum + s.price, 0);
  }, [seatMap, selectedSeatIds]);

  const toggleSeat = (seat) => {
    if (seat.status !== "AVAILABLE") return;
    setSelectedSeatIds((prev) => {
      if (prev.includes(seat.showSeatId)) return prev.filter((id) => id !== seat.showSeatId);
      if (prev.length >= MAX_SEATS) return prev;
      return [...prev, seat.showSeatId];
    });
  };

  // Group flat seat list into rows (A, B, C...) purely for layout.
  const seatRows = useMemo(() => {
    if (!seatMap) return [];
    const byRow = {};
    seatMap.seats.forEach((seat) => {
      const row = seat.seatNumber.match(/^[A-Za-z]+/)?.[0] ?? "?";
      (byRow[row] ??= []).push(seat);
    });
    return Object.entries(byRow).sort(([a], [b]) => a.localeCompare(b));
  }, [seatMap]);

  const handleReserve = async () => {
    if (!user || selectedSeatIds.length === 0 || !selectedShowId) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const result = await createBooking(selectedShowId, selectedSeatIds);
      setBooking(result);
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
          "Couldn't reserve those seats — someone may have just taken one. Reloading the seat map."
      );
      console.error(err);
      // Someone else may have grabbed a seat we picked — refresh state.
      getSeatMap(selectedShowId).then(setSeatMap).catch(() => {});
      setSelectedSeatIds([]);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePay = async () => {
    if (!booking) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await payForBooking(booking.id, "SIMULATED");
      setConfirmed(booking);
    } catch (err) {
      setActionError(
        err.response?.data?.message || "Payment failed. Please try again."
      );
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // ---- confirmation screen ----
  if (confirmed) {
    return (
      <div className="page">
        <Navbar />
        <section className="booking-section">
          <div className="booking-confirm">
            <span className="hero-eyebrow">Booking Confirmed</span>
            <h1 className="movies-title">You're all set.</h1>
            <p className="hero-subtext">
              A confirmation for <strong>{confirmed.movieName}</strong> at{" "}
              <strong>{confirmed.theatreName}</strong> ({confirmed.screenName}),{" "}
              {confirmed.showDate} {confirmed.startTime} has been sent to{" "}
              <strong>{user?.email}</strong>.
            </p>

            <div className="booking-confirm-card">
              <div className="booking-confirm-row">
                <span>Booking ID</span>
                <span>#{confirmed.id}</span>
              </div>
              <div className="booking-confirm-row">
                <span>Seats</span>
                <span>{confirmed.seatNumbers.join(", ")}</span>
              </div>
              <div className="booking-confirm-row booking-confirm-total">
                <span>Total paid</span>
                <span>₹{confirmed.totalAmount}</span>
              </div>
            </div>

            <Link to="/" className="ticket-btn">
              Back to home
            </Link>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  // ---- payment step ----
  if (booking) {
    return (
      <div className="page">
        <Navbar />
        <section className="booking-section">
          <div className="booking-confirm">
            <span className="hero-eyebrow">Almost there</span>
            <h1 className="movies-title">Confirm your payment</h1>
            <p className="hero-subtext">
              Your seats are held for {HOLD_MINUTES} minutes. Complete payment before the hold expires.
            </p>

            <div className="booking-confirm-card">
              <div className="booking-confirm-row">
                <span>Movie</span>
                <span>{booking.movieName}</span>
              </div>
              <div className="booking-confirm-row">
                <span>Theatre</span>
                <span>{booking.theatreName} · {booking.screenName}</span>
              </div>
              <div className="booking-confirm-row">
                <span>When</span>
                <span>{booking.showDate} {booking.startTime}</span>
              </div>
              <div className="booking-confirm-row">
                <span>Seats</span>
                <span>{booking.seatNumbers.join(", ")}</span>
              </div>
              <div className="booking-confirm-row booking-confirm-total">
                <span>Total</span>
                <span>₹{booking.totalAmount}</span>
              </div>
            </div>

            {actionError && <p className="admin-error-text">{actionError}</p>}

            <button
              type="button"
              className="ticket-btn booking-confirm-btn"
              onClick={handlePay}
              disabled={submitting}
            >
              {submitting ? "Processing..." : `Pay ₹${booking.totalAmount}`}
            </button>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  // ---- main booking flow ----
  return (
    <div className="page">
      <Navbar />

      <section className="booking-section">
        <div className="booking-inner">
          <div className="booking-movie">
            <img src={MOVIE.coverImage} alt={`${MOVIE.movieName} poster`} />
            <div>
              <span className="hero-eyebrow">Book Tickets</span>
              <h1 className="movies-title booking-movie-title">{MOVIE.movieName}</h1>
              <p className="movie-meta">
                {[MOVIE.genre, MOVIE.language, MOVIE.duration && `${MOVIE.duration} min`, MOVIE.certificate]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {MOVIE.description && (
                <p className="hero-subtext">{MOVIE.description}</p>
              )}
            </div>
          </div>

          {!MOVIE.id ? (
            <p className="admin-empty-state">
              No movie selected. Head back to <Link to="/">Now Showing</Link> and pick one.
            </p>
          ) : !user ? (
            <p className="admin-empty-state">
              Please log in to book tickets — use the account menu in the navbar.
            </p>
          ) : (
            <div className="booking-grid">
              <div className="booking-main">
                {loadingShows && <p className="admin-empty-state">Loading showtimes…</p>}
                {showsError && <p className="admin-error-text">{showsError}</p>}

                {!loadingShows && !showsError && shows.length === 0 && (
                  <p className="admin-empty-state">
                    No shows scheduled for this movie in {city} right now.
                  </p>
                )}

                {dates.length > 0 && (
                  <div className="booking-block">
                    <h3 className="booking-block-title">Date</h3>
                    <div className="booking-pill-row">
                      {dates.map((d) => (
                        <button
                          key={d}
                          className={`booking-pill${selectedDate === d ? " is-active" : ""}`}
                          onClick={() => {
                            setSelectedDate(d);
                            setSelectedShowId(null);
                          }}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {showsOnDate.length > 0 && (
                  <div className="booking-block">
                    <h3 className="booking-block-title">Showtime</h3>
                    <div className="booking-pill-row">
                      {showsOnDate.map((s) => (
                        <button
                          key={s.id}
                          className={`booking-pill${selectedShowId === s.id ? " is-active" : ""}`}
                          onClick={() => setSelectedShowId(s.id)}
                        >
                          {s.startTime} · {s.theatreName} ({s.screenName})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedShowId && (
                  <div className="booking-block">
                    <h3 className="booking-block-title">Select seats</h3>
                    <p className="booking-screen-label">Screen this way</p>
                    <div className="booking-screen-curve" />

                    {loadingSeats && <p className="admin-empty-state">Loading seats…</p>}
                    {seatsError && <p className="admin-error-text">{seatsError}</p>}

                    {seatMap && (
                      <>
                        <div className="booking-seat-map">
                          {seatRows.map(([row, seats], rowIndex) => {
                            const sorted = [...seats].sort((a, b) =>
                              a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true })
                            );
                            // Real cinemas split wide rows into blocks with
                            // a centre aisle — a single unbroken strip of
                            // 12-14 seats is hard to scan/count. Only worth
                            // doing once a row is wide enough to need it.
                            const blocks =
                              sorted.length > 6
                                ? [sorted.slice(0, Math.ceil(sorted.length / 2)), sorted.slice(Math.ceil(sorted.length / 2))]
                                : [sorted];
                            return (
                              <div
                                className={`booking-seat-row${rowIndex > 0 && rowIndex % 5 === 0 ? " row-group-start" : ""}`}
                                key={row}
                              >
                                <span className="booking-row-label">{row}</span>
                                <div className="booking-seat-blocks">
                                  {blocks.map((block, blockIndex) => (
                                    <div className="booking-seat-group" key={blockIndex}>
                                      {block.map((seat) => {
                                        const isBooked = seat.status !== "AVAILABLE";
                                        const isSelected = selectedSeatIds.includes(seat.showSeatId);
                                        const isRecliner = seat.seatType === "RECLINER";
                                        const isPremium = seat.seatType === "PREMIUM";
                                        return (
                                          <button
                                            key={seat.showSeatId}
                                            className={`booking-seat${isPremium ? " is-premium" : ""}${isRecliner ? " is-recliner" : ""}${isSelected ? " is-selected" : ""}${isBooked ? " is-booked" : ""}`}
                                            disabled={isBooked}
                                            onClick={() => toggleSeat(seat)}
                                            title={seat.seatNumber}
                                            aria-label={`Seat ${seat.seatNumber}${isBooked ? ", unavailable" : isSelected ? ", selected" : ""}`}
                                          />
                                        );
                                      })}
                                    </div>
                                  ))}
                                </div>
                                <span className="booking-row-label booking-row-label--end">{row}</span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="booking-legend">
                          <span><i className="booking-seat" /> Available</span>
                          <span><i className="booking-seat is-premium" /> Premium</span>
                          <span><i className="booking-seat is-recliner" /> Recliner</span>
                          <span><i className="booking-seat is-selected" /> Selected</span>
                          <span><i className="booking-seat is-booked" /> Taken</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <aside className="booking-summary">
                <h3 className="booking-block-title">Your booking</h3>

                {selectedSeatIds.length === 0 ? (
                  <p className="booking-empty">Pick up to {MAX_SEATS} seats to continue.</p>
                ) : (
                  <p className="booking-selected-seats">
                    {seatMap?.seats
                      .filter((s) => selectedSeatIds.includes(s.showSeatId))
                      .map((s) => s.seatNumber)
                      .sort()
                      .join(", ")}
                  </p>
                )}

                {selectedShow && (
                  <div className="booking-summary-row">
                    <span>
                      {selectedShow.theatreName} · {selectedShow.showDate} {selectedShow.startTime}
                    </span>
                  </div>
                )}
                <div className="booking-summary-row booking-summary-total">
                  <span>Total</span>
                  <span>₹{total}</span>
                </div>

                {actionError && <p className="admin-error-text">{actionError}</p>}

                <button
                  type="button"
                  className="ticket-btn booking-confirm-btn"
                  disabled={selectedSeatIds.length === 0 || submitting}
                  onClick={handleReserve}
                >
                  {submitting ? "Reserving..." : `Reserve seats · ₹${total}`}
                </button>
              </aside>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}