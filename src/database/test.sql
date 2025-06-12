CREATE TABLE users (
    id TEXT PRIMARY KEY,         -- UUID as string
    pseudo TEXT NOT NULL,        -- Username
    token TEXT NOT NULL,         -- JWT
    difficulties TEXT            -- JSON string or comma-separated values
);
-- Example UPDATE query to change a user's pseudo and token
UPDATE users
SET pseudo = 'new_pseudo', token = 'new_token'
WHERE id = 'user-uuid-1234';

$2b$10$b2nRAoC3xXforhOMWLmeGeyaA6eUdMRyGzhTCa0C.hdvaOxU1FbbO -- password123