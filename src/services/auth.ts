import db from "../database/db.js";
import bcrypt from "bcrypt";
import { User } from "../models/types.js";

export function getUserFromToken(token: string): Promise<User | null> {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE id = ?", [token], (err, row: {id: string, pseudo: string, difficulties: string}) => {
      if (err) return reject(err);
      if (!row) return resolve(null);
      resolve({
        id: row.id,
        pseudo: row.pseudo,
        difficulties: JSON.parse(row.difficulties || "[]"),
      });
    });
  });
}

export function getUserFromPassword(
  username: string,
  password: string
): Promise<User | null> {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE pseudo = ?", [username], async (err, result: {token: string, id: string, pseudo: string, difficulties: string}) => {
      if (err) return reject(err);
      if (!result) return resolve(null);
      bcrypt.compare(password, result.token, (bcryptErr, resultbool) => {
        if (bcryptErr) return reject(bcryptErr);
        if (resultbool) {
          resolve({
            id: result.id,
            pseudo: result.pseudo,
            difficulties: JSON.parse(result.difficulties || "[]"),
          });
        } else {
          resolve(null);
        }
      });
    });
  });
}
