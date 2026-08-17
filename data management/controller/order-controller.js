const { dbConnection } = require("../../db_connection");

exports.orderController = {
    async getOrders(req, res) {
        const db = require("../../db_connection");

        const {
            order = "",
            product = "",
            destination = "",
            color = "",
            size = ""
        } = req.query;

        const conditions = [];
        const values = [];

        if (order) {
            values.push(`%${order}%`);
            conditions.push(`o.order_number ILIKE $${values.length}`);
        }

        if (product) {
            values.push(`%${product}%`);
            conditions.push(`p.name ILIKE $${values.length}`);
        }

        if (destination) {
            values.push(`%${destination}%`);
            conditions.push(`o.shipping_destination ILIKE $${values.length}`);
        }

        if (color) {
            values.push(`%${color}%`);
            conditions.push(`ol.color ILIKE $${values.length}`);
        }

        if (size) {
            values.push(`%${size}%`);
            conditions.push(`ol.size ILIKE $${values.length}`);
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

        try {
            const result = await db.query(
                `SELECT DISTINCT o.*
                 FROM orders o
                 LEFT JOIN order_lines ol
                    ON o.id = ol.order_id
                 LEFT JOIN products p
                    ON ol.product_id = p.id
                 ${whereClause}
                 ORDER BY o.order_date DESC`,
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
    async getOrder(req, res) {
        const db = require("../../db_connection");
        const { orderid } = req.params;

        try {
            const orderResult = await db.query(
                `SELECT *
             FROM orders
             WHERE id = $1`,
                [orderid]
            );

            const order = orderResult.rows[0];

            if (!order) {
                return res.status(404).json({
                    error: "Order not found"
                });
            }

            const linesResult = await db.query(
                `SELECT *
             FROM order_lines
             WHERE order_id = $1
             ORDER BY id`,
                [orderid]
            );

            const costsResult = await db.query(
                `SELECT *
             FROM order_additional_costs
             WHERE order_id = $1
             ORDER BY id`,
                [orderid]
            );

            res.json({
                ...order,
                lines: linesResult.rows,
                additional_costs: costsResult.rows
            });

        } catch (err) {
            console.error(err);

            res.status(500).json({
                error: err.message
            });
        }
    },
    async addOrder(req, res) {
        const db = require("../../db_connection");

        const {
            order_number,
            status,
            shipping_destination,
            order_date,
            target_date,
            order_currency,
            shipping_cost,
            notes,
            spam,
            season,
            production_country,
            destination_address
        } = req.body;

        const name = req.body.order_name || req.body.name || null;
        const factory = req.body.production_factory || req.body.factory || null;

        try {
            const result = await db.query(
                `INSERT INTO orders (
                    order_number,
                    name,
                    status,
                    factory,
                    shipping_destination,
                    order_date,
                    target_date,
                    order_currency,
                    shipping_cost,
                    notes,
                    spam,
                    season,
                    production_country,
                    destination_address
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7,
                    $8, $9, $10, $11, $12, $13, $14
                )
                RETURNING *`,
                [
                    order_number,
                    name,
                    status,
                    factory,
                    shipping_destination,
                    order_date,
                    target_date ?? null,
                    order_currency,
                    shipping_cost ?? 0,
                    notes ?? null,
                    spam ?? false,
                    season ?? null,
                    production_country ?? null,
                    destination_address ?? null
                ]
            );

            res.status(201).json({
                success: true,
                order: result.rows[0]
            });

        } catch (err) {
            console.error(err);

            res.status(500).json({
                success: false,
                error: err.message
            });
        }
    },
    async updateOrder(req, res) {
        const db = require("../../db_connection");
        const { orderid } = req.params;

        const data = req.body;

        try {
            const keys = Object.keys(data);

            if (
                keys.length === 1 &&
                keys[0] === "spam"
            ) {
                const result = await db.query(
                    `UPDATE orders
                     SET spam = $1
                     WHERE id = $2
                     RETURNING *`,
                    [
                        data.spam,
                        orderid
                    ]
                );

                if (result.rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: "Order not found"
                    });
                }

                return res.status(200).json({
                    success: true,
                    order: result.rows[0]
                });
            }

            const {
                status,
                shipping_destination,
                order_date,
                target_date,
                order_currency,
                shipping_cost,
                notes,
                spam,
                season,
                production_country,
                destination_address
            } = data;

            const name = data.order_name || data.name || null;
            const factory = data.production_factory || data.factory || null;

            const result = await db.query(
                `UPDATE orders
                 SET
                    name = $1,
                    status = $2,
                    factory = $3,
                    shipping_destination = $4,
                    order_date = $5,
                    target_date = $6,
                    order_currency = $7,
                    shipping_cost = $8,
                    notes = $9,
                    spam = $10,
                    season = $11,
                    production_country = $12,
                    destination_address = $13,
                    updated_at = now()
                 WHERE id = $14
                 RETURNING *`,
                [
                    name,
                    status,
                    factory,
                    shipping_destination,
                    order_date,
                    target_date ?? null,
                    order_currency,
                    shipping_cost ?? 0,
                    notes ?? null,
                    spam ?? false,
                    season ?? null,
                    production_country ?? null,
                    destination_address ?? null,
                    orderid
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Order not found"
                });
            }

            return res.status(200).json({
                success: true,
                order: result.rows[0]
            });

        } catch (err) {
            console.error(err);

            res.status(500).json({
                success: false,
                error: err.message
            });
        }
    },
    async deleteOrder(req, res) {
        const db = require("../../db_connection");
        const { orderid } = req.params;

        try {
            const result = await db.query(
                `DELETE FROM orders
                 WHERE id = $1
                 RETURNING *`,
                [orderid]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Order not found"
                });
            }

            return res.status(200).json({
                success: true,
                deletedOrder: true,
                order: result.rows[0]
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