-- One row per step reached, and nothing else.
--
-- No name, no club, no squad, no address, no IP: the game never sends them and
-- there is nowhere here to put them. `aid` is a random number made on the
-- device and means nothing anywhere else; it is here so that "how many people"
-- and "how far did each get" are answerable at all.
--
-- The primary key is the device and the step together, so a step is counted
-- once per device however many times it arrives: a phone that was offline and
-- posts its queue twice does not become two people who reached round three.
-- `open` is the exception the funnel needs to be a funnel, and it is counted
-- per session instead, in sessions below.
CREATE TABLE IF NOT EXISTS steps (
  aid   TEXT NOT NULL,
  step  TEXT NOT NULL,
  ts    INTEGER NOT NULL,    -- ms since epoch, the device's own clock
  day   TEXT NOT NULL,       -- YYYY-MM-DD, worked out on the server
  PRIMARY KEY (aid, step)
);
CREATE INDEX IF NOT EXISTS steps_day ON steps (day);
CREATE INDEX IF NOT EXISTS steps_step ON steps (step);

-- One row per sitting: how many opened the game, and how many came back.
CREATE TABLE IF NOT EXISTS sessions (
  sid   TEXT PRIMARY KEY,
  aid   TEXT NOT NULL,
  ts    INTEGER NOT NULL,
  day   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_day ON sessions (day);
CREATE INDEX IF NOT EXISTS sessions_aid ON sessions (aid);

-- One row per crash. Not deduped, because three crashes on one phone matter
-- more than one, and the point is to tell a real fault from an unlucky device.
--
-- `where_step` is the funnel step the player had reached and `err` is the
-- class of error; both come from closed lists that the worker checks, so no
-- free text ever lands here. The error's MESSAGE is never sent, because a
-- message is the one shape that could carry a name somebody typed.
CREATE TABLE IF NOT EXISTS crashes (
  aid        TEXT NOT NULL,
  sid        TEXT NOT NULL,
  ts         INTEGER NOT NULL,
  day        TEXT NOT NULL,
  where_step TEXT NOT NULL,
  err        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS crashes_day ON crashes (day);
