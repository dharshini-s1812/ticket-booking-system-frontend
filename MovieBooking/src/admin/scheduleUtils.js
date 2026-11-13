// Shared helpers for scheduling shows onto screens. Mirrors the backend's
// overlap rule exactly (ShowServiceImpl#validateNoOverlap): a 15-minute
// buffer is added after every show's runtime for cleaning/trailers, and two
// shows on the same screen conflict if their [start, end) windows overlap.

export const CLEANING_BUFFER_MINUTES = 15;

// "HH:mm" or "HH:mm:ss" -> minutes since midnight
export const timeToMinutes = (t) => {
  if (!t) return null;
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + m;
};

// minutes since midnight -> "HH:mm" (24h, for <input type="time">)
export const minutesToHHMM = (mins) => {
  const wrapped = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// minutes since midnight -> "6:05 PM" (12h, for display). Minutes past 1440
// (i.e. a show that runs past midnight) are shown with a "+1" marker.
export const minutesToLabel = (mins) => {
  const dayOverflow = mins >= 1440;
  const wrapped = ((mins % 1440) + 1440) % 1440;
  const h24 = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}${dayOverflow ? " +1" : ""}`;
};

export const formatTimeRange = (startMins, endMins) =>
  `${minutesToLabel(startMins)} – ${minutesToLabel(endMins)}`;

// A show's occupied window on its screen, including the cleaning buffer.
// Prefers the backend-computed endTime when present; falls back to
// start + duration + buffer (matches server logic) when it isn't.
export const getShowWindow = (show, buffer = CLEANING_BUFFER_MINUTES) => {
  const start = timeToMinutes(show.startTime);
  const end = show.endTime
    ? timeToMinutes(show.endTime)
    : start + Number(show.duration || 0) + buffer;
  return { start, end };
};

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

// Finds the show (if any) that would block a screening of `durationMinutes`
// starting at `startTime` on `screenId`/`date`. Excludes `excludeShowId` so
// editing a show doesn't conflict with itself.
export const findScreenConflict = ({
  screenId,
  date,
  startTime,
  durationMinutes,
  shows,
  excludeShowId,
  buffer = CLEANING_BUFFER_MINUTES,
}) => {
  const start = timeToMinutes(startTime);
  if (start == null || !durationMinutes) return null;
  const end = start + Number(durationMinutes) + buffer;

  const sameSlot = (shows || []).filter(
    (s) =>
      String(s.screenId) === String(screenId) &&
      s.showDate === date &&
      String(s.id) !== String(excludeShowId)
  );

  for (const existing of sameSlot) {
    const win = getShowWindow(existing, buffer);
    if (overlaps(start, end, win.start, win.end)) return existing;
  }
  return null;
};

// Screens-overview timeline spans 8 AM -> 2 AM (18h) — covers a normal
// cinema day, including late-night shows, without the row being mostly
// empty overnight hours.
export const TIMELINE_START_MIN = 8 * 60;
export const TIMELINE_END_MIN = 26 * 60;

// Converts a show's [start, end) window into left/width percentages for a
// CSS-positioned timeline block, clipped to the visible window.
export const timelineLayout = (startMin, endMin) => {
  const span = TIMELINE_END_MIN - TIMELINE_START_MIN;
  const clippedStart = Math.max(startMin, TIMELINE_START_MIN);
  const clippedEnd = Math.min(endMin, TIMELINE_END_MIN);
  const left = ((clippedStart - TIMELINE_START_MIN) / span) * 100;
  const width = Math.max(((clippedEnd - clippedStart) / span) * 100, 2);
  return { left: `${left}%`, width: `${width}%` };
};

// Hour marks for the timeline ruler, e.g. [8, 10, 12, ... , 2 (next day)].
export const timelineHourMarks = () => {
  const marks = [];
  for (let m = TIMELINE_START_MIN; m <= TIMELINE_END_MIN; m += 120) {
    marks.push(m);
  }
  return marks;
};

// Simple, stable color per movie so the same title always gets the same
// swatch on the screen timeline (no theme changes needed — just a distinct
// hue per id, kept low-saturation so text stays readable).
export const colorForMovie = (movieId) => {
  const hash = String(movieId ?? "0")
    .split("")
    .reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7);
  const hue = Math.abs(hash) % 360;
  return {
    bg: `hsl(${hue}, 62%, 91%)`,
    border: `hsl(${hue}, 45%, 72%)`,
    text: `hsl(${hue}, 55%, 28%)`,
  };
};
