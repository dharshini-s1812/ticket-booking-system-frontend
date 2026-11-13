import api from "../api/axios";

// Backend: ScreenController -> /api/screens
// Creating a screen auto-generates its seat grid server-side (rows of 10,
// first 2 rows PREMIUM) — there's no separate "add seats" call.

export const getAllScreens = async () => {
  const response = await api.get("/screens");
  return response.data;
};

export const getScreen = async (id) => {
  const response = await api.get(`/screens/${id}`);
  return response.data;
};

export const addScreen = async (screenData) => {
  const response = await api.post("/screens", {
    screenName: screenData.screenName,
    totalSeats: Number(screenData.totalSeats),
    theatreId: Number(screenData.theatreId),
  });
  return response.data;
};

export const updateScreen = async (id, screenData) => {
  const response = await api.put(`/screens/${id}`, {
    screenName: screenData.screenName,
    totalSeats: Number(screenData.totalSeats),
    theatreId: Number(screenData.theatreId),
  });
  return response.data;
};

export const deleteScreen = async (id) => {
  const response = await api.delete(`/screens/${id}`);
  return response.data;
};

// Fixes a screen that has 0 actual seats generated (misconfigured) by
// generating its seat grid now. Only works while it truly has 0 seats.
export const regenerateSeats = async (id) => {
  const response = await api.post(`/screens/${id}/regenerate-seats`);
  return response.data;
};