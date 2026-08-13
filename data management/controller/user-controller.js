const db = require("../../db_connection");

exports.userController = {

  async getUsers(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          id, 
          username, 
          fullname, 
          email, 
          created_at, 
          birthday, 
          profile_pic_url, 
          user_type 
        FROM users 
        ORDER BY created_at DESC
      `);

      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },

  async addUser(req, res) {

    const { username, password, fullname, email, birthday, profile_pic_url, user_type } = req.body;

    if (!birthday) {
      return res.status(400).json({
        success: false,
        error: "Birthday is required."
      });
    }

    try {
      const result = await db.query(
        `INSERT INTO users (username, password, fullname, email, birthday, profile_pic_url, user_type) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id`,
        [username, password, fullname, email, birthday, profile_pic_url, user_type || 'user']
      );

      const newUserId = result.rows[0].id;

      res.status(201).json({ 
        success: true, 
        message: "User registered successfully!",
        userId: newUserId 
      });

    } catch (err) {
      console.error("Database Error:", err);

      if (err.code === '23505') {
        return res.status(400).json({ 
          success: false, 
          error: "Username or Email is already registered." 
        });
      }

      res.status(500).json({ 
        success: false, 
        error: "Internal server error during registration." 
      });
    }
  },

    async login(req, res) {
    const { username, password } = req.body;

    try {
      const result = await db.query(
        `SELECT id, username, password, fullname, email, profile_pic_url, user_type 
         FROM users 
         WHERE username = $1`,
        [username]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ 
          success: false, 
          error: "Invalid username or password." 
        });
      }

      const user = result.rows[0];

      if (user.password !== password) {
        return res.status(401).json({ 
          success: false, 
          error: "Invalid username or password." 
        });
      }

      delete user.password;

      res.json(user);

    } catch (err) {
      console.error("Login Controller Error:", err);
      res.status(500).json({ 
        success: false, 
        error: "Internal server error during login." 
      });
    }
  },
  async updateUser(req, res) {
    const { id } = req.params;
    const { username, fullname, email, birthday, profile_pic_url, user_type } = req.body;

    try {
      // 1. Verify user exists
      const checkUser = await db.query("SELECT id FROM users WHERE id = $1", [id]);
      if (checkUser.rows.length === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // 2. Update properties (keeping original values if not provided in req.body)
      const result = await db.query(
        `UPDATE users 
         SET username = COALESCE($1, username),
             fullname = COALESCE($2, fullname),
             email = COALESCE($3, email),
             birthday = COALESCE($4, birthday),
             profile_pic_url = COALESCE($5, profile_pic_url),
             user_type = COALESCE($6, user_type)
         WHERE id = $7
         RETURNING id, username, fullname, email, birthday, profile_pic_url, user_type`,
        [username, fullname, email, birthday, profile_pic_url, user_type, id]
      );

      res.json({
        success: true,
        message: "User updated successfully",
        user: result.rows[0]
      });

    } catch (err) {
      console.error("Update User Error:", err);
      if (err.code === '23505') {
        return res.status(400).json({ success: false, error: "Username or Email already exists." });
      }
      res.status(500).json({ success: false, error: "Internal server error during update." });
    }
  },

  async deleteUser(req, res) {
    const { id } = req.params; // Using URL parameter /:id for safety

    try {
      // Start a transaction to ensure all cascading deletes succeed together
      await db.query("BEGIN");

      // 1. Delete likes associated with the user
      await db.query("DELETE FROM post_likes WHERE user_id = $1", [id]);

      // 2. Find all posts belonging to this user to delete their associated likes
      const userPosts = await db.query("SELECT id FROM posts WHERE user_id = $1", [id]);
      const postIds = userPosts.rows.map(row => row.id);

      if (postIds.length > 0) {
        // Delete likes on posts that this user created
        await db.query("DELETE FROM post_likes WHERE post_id = ANY($1)", [postIds]);
        // Delete the posts themselves
        await db.query("DELETE FROM posts WHERE user_id = $1", [id]);
      }

      // 3. Delete locations owned by this user
      await db.query("DELETE FROM locations WHERE owner_id = $1", [id]);

      // 4. Finally, delete the user profile
      const userDeleteResult = await db.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);

      if (userDeleteResult.rows.length === 0) {
        await db.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "User not found" });
      }

      await db.query("COMMIT");

      res.json({
        success: true,
        message: "User and all associated data deleted successfully."
      });

    } catch (err) {
      await db.query("ROLLBACK");
      console.error("Delete User Error:", err);
      res.status(500).json({ success: false, error: "Internal server error during deletion." });
    }
  }
};