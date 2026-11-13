// The backend's AuthResponse DTO sends `role` as a plain String, but the
// exact value it contains (e.g. "ADMIN", "ROLE_ADMIN", or the raw numeric
// role_id "2") can vary by endpoint/environment. Centralizing the check
// here means every place that needs to know "is this an admin?" agrees,
// instead of three separate exact-string comparisons drifting out of sync.
//
// If your backend uses a different convention than the ones below, add it
// here — this is the only place that needs to change.
const ADMIN_ROLE_VALUES = ["admin", "role_admin", "2"];

export const isAdminRole = (role) => {
  if (role === null || role === undefined) return false;
  return ADMIN_ROLE_VALUES.includes(String(role).trim().toLowerCase());
};
