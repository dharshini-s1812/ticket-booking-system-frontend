import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { isAdminRole } from "./utils/roles";
import "./App.css";

const BACK_MAP = {
  "email-otp": "email-entry",
};

export default function LoginModal({ onClose }) {
  const { sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState("email-entry");

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const goBack = () => {
    setError("");
    setNotice("");
    setStep(BACK_MAP[step] ?? "email-entry");
  };

  // ---- Email flow ----
  const submitEmail = async (e) => {
    e.preventDefault();

    if (!email) {
      setError("Enter your email.");
      return;
    }

    try {
      setError("");
      await sendOtp(email);

      setNotice(`OTP sent to ${email}.`);
      setStep("email-otp");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP.");
    }
  };

  const submitOtp = async (e) => {
    e.preventDefault();

    if (!otp) {
      setError("Enter the OTP.");
      return;
    }

    try {
      setError("");

      const data = await verifyOtp(email, otp);

      onClose();

      if (isAdminRole(data.role)) {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP.");
    }
  };

  const resend = async () => {
    try {
      await sendOtp(email);
      setNotice(`OTP resent to ${email}.`);
    } catch (err) {
      setError("Failed to resend OTP.");
    }
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" aria-label="Close" onClick={onClose}>
          ×
        </button>

        {step !== "email-entry" && (
          <button className="modal-back-btn" onClick={goBack}>
            ← Back
          </button>
        )}

        <span className="hero-eyebrow">Optional, Not Required to Book</span>

        {/* ---- Step: enter email ---- */}
        {step === "email-entry" && (
          <>
            <h3 className="modal-title">Log in for updates</h3>
            <p className="modal-subtext">
              Get booking confirmations and offer alerts. We'll send a one-time
              code to your email — no password needed.
            </p>
            <form className="modal-form" onSubmit={submitEmail}>
              <label className="modal-field">
                <span>Email</span>
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </label>
              {error && <p className="modal-error">{error}</p>}
              <button type="submit" className="ticket-btn modal-submit-btn">
                Send OTP
              </button>
            </form>
          </>
        )}

        {/* ---- Step: verify OTP ---- */}
        {step === "email-otp" && (
          <>
            <h3 className="modal-title">Enter the code</h3>
            <p className="modal-subtext">
              Sent to <strong>{email}</strong>.
            </p>
            {notice && <p className="modal-notice">{notice}</p>}
            <form className="modal-form" onSubmit={submitOtp}>
              <label className="modal-field">
                <span>OTP</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  autoFocus
                />
              </label>
              {error && <p className="modal-error">{error}</p>}
              <button type="submit" className="ticket-btn modal-submit-btn">
                Verify & continue
              </button>
            </form>
            <button className="modal-guest-link" onClick={resend}>
              Resend OTP
            </button>
          </>
        )}

        <button className="modal-guest-link" onClick={onClose}>
          Continue as guest instead
        </button>
      </div>
    </div>,
    document.body,
  );
}
