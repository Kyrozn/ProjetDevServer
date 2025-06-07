import sqlite3 from "sqlite3";
sqlite3.verbose();

const db = new sqlite3.Database("OneStar.db");

export default db;
