import api from "../api/axios";

// Backend: OfferController -> /api/admin/offers
// Plain JSON, no multipart. Field names below match OfferRequest exactly:
// offerName, description, discountPercentage, startDate, endDate.

export const getAllOffers = async () => {
  const response = await api.get("/admin/offers");
  return response.data;
};

export const getOffer = async (id) => {
  const response = await api.get(`/admin/offers/${id}`);
  return response.data;
};

export const addOffer = async (offerData) => {
  const response = await api.post("/admin/offers", {
    offerName: offerData.offerName,
    description: offerData.description,
    discountPercentage: offerData.discountPercentage,
    startDate: offerData.startDate, // "YYYY-MM-DD"
    endDate: offerData.endDate, // "YYYY-MM-DD"
  });
  return response.data;
};

export const updateOffer = async (id, offerData) => {
  const response = await api.put(`/admin/offers/${id}`, {
    offerName: offerData.offerName,
    description: offerData.description,
    discountPercentage: offerData.discountPercentage,
    startDate: offerData.startDate,
    endDate: offerData.endDate,
  });
  return response.data;
};

export const deleteOffer = async (id) => {
  const response = await api.delete(`/admin/offers/${id}`);
  return response.data;
};

// GET public, active offers for the customer-facing Offers page.
// NOTE: this endpoint does not exist on the backend yet — OfferController
// currently only exposes /api/admin/offers, which is admin-only. Add a
// public route (mirroring StreamingMovieController's /movies/now-showing)
// before this will work, e.g. GET /api/offers on a non-admin controller.
export const getPublicOffers = async () => {
  const response = await api.get("/offers");
  return response.data;
};
