import api from "../api/axios";

// Backend: AdminController -> base path /api/admin (mismatched sub-paths
// per action, not a clean REST resource):
// - POST /api/admin/add    -> addAdmin
// - GET  /api/admin/admins -> getAllAdmins
// - no DELETE mapping exists yet — see note on deleteAdmin below.

export const getAllAdmins = async () => {
  const response = await api.get("/admin/admins");
  return response.data;
};

export const addAdmin = async (email) => {
  const response = await api.post("/admin/add", { email });
  return response.data;
};

// NOTE: AdminController has no delete endpoint. This will 404/405 until
// a method like DELETE /api/admin/{id} is added to the backend.
export const deleteAdmin = async (id) => {
  const response = await api.delete(`/admin/${id}`);
  return response.data;
};
