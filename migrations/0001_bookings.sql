CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  room TEXT NOT NULL,
  day TEXT NOT NULL,
  start INTEGER NOT NULL CHECK(start >= 10),
  end INTEGER NOT NULL CHECK(end <= 22 AND end - start BETWEEN 1 AND 3)
);
CREATE INDEX IF NOT EXISTS bookings_calendar ON bookings(day, room, start, end);
