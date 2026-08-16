const { dbConnection } = require("../../db_connection")

const cloudinary = require("cloudinary").v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const attachmentController = {

    async getAttachments(req, res) {
        const db = require("../../db_connection");

        try {
            const result = await db.query(
                `SELECT *
                 FROM attachments
                 ORDER BY created_at DESC`
            );

            res.json(result.rows);

        } catch (err) {
            console.error(err);

            res.status(500).json({
                error: err.message
            });
        }
    },
    async getAttachment(req, res) {
        const db = require("../../db_connection");

        try {
            const result = await db.query(
                `SELECT *
                 FROM attachments
                 WHERE id = $1`,
                [req.params.attachmentid]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: "Attachment not found"
                });
            }

            res.json(result.rows[0]);

        } catch (err) {
            console.error(err);

            res.status(500).json({
                error: err.message
            });
        }
    },
    async addAttachment(req, res) {
        const db = require("../../db_connection");

        try {
            if (!req.file) {
                return res.status(400).json({
                    error: "No file provided"
                });
            }

            const {
                entity_type,
                entity_id,
                uploaded_by
            } = req.body;


            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp",
                "image/gif"
            ];

            if (!allowedTypes.includes(req.file.mimetype)) {
                return res.status(400).json({
                    error: "Unsupported file type"
                });
            }


            if (!["product", "material"].includes(entity_type)) {
                return res.status(400).json({
                    error: "Invalid entity type"
                });
            }


            if (req.file.size > 26214400) {
                return res.status(400).json({
                    error: "File cannot exceed 25 MB"
                });
            }


            // Upload image to Cloudinary
            const uploadResult = await new Promise(
                (resolve, reject) => {

                    const stream =
                        cloudinary.uploader.upload_stream(
                            {
                                folder:
                                    `placebo/${entity_type}/${entity_id}`,

                                resource_type: "image"
                            },
                            (error, result) => {

                                if (error) {
                                    reject(error);
                                } else {
                                    resolve(result);
                                }
                            }
                        );

                    stream.end(req.file.buffer);
                }
            );


            // Cloudinary public ID is stored in s3_key
            const s3_key = uploadResult.public_id;


            const result = await db.query(
                `INSERT INTO attachments (
                    entity_type,
                    entity_id,
                    file_name,
                    s3_key,
                    content_type,
                    size_bytes,
                    uploaded_by
                )
                VALUES (
                    $1, $2, $3, $4,
                    $5, $6, $7
                )
                RETURNING *`,
                [
                    entity_type,
                    entity_id,
                    req.file.originalname,
                    s3_key,
                    req.file.mimetype,
                    req.file.size,
                    uploaded_by || null
                ]
            );


            res.status(201).json({
                ...result.rows[0],
                url: uploadResult.secure_url
            });

        } catch (err) {
            console.error(err);

            res.status(500).json({
                error: err.message
            });
        }
    },
    async updateAttachment(req, res) {
        const db = require("../../db_connection");

        try {
            const {
                file_name,
                content_type,
                size_bytes
            } = req.body;

            const result = await db.query(
                `UPDATE attachments
                 SET
                    file_name = $1,
                    content_type = $2,
                    size_bytes = $3
                 WHERE id = $4
                 RETURNING *`,
                [
                    file_name,
                    content_type,
                    size_bytes,
                    req.params.attachmentid
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: "Attachment not found"
                });
            }

            res.json(result.rows[0]);

        } catch (err) {
            console.error(err);

            res.status(500).json({
                error: err.message
            });
        }
    },
    async deleteAttachment(req, res) {
        const db = require("../../db_connection");

        try {

            // Get attachment from database
            const attachment = await db.query(
                `SELECT *
                 FROM attachments
                 WHERE id = $1`,
                [req.params.attachmentid]
            );


            if (attachment.rows.length === 0) {
                return res.status(404).json({
                    error: "Attachment not found"
                });
            }


            const {
                s3_key
            } = attachment.rows[0];


            // Delete image from Cloudinary
            await cloudinary.uploader.destroy(
                s3_key,
                {
                    resource_type: "image"
                }
            );


            // Delete database row
            const result = await db.query(
                `DELETE FROM attachments
                 WHERE id = $1
                 RETURNING *`,
                [req.params.attachmentid]
            );


            res.json(result.rows[0]);

        } catch (err) {
            console.error(err);

            res.status(500).json({
                error: err.message
            });
        }
    }
};


module.exports = {
    attachmentController
};