import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LocationProvider } from "./context/LocationContext";
import HomePage from "./HomePage";
import BookingPage from "./BookingPage";
import Profile from "./Profile";
import AdminLogin from "./admin/AdminLogin";
import AdminLayout from "./admin/AdminLayout";
import AdminDashboard from "./admin/pages/AdminDashboard";
import AdminMovies from "./admin/pages/AdminMovies";
import AdminTheatres from "./admin/pages/AdminTheatres";
import AdminShows from "./admin/pages/AdminShows";
import AdminOffers from "./admin/pages/AdminOffers";
import AdminLogs from "./admin/pages/AdminLogs";
import ProtectedRoute from "./ProtectedRoute";
import AdminManageAdmins from "./admin/pages/AdminManageAdmins";
import "./App.css";

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <BrowserRouter>
          <Routes>
            {/* Public site — guest booking, no login required */}
            <Route path="/" element={<HomePage />} />
            <Route path="/book" element={<BookingPage />} />
            <Route path="/profile" element={<Profile />} />

            {/* Staff login — separate from the customer login modal */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Everything under /admin requires an admin session */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="movies" element={<AdminMovies />} />
              <Route path="theatres" element={<AdminTheatres />} />
              <Route path="shows" element={<AdminShows />} />
              <Route path="offers" element={<AdminOffers />} />
              <Route path="logs" element={<AdminLogs />} />
              <Route path="admins" element={<AdminManageAdmins />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LocationProvider>
    </AuthProvider>
  );
}
