const db = require("../../db_connection");
const argon2 = require("argon2");

exports.userController = {

  async getUsers(req, res) {
    const db = require("../../db_connection");

    try {
      const result = await db.query(
        `SELECT
                id,
                org_id,
                email,
                name,
                role,
                supplier_id,
                status,
                last_login_at,
                created_at,
                spam
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
                org_id,
                email,
                name,
                role,
                supplier_id,
                status,
                last_login_at,
                created_at,
                spam
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

    const {
      id,
      org_id,
      email,
      password,
      name,
      role,
      supplier_id,
      status
    } = req.body;

    try {
      // Hash password before storing it
      const password_hash = await argon2.hash(password, {
        type: argon2.argon2id
      });

      const result = await db.query(
        `INSERT INTO users (
                id,
                org_id,
                email,
                password_hash,
                name,
                role,
                supplier_id,
                status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, org_id, email, name, role, supplier_id, status,
                      last_login_at, created_at`,
        [
          id,
          org_id,
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
    const { name, password } = req.body;

    try {
      const result = await db.query(
        `SELECT
                id,
                org_id,
                email,
                password_hash,
                name,
                role,
                supplier_id,
                status,
                last_login_at,
                created_at
             FROM users
             WHERE org_id = $1
             AND LOWER(name) = LOWER($4)`,
        [/* authenticated org_id */, name]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: "Invalid name or password."
        });
      }

      const user = result.rows[0];

      // Verify plaintext password against Argon2id hash
      const validPassword = await argon2.verify(
        user.password_hash,
        password
      );

      if (!validPassword) {
        return res.status(401).json({
          success: false,
          error: "Invalid name or password."
        });
      }

      // Don't send password_hash to the frontend
      delete user.password_hash;

      // Update last login
      await db.query(
        `UPDATE users
             SET last_login_at = NOW()
             WHERE id = $1`,
        [user.id]
      );

      res.json(user);

    } catch (err) {
      console.error("Login Controller Error:", err);

      res.status(500).json({
        success: false,
        error: "Internal server error during login."
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
      spam
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
                spam = $8
             WHERE id = $9
             RETURNING *`,
        [
          email,
          password_hash,
          name,
          role,
          supplier_id,
          status,
          last_login_at,
          spam,
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