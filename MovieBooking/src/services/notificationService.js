import api from "../api/axios";

// Backend: NotificationController -> /api/notifications. All routes here
// require a logged-in user — the axios interceptor already attaches the
// access token.

export const getMyNotifications = async () => {
  const response = await api.get("/notifications/my");
  return response.data;
};

export const getUnreadCount = async () => {
  const response = await api.get("/notifications/my/unread-count");
  return response.data.count;
};

export const markNotificationRead = async (id) => {
  const response = await api.post(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await api.post("/notifications/read-all");
  return response.data;
};