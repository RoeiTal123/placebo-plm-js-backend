const { dbConnection } = require("../../db_connection")

exports.order_lineRouter = {
    async getOrder_lines(req, res) {
        const db = require("../../db_connection");

        try {
            const result = await db.query(
                `SELECT *
             FROM order_lines
             ORDER BY order_id`
            );

            res.json(result.rows);
        } catch (err) {
            console.error(err);

            res.status(500).json({
                error: err.message
            });
        }
    }, async getOrder_line(req, res) {
        const db = require("../../db_connection");
        const { orderlineid } = req.params;

        try {
            const result = await db.query(
                `SELECT *
             FROM order_lines
             WHERE id = $1`,
                [orderlineid]
            );

            const orderLine = result.rows[0];

            if (!orderLine) {
                return res.status(404).json({
                    error: "Order line not found"
                });
            }

            res.json(orderLine);
        } catch (err) {
            console.error(err);

            res.status(500).json({
                error: err.message
            });
        }
    }, async addOrder_line(req, res) {
        const db = require("../../db_connection");

        const {
            id,
            org_id,
            order_id,
            product_id,
            color,
            size,
            quantity,
            destination
        } = req.body;

        try {
            const result = await db.query(
                `INSERT INTO order_lines (
                id,
                org_id,
                order_id,
                product_id,
                color,
                size,
                quantity,
                destination
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
                [
                    id,
                    org_id,
                    order_id,
                    product_id,
                    color,
                    size,
                    quantity,
                    destination
                ]
            );

            res.status(201).json({
                success: true,
                orderLine: result.rows[0]
            });
        } catch (err) {
            console.error(err);

            res.status(500).json({
                success: false,
                error: err.message
            });
        }
    }, async updateOrder_line(req, res) {
        const db = require("../../db_connection");
        const { orderlineid } = req.params;

        const {
            order_id,
            product_id,
            color,
            size,
            quantity,
            destination
        } = req.body;

        try {
            const result = await db.query(
                `UPDATE order_lines
             SET
                order_id = $1,
                product_id = $2,
                color = $3,
                size = $4,
                quantity = $5,
                destination = $6
             WHERE id = $7
             RETURNING *`,
                [
                    order_id,
                    product_id,
                    color,
                    size,
                    quantity,
                    destination,
                    orderlineid
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Order line not found"
                });
            }

            return res.status(200).json({
                success: true,
                orderLine: result.rows[0]
            });
        } catch (err) {
            console.error(err);

            res.status(500).json({
                success: false,
                error: err.message
            });
        }
    }, async deleteOrder_line(req, res) {
        const db = require("../../db_connection");
        const { orderlineid } = req.params;

        try {
            const result = await db.query(
                `DELETE FROM order_lines
             WHERE id = $1
             RETURNING *`,
                [orderlineid]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Order line not found"
                });
            }

            return res.status(200).json({
                success: true,
                deletedOrderLine: true,
                orderLine: result.rows[0]
            });
        } catch (err) {
            console.error(err);

            res.status(500).json({
                success: false,
                error: err.message
            });
        }
    }
}