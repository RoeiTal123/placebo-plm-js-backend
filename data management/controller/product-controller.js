const { dbConnection } = require("../../db_connection")

exports.productController = {
    async getProducts(req, res) {
        const db = require("../../db_connection");

        const { search = "", status = "" } = req.query;

        const conditions = [];
        const values = [];

        if (search) {
            values.push(`%${search}%`);
            conditions.push(`
            (
                p.name ILIKE $${values.length}
                OR p.style_code ILIKE $${values.length}
                OR p.sku ILIKE $${values.length}
            )
        `);
        }

        if (status) {
            values.push(status);
            conditions.push(`p.status = $${values.length}`);
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

        try {
            const result = await db.query(`
            SELECT *
            FROM products p
            ${whereClause}
        `, values);

            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    },
    async getProduct(req, res) {
        const productid = req.params.productid;
        const db = require("../../db_connection");

        try {
            const result = await db.query(`
            SELECT *
            FROM products
            WHERE id = $1
        `, [productid]);

            const product = result.rows[0];

            if (!product) {
                return res.status(404).json({
                    error: "Product not found"
                });
            }

            res.json(product);
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    },
    async addProduct(req, res) {
        const db = require("../../db_connection");

        const {
            id,
            org_id,
            name,
            style_code,
            sku,
            category,
            colors,
            sizes,
            pricing_multiplier,
            selling_price,
            currency,
            notes,
            status
        } = req.body;

        try {
            const result = await db.query(
                `INSERT INTO products (
                id,
                org_id,
                name,
                style_code,
                sku,
                category,
                colors,
                sizes,
                pricing_multiplier,
                selling_price,
                currency,
                notes,
                status
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7,
                $8, $9, $10, $11, $12, $13
            )
            RETURNING *`,
                [
                    id,
                    org_id,
                    name,
                    style_code,
                    sku,
                    category,
                    colors,
                    sizes,
                    pricing_multiplier,
                    selling_price,
                    currency,
                    notes,
                    status
                ]
            );

            res.status(201).json(result.rows[0]);
        }
        catch (err) {
            console.error(err);

            res.status(500).json({
                success: false,
                error: err.message
            });
        }
    },
    async updateProduct(req, res) {
        const db = require("../../db_connection");

        const { productid } = req.params;

        const {
            name,
            style_code,
            sku,
            category,
            colors,
            sizes,
            pricing_multiplier,
            selling_price,
            currency,
            notes,
            status
        } = req.body;

        try {
            const result = await db.query(
                `UPDATE products
             SET
                name = $1,
                style_code = $2,
                sku = $3,
                category = $4,
                colors = $5,
                sizes = $6,
                pricing_multiplier = $7,
                selling_price = $8,
                currency = $9,
                notes = $10,
                status = $11
             WHERE id = $12
             RETURNING *`,
                [
                    name,
                    style_code,
                    sku,
                    category,
                    colors,
                    sizes,
                    pricing_multiplier,
                    selling_price,
                    currency,
                    notes,
                    status,
                    productid
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            return res.status(200).json(result.rows[0]);

        } catch (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                error: err.message
            });
        }
    },
    async deleteProduct(req, res) {
        const db = require("../../db_connection");

        const { productid } = req.params;

        try {
            const result = await db.query(
                `DELETE FROM products
             WHERE id = $1
             RETURNING *`,
                [productid]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            return res.status(200).json({
                success: true,
                deletedProduct: true,
                product: result.rows[0]
            });

        } catch (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                error: err.message
            });
        }
    }
}