import api from "../api/axios";

export const login = async (loginRequest) => {
    const response = await api.post("/auth/login", loginRequest);
    return response.data;
};

// Backend re-checks the caller's role straight from the DB (never from the
// JWT, which carries no role claim), so this is the way to notice an admin
// was demoted mid-session even though their access token is still valid.
export const checkSession = async () => {
    const response = await api.get("/auth/session");
    return response.data;
};