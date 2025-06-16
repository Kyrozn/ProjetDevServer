CREATE TABLE users (
    id TEXT PRIMARY KEY, 
    pseudo TEXT NOT NULL,
    password TEXT NOT NULL,
    Elo INT DEFAULT 1000 
);
CREATE TABLE historic  (
    id TEXT PRIMARY KEY, 
    player1_id TEXT NOT NULL, 
    player2_id TEXT NOT NULL,
    isWin BOOLEAN,
    player1_char TEXT NOT NULL, 
    player2_char TEXT NOT NULL,
    game_date TEXT NOT NULL,
);
-- Example UPDATE query to change a user's pseudo and token
UPDATE users
SET pseudo = 'new_pseudo', token = 'new_token'
WHERE id = 'user-uuid-1234';

$2b$10$b2nRAoC3xXforhOMWLmeGeyaA6eUdMRyGzhTCa0C.hdvaOxU1FbbO -- password123

