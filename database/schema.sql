-- Mínimo viable (puedes ampliarlo)
CREATE TABLE IF NOT EXISTS "User"(
  id TEXT PRIMARY KEY,
  displayName TEXT
);

CREATE TABLE IF NOT EXISTS Level(
  key TEXT PRIMARY KEY,
  "order" INT NOT NULL,
  rulesJson JSONB
);

CREATE TABLE IF NOT EXISTS PromptTemplate(
  levelKey TEXT REFERENCES Level(key),
  version INT NOT NULL,
  templateText TEXT NOT NULL,
  constraintsJson JSONB,
  PRIMARY KEY(levelKey, version)
);

CREATE TABLE IF NOT EXISTS GeneratedSet(
  id TEXT PRIMARY KEY,
  userId TEXT REFERENCES "User"(id),
  levelKey TEXT REFERENCES Level(key),
  provider TEXT,
  seed INT,
  promptVersion INT,
  rawResponseJson JSONB,
  status TEXT CHECK (status IN ('open','completed')) DEFAULT 'open',
  createdAt TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS GeneratedItem(
  id TEXT PRIMARY KEY,
  setId TEXT REFERENCES GeneratedSet(id),
  idx INT NOT NULL,
  type TEXT CHECK (type IN ('main','random','boss')),
  question TEXT NOT NULL,
  optionsJson JSONB NOT NULL,
  answerIndex INT,
  answerKeys JSONB,
  explanation TEXT NOT NULL,
  metadataJson JSONB,
  UNIQUE(setId, idx)
);

CREATE TABLE IF NOT EXISTS PlayerState(
  userId TEXT REFERENCES "User"(id),
  levelKey TEXT REFERENCES Level(key),
  currentSetId TEXT REFERENCES GeneratedSet(id),
  nextIndex INT NOT NULL DEFAULT 1,
  score INT NOT NULL DEFAULT 0,
  flagsJson JSONB,
  PRIMARY KEY(userId, levelKey)
);

CREATE TABLE IF NOT EXISTS Attempt(
  id TEXT PRIMARY KEY,
  setId TEXT REFERENCES GeneratedSet(id),
  itemIndex INT NOT NULL,
  answerGivenJson JSONB,
  isCorrect BOOLEAN,
  takenAt TIMESTAMPTZ DEFAULT now(),
  UNIQUE(setId, itemIndex)
);
