import api from "../api/axios";

// Backend: BookingController -> /api/bookings. Every route here requires a
// logged-in user (JWT access token) — the axios interceptor in api/axios.js
// already attaches it. showSeatIds must be ShowSeatResponse.showSeatId
// values from getSeatMap(), not raw seat ids.

export const createBooking = async (showId, showSeatIds) => {
  const response = await api.post("/bookings", { showId, showSeatIds });
  return response.data;
};

// Simulated gateway for now — always succeeds once called.
export const payForBooking = async (bookingId, paymentMethod = "SIMULATED") => {
  const response = await api.post(`/bookings/${bookingId}/pay`, { paymentMethod });
  return response.data;
};

export const cancelBooking = async (bookingId) => {
  const response = await api.post(`/bookings/${bookingId}/cancel`);
  return response.data;
};

export const getBooking = async (bookingId) => {
  const response = await api.get(`/bookings/${bookingId}`);
  return response.data;
};

export const getMyBookings = async () => {
  const response = await api.get("/bookings/my");
  return response.data;
};
