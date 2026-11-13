import api from "../api/axios";

export const getActivityLogs = async () => {
  const response = await api.get("/admin/logs");
  return response.data;
};