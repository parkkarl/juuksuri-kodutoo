-- Juuksurite tabel
CREATE TABLE IF NOT EXISTS barbers (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Broneeringute tabel.
-- UNIQUE (barber_id, start_time) on kriitiline turvameede:
-- andmebaas tagab, et sama juuksurile samale algusajale ei saa tekkida
-- kaht broneeringut ka samaaegsete päringute korral (atomaarne).
CREATE TABLE IF NOT EXISTS bookings (
  id             SERIAL PRIMARY KEY,
  barber_id      INTEGER NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  start_time     TIMESTAMPTZ NOT NULL,
  end_time       TIMESTAMPTZ NOT NULL,
  customer_name  TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bookings_barber_start_unique UNIQUE (barber_id, start_time),
  CONSTRAINT bookings_end_after_start CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS bookings_start_time_idx ON bookings (start_time);
CREATE INDEX IF NOT EXISTS bookings_barber_start_idx ON bookings (barber_id, start_time);

-- Admin kasutajad (sessioonipõhine autentimine)
CREATE TABLE IF NOT EXISTS admin_users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sessioonid serveri-poolses salvestuses
-- (cookie hoiab ainult sessiooni ID-d, mitte tegelikke andmeid)
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);
