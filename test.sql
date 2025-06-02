CREATE TABLE users (
    id TEXT PRIMARY KEY,         -- UUID as string
    pseudo TEXT NOT NULL,        -- Username
    token TEXT NOT NULL,         -- JWT
    difficulties TEXT            -- JSON string or comma-separated values
);

