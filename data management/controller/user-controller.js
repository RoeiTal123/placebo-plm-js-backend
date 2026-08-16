const db = require("../../db_connection");
const argon2 = require("argon2");

exports.userController = {

  async getUsers(req, res) {
    const db = require("../../db_connection");

    try {
      const result = await db.query(
        `SELECT
                id,
                email,
                name,
                role,
                supplier_id,
                status,
                last_login_at,
                created_at
             FROM users
             ORDER BY created_at DESC`
      );

      res.json(result.rows);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: err.message
      });
    }
  }, async getUser(req, res) {
    const db = require("../../db_connection");
    const { userid } = req.params;

    try {
      const result = await db.query(
        `SELECT
                id,
                email,
                name,
                role,
                supplier_id,
                status,
                last_login_at,
                created_at
             FROM users
             WHERE id = $1`,
        [userid]
      );

      const user = result.rows[0];

      if (!user) {
        return res.status(404).json({
          error: "User not found"
        });
      }

      res.json(user);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: err.message
      });
    }
  }, async addUser(req, res) {
    const db = require("../../db_connection");
    const argon2 = require("argon2");

    const {
      username,
      email,
      password,
      name
    } = req.body;

    try {
      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          error: "Username, email and password are required"
        });
      }


      // Default values for signup
      const role = "viewer";
      const status = "active";
      const supplier_id = null;

      // Hash password
      const password_hash = await argon2.hash(password, {
        type: argon2.argon2id
      });

      const result = await db.query(
        `INSERT INTO users (
                username,
                email,
                password_hash,
                name,
                role,
                supplier_id,
                status
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7
            )
            RETURNING
                id,
                username,
                email,
                name,
                role,
                supplier_id,
                status,
                last_login_at,
                created_at`,
        [
          username,
          email,
          password_hash,
          name,
          role,
          supplier_id,
          status
        ]
      );

      res.status(201).json({
        success: true,
        user: result.rows[0]
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }, async login(req, res) {
    const db = require("../../db_connection");
    const argon2 = require("argon2");

    const {
      username,
      password
    } = req.body;

    try {
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: "Username and password are required"
        });
      }

      const result = await db.query(
        `SELECT
                id,
                username,
                email,
                password_hash,
                name,
                role,
                supplier_id,
                status,
                last_login_at,
                created_at
             FROM users
             WHERE LOWER(username) = LOWER($1)
             LIMIT 1`,
        [username]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: "Invalid username or password"
        });
      }

      const user = result.rows[0];

      if (user.status !== "active") {
        return res.status(403).json({
          success: false,
          error: "User account is not active"
        });
      }

      const validPassword = await argon2.verify(
        user.password_hash,
        password
      );

      if (!validPassword) {
        return res.status(401).json({
          success: false,
          error: "Invalid username or password"
        });
      }

      // Update last login
      await db.query(
        `UPDATE users
             SET last_login_at = now()
             WHERE id = $1`,
        [user.id]
      );

      // Never send the password hash to the frontend
      delete user.password_hash;

      res.json({
        success: true,
        user
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }, async updateUser(req, res) {
    const db = require("../../db_connection");
    const { userid } = req.params;

    const {
      email,
      password_hash,
      name,
      role,
      supplier_id,
      status,
      last_login_at,
    } = req.body;

    try {
      const result = await db.query(
        `UPDATE users
             SET
                email = $1,
                password_hash = $2,
                name = $3,
                role = $4,
                supplier_id = $5,
                status = $6,
                last_login_at = $7,
             WHERE id = $8
             RETURNING *`,
        [
          email,
          password_hash,
          name,
          role,
          supplier_id,
          status,
          last_login_at,
          userid
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      return res.status(200).json({
        success: true,
        user: result.rows[0]
      });
    } catch (err) {
      console.error(err);

      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }, async deleteUser(req, res) {
    const db = require("../../db_connection");
    const { userid } = req.params;

    try {
      const result = await db.query(
        `DELETE FROM users
             WHERE id = $1
             RETURNING *`,
        [userid]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      return res.status(200).json({
        success: true,
        deletedUser: true,
        user: result.rows[0]
      });
    } catch (err) {
      console.error(err);

      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }
};