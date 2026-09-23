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
