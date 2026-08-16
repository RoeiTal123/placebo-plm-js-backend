const { dbConnection } = require("../../db_connection")

exports.materialController = {
    async getMaterials(req, res) {
        const db = require("../../db_connection");

        const {
            name = "",
            category = "",
            status = ""
        } = req.query;

        const conditions = [];
        const values = [];

        if (name) {
            values.push(`%${name}%`);
            conditions.push(`m.name ILIKE $${values.length}`);
        }

        if (category) {
            values.push(category);
            conditions.push(`m.category = $${values.length}`);
        }

        if (status) {
            values.push(status);
            conditions.push(`m.status = $${values.length}`);
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

        try {
            const result = await db.query(
                `SELECT *
             FROM materials m
             ${whereClause}
             ORDER BY m.name ASC`,
                values
            );

            res.json(result.rows);
        } catch (err) {
            console.error(err);

            res.status(500).json({
                error: err.message
            });
        }
    },
    async getMaterial(req, res) {
        const db = require("../../db_connection");
        const { materialid } = req.params;

        try {
            const result = await db.query(
                `SELECT *
             FROM materials
             WHERE id = $1`,
                [materialid]
            );

            const material = result.rows[0];

            if (!material) {
                return res.status(404).json({
                    error: "Material not found"
                });
            }

            res.json(material);
        } catch (err) {
            console.error(err);

            res.status(500).json({
                error: err.message
            });
        }
    },
    async addMaterial(req, res) {
        const db = require("../../db_connection");

        const {
            name,
            color,
            color_hex,
            category,
            supplier_id,
            unit_cost,
            currency,
            unit_of_measure,
            minimum_order_quantity,
            notes,
            status
        } = req.body;

        try {
            const result = await db.query(
                `INSERT INTO materials (
                name,
                color,
                color_hex,
                category,
                supplier_id,
                unit_cost,
                currency,
                unit_of_measure,
                minimum_order_quantity,
                notes,
                status
            )
            VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10, $11
            )
            RETURNING *`,
                [
                    name,
                    color,
                    color_hex,
                    category,
                    supplier_id,
                    unit_cost,
                    currency,
                    unit_of_measure,
                    minimum_order_quantity,
                    notes,
                    status
                ]
            );

            res.status(201).json({
                success: true,
                material: result.rows[0]
            });

        } catch (err) {
            console.error(err);

            res.status(500).json({
                success: false,
                error: err.message
            });
        }
    },
    async updateMaterial(req, res) {
        const db = require("../../db_connection");
        const { materialid } = req.params;

        const {
            name,
            color,
            color_hex,
            category,
            supplier_id,
            unit_cost,
            currency,
            unit_of_measure,
            minimum_order_quantity,
            notes,
            status,
            spam
        } = req.body;

        try {
            const result = await db.query(
                `UPDATE materials
             SET
                name = $1,
                color = $2,
                color_hex = $3,
                category = $4,
                supplier_id = $5,
                unit_cost = $6,
                currency = $7,
                unit_of_measure = $8,
                minimum_order_quantity = $9,
                notes = $10,
                status = $11,
                spam = $12,
                updated_at = now()
             WHERE id = $13
             RETURNING *`,
                [
                    name,
                    color,
                    color_hex,
                    category,
                    supplier_id,
                    unit_cost,
                    currency,
                    unit_of_measure,
                    minimum_order_quantity,
                    notes,
                    status,
                    spam,
                    materialid
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Material not found"
                });
            }

            res.status(200).json({
                success: true,
                material: result.rows[0]
            });

        } catch (err) {
            console.error(err);

            res.status(500).json({
                success: false,
                error: err.message
            });
        }
    },
    async deleteMaterial(req, res) {
        const db = require("../../db_connection");

        const { materialid } = req.params;

        try {
            const result = await db.query(
                `DELETE FROM materials
             WHERE id = $1
             RETURNING *`,
                [materialid]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Material not found"
                });
            }

            return res.status(200).json({
                success: true,
                deletedMaterial: true,
                material: result.rows[0]
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