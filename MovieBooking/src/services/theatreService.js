import api from "../api/axios";

// Backend: TheatreController -> /api/theatres (no /admin prefix, matches
// ScreenController — these two aren't behind the /api/admin/* path even
// though only admins are expected to call the write methods).

export const getAllTheatres = async () => {
  const response = await api.get("/theatres");
  return response.data;
};

export const getTheatre = async (id) => {
  const response = await api.get(`/theatres/${id}`);
  return response.data;
};

export const addTheatre = async (theatreData) => {
  const response = await api.post("/theatres", {
    theatreName: theatreData.theatreName,
    address: theatreData.address,
    city: theatreData.city,
    phone: theatreData.phone,
  });
  return response.data;
};

export const updateTheatre = async (id, theatreData) => {
  const response = await api.put(`/theatres/${id}`, {
    theatreName: theatreData.theatreName,
    address: theatreData.address,
    city: theatreData.city,
    phone: theatreData.phone,
  });
  return response.data;
};

export const deleteTheatre = async (id) => {
  const response = await api.delete(`/theatres/${id}`);
  return response.data;
};
