/** User class for message.ly */
const db = require("../db");
const ExpressError = require("../expressError");
const bcrypt = require("bcrypt");
const { BCRYPT_WORK_FACTOR } = require("../config");

/** User of the site. */

class User {
  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    if (!username || !password || !first_name || !last_name || !phone) {
      throw new ExpressError("All fields are required", 400);
    }
    const hashedPwd = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
    const result = await db.query(
      `INSERT INTO users (
          username,
          password,
          first_name,
          last_name,
          phone,
          join_at,
          last_login_at)
        VALUES ($1, $2, $3, $4, $5, current_timestamp, current_timestamp)
        RETURNING username, password, first_name, last_name, phone`,
      [username, hashedPwd, first_name, last_name, phone]
    );
    // check for duplicate username based on sql error code
    if (result.code === "23505") {
      throw new ExpressError(`Username ${username} already exists`, 400);
    }

    return result.rows[0];
  }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    const result = await db.query(
      `SELECT password FROM users WHERE username = $1`,
      [username]
    );
    const user = result.rows[0];

    if (!user) {
      throw new ExpressError("Invalid username/password", 400);
    }

    return await bcrypt.compare(password, user.password);
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const result = await db.query(
      `UPDATE users
      SET last_login_at = current_timestamp
      WHERE username = $1
      RETURNING username, last_login_at`,
      [username]
    );
    if (!result.rows[0]) {
      throw new ExpressError(`No such user: ${username}`, 404);
    }

    return result.rows[0];
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    const results = await db.query(
      `SELECT username, first_name, last_name, phone 
      FROM users`
    );
    if (!results.rows[0]) {
      throw new ExpressError(`No users found`, 404);
    }
    return results.rows;
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const results = await db.query(
      `SELECT username, first_name, last_name, phone, join_at, last_login_at
      FROM users
      WHERE username = $1`,
      [username]
    );
    if (!results.rows[0]) {
      throw new ExpressError(`No such user: ${username}`, 404);
    }
    return results.rows[0];
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    const results = await db.query(
      `SELECT m.id, m.to_username, m.body, m.sent_at, m.read_at, u.first_name, u.last_name, u.phone
      FROM messages AS m
      JOIN users AS u
      ON m.to_username = u.username
      WHERE m.from_username = $1`,
      [username]
    );

    if (!results.rows[0]) {
      throw new ExpressError(`No messages found from: ${username}`, 404);
    }

    return results.rows.map((row) => ({
      id: row.id,
      to_user: {
        username: row.to_username,
        first_name: row.first_name,
        last_name: row.last_name,
        phone: row.phone,
      },
      body: row.body,
      sent_at: row.sent_at,
      read_at: row.read_at,
    }));
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const results = await db.query(
      `SELECT m.id, m.from_username, m.body, m.sent_at, m.read_at, u.first_name, u.last_name, u.phone
      FROM messages AS m
      JOIN users AS u
      ON m.from_username = u.username
      WHERE m.to_username = $1`,
      [username]
    );

    if (!results.rows[0]) {
      throw new ExpressError(`No messages found to: ${username}`, 404);
    }

    return results.rows.map((row) => ({
      id: row.id,
      from_user: {
        username: row.from_username,
        first_name: row.first_name,
        last_name: row.last_name,
        phone: row.phone,
      },
      body: row.body,
      sent_at: row.sent_at,
      read_at: row.read_at,
    }));
  }
}

module.exports = User;
