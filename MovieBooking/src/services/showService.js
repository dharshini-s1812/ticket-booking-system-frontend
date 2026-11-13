import api from "../api/axios";

// Backend: admin CRUD at /api/admin/shows, public browsing/seat map at
// /api/shows. showDate is "YYYY-MM-DD", startTime is "HH:mm" or "HH:mm:ss"
// (backend LocalTime accepts either); endTime is computed server-side from
// the movie's duration, don't send it.

export const getAllShows = async () => {
  const response = await api.get("/admin/shows");
  return response.data;
};

export const getShow = async (id) => {
  const response = await api.get(`/admin/shows/${id}`);
  return response.data;
};

export const addShow = async (showData) => {
  const response = await api.post("/admin/shows", {
    movieId: Number(showData.movieId),
    screenId: Number(showData.screenId),
    showDate: showData.showDate,
    endDate: showData.endDate || null, // blank = one-off show, same as showDate
    startTime: showData.startTime,
    language: showData.language,
    basePrice: Number(showData.basePrice),
  });
  return response.data;
};

export const updateShow = async (id, showData) => {
  const response = await api.put(`/admin/shows/${id}`, {
    movieId: Number(showData.movieId),
    screenId: Number(showData.screenId),
    showDate: showData.showDate,
    startTime: showData.startTime,
    language: showData.language,
    basePrice: Number(showData.basePrice),
  });
  return response.data;
};

export const deleteShow = async (id) => {
  const response = await api.delete(`/admin/shows/${id}`);
  return response.data;
};

// Admin-initiated cancellation: refunds any confirmed bookings in full and
// frees the seats, but doesn't delete the show (booking history stays
// intact). Use this before deleteShow when a show has confirmed bookings.
export const cancelShow = async (id) => {
  const response = await api.post(`/admin/shows/${id}/cancel`);
  return response.data;
};

// ---- Public (customer-facing) ----

// Any of these may be omitted to skip that filter.
export const searchShows = async ({ movieId, theatreId, showDate, location } = {}) => {
  const response = await api.get("/shows", {
    params: {
      ...(movieId ? { movieId } : {}),
      ...(theatreId ? { theatreId } : {}),
      ...(showDate ? { showDate } : {}),
      ...(location ? { location } : {}),
    },
  });
  return response.data;
};

export const getPublicShow = async (id) => {
  const response = await api.get(`/shows/${id}`);
  return response.data;
};

export const getSeatMap = async (showId) => {
  const response = await api.get(`/shows/${showId}/seats`);
  return response.data;
};

export const regenerateShowSeats = async (id) => {
  const response = await api.post(`/admin/shows/${id}/regenerate-seats`);
  return response.data;
};

export const getRunsEndingSoon = async () => {
  const response = await api.get("/admin/show-runs/ending-soon");
  return response.data;
};

export const extendRun = async (id, days) => {
  const response = await api.post(`/admin/show-runs/${id}/extend`, null, { params: { days } });
  return response.data;
};

export const declineRunExtension = async (id) => {
  const response = await api.post(`/admin/show-runs/${id}/decline-extension`);
  return response.data;
};

export const cancelRun = async (id) => {
  const response = await api.post(`/admin/show-runs/${id}/cancel`);
  return response.data;
};