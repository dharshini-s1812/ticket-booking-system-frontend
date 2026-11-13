import React from "react";
import { Navigate } from "react-router-dom";
import { isAdminRole } from "./utils/roles";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("accessToken");
  const role = localStorage.getItem("role");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (!isAdminRole(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
