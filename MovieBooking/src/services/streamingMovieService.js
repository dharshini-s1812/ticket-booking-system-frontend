import api from "../api/axios";

// Backend: StreamingMovieController -> /api/admin/streaming-movies

// api.defaults.baseURL is e.g. "http://localhost:8080/api"
// but uploaded images are served from the backend ROOT (WebConfig maps
// /uploads/** -> file:uploads/), not under /api. So strip the trailing /api.
export const getImageUrl = (coverImage) => coverImage;
// GET all movies
export const getAllMovies = async () => {
  const response = await api.get("/admin/streaming-movies");
  return response.data;
};

// GET a single movie by id
export const getMovieById = async (id) => {
  const response = await api.get(`/admin/streaming-movies/${id}`);
  return response.data;
};

// POST a new movie (multipart/form-data: request fields + image file)
export const addMovie = async (movieData, imageFile) => {
  const formData = new FormData();

  // These keys must match StreamingMovieRequest fields exactly
  formData.append("movieName", movieData.movieName);
  formData.append("genre", movieData.genre);
  formData.append("language", movieData.language);
  formData.append("certificate", movieData.certificate);
  formData.append("duration", movieData.duration);
  formData.append("releaseDate", movieData.releaseDate); // "YYYY-MM-DD"
  formData.append("description", movieData.description);
  // Optional — omit entirely (rather than sending an empty string) so the
  // backend's LocalDate binding doesn't choke on "".
  if (movieData.scheduledEndDate) {
    formData.append("scheduledEndDate", movieData.scheduledEndDate);
  }

  formData.append("image", imageFile);

    const response = await api.post("/admin/streaming-movies", formData, {
    headers: { "Content-Type": undefined },
  });
  return response.data;
};

// PUT — update an existing movie (multipart/form-data, same fields as
// addMovie plus the id in the URL). imageFile is optional: only append it
// when the admin picked a new cover, so the backend can keep the old one.
export const updateMovie = async (id, movieData, imageFile) => {
  const formData = new FormData();

  formData.append("movieName", movieData.movieName);
  formData.append("genre", movieData.genre);
  formData.append("language", movieData.language);
  formData.append("certificate", movieData.certificate);
  formData.append("duration", movieData.duration);
  formData.append("releaseDate", movieData.releaseDate);
  formData.append("description", movieData.description);
  if (movieData.scheduledEndDate) {
    formData.append("scheduledEndDate", movieData.scheduledEndDate);
  }

  if (imageFile) {
    formData.append("image", imageFile);
  }

  const response = await api.put(`/admin/streaming-movies/${id}`, formData, {
    headers: { "Content-Type": undefined },
  });
  return response.data;
};

// GET movies currently showing (public, used on the home page).
// location is optional — omit it to get every location.
export const getNowShowingMovies = async (location) => {
  const response = await api.get("/movies/now-showing", {
    params: location ? { location } : undefined,
  });
  return response.data;
};

// GET movies coming soon (public)
export const getComingSoonMovies = async (location) => {
  const response = await api.get("/movies/coming-soon", {
    params: location ? { location } : undefined,
  });
  return response.data;
};

// DELETE a movie by id
export const deleteMovie = async (id) => {
  const response = await api.delete(`/admin/streaming-movies/${id}`);
  return response.data;
};

// PATCH — extend a movie's scheduled end date by N days (admin's response
// to a "run ending soon" notification, or just proactively from the table).
export const extendMovieSchedule = async (id, days) => {
  const response = await api.patch(`/admin/streaming-movies/${id}/extend`, {
    days,
  });
  return response.data;
};
