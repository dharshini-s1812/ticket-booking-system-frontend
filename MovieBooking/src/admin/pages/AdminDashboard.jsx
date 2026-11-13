import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import "../../App.css";
import "../Admin.css";

const STATS = [
  { label: "Tickets booked today", value: "312" },
  { label: "Active movies", value: "6" },
  { label: "Live offers", value: "3" },
  { label: "Revenue this week", value: "₹1.8L" },
];

// Mock data — there's no dashboard/analytics endpoint on the backend yet.
// Swap this for a real fetch (e.g. GET /api/admin/dashboard/stats) once
// one exists; shape matches what recharts expects so the swap is a
// straight data-source change, not a chart rewrite.
const MOCK_WEEKLY_BOOKINGS = [
  { day: "Mon", bookings: 42 },
  { day: "Tue", bookings: 38 },
  { day: "Wed", bookings: 51 },
  { day: "Thu", bookings: 47 },
  { day: "Fri", bookings: 68 },
  { day: "Sat", bookings: 92 },
  { day: "Sun", bookings: 74 },
];

const MOCK_WEEKLY_REVENUE = [
  { day: "Mon", revenue: 21000 },
  { day: "Tue", revenue: 18500 },
  { day: "Wed", revenue: 25400 },
  { day: "Thu", revenue: 23100 },
  { day: "Fri", revenue: 34200 },
  { day: "Sat", revenue: 46800 },
  { day: "Sun", revenue: 37600 },
];

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="admin-page-title">Dashboard</h1>
      <p className="admin-page-subtext">
        Quick overview — wire the charts below up to your real booking data
        when the backend has an analytics endpoint.
      </p>

      <div className="admin-stats-grid">
        {STATS.map((stat) => (
          <div className="admin-stat-card" key={stat.label}>
            <p className="admin-stat-value">{stat.value}</p>
            <p className="admin-stat-label">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="admin-charts-grid">
        <div className="admin-chart-card">
          <h2 className="admin-chart-title">Bookings this week</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={MOCK_WEEKLY_BOOKINGS}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
              <Bar dataKey="bookings" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="admin-chart-card">
          <h2 className="admin-chart-title">Revenue this week</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={MOCK_WEEKLY_REVENUE}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={12}
                tickFormatter={(v) => `₹${v / 1000}k`}
              />
              <Tooltip
                formatter={(value) => [`₹${value.toLocaleString("en-IN")}`, "Revenue"]}
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="var(--accent-dark)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
