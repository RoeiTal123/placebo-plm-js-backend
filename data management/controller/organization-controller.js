const { dbConnection } = require("../../db_connection")
const cloudinary = require("../../cloudinary");

exports.organizationController = {
    async getOrganizations(req, res) {
        const db = require("../../db_connection");

        const filter = req.query.sort

        let whereClause = "";
        let orderBy = "p.created_at DESC";
        let values = [];

        switch (filter) {
            case "old":
                orderBy = "p.created_at ASC";
                break;

            case "new":
                orderBy = "p.created_at DESC";
                break;

            case "day":
                whereClause = "WHERE p.created_at >= NOW() - INTERVAL '1 DAY'";
                break;

            case "week":
                whereClause = "WHERE p.created_at >= NOW() - INTERVAL '7 DAY'";
                break;

            case "month":
                whereClause = "WHERE p.created_at >= NOW() - INTERVAL '1 MONTH'";
                break;
        }

        try {
            const result = await db.query(`
            SELECT 
                p.*,
                COALESCE(json_agg(pl.user_id) FILTER (WHERE pl.user_id IS NOT NULL), '[]') AS "likedByUsers"
            FROM organizations p
            LEFT JOIN organization_likes pl 
                ON p.id = pl.organization_id
            ${whereClause}
            GROUP BY p.id
            ORDER BY ${orderBy}
            `);

            res.json(result.rows);
        }
        catch (err) {
            console.error(err)
            res.status(500).json({ error: err.message })
        }
        finally {

        }
    },
    async getOrganization(req, res) {
        const organizationid = req.params.organizationid
        const db = require("../../db_connection");

        try {
            const organizations = await db.query(`
            SELECT 
            p.*,
            COALESCE(
           json_agg(pl.user_id) FILTER (WHERE pl.user_id IS NOT NULL),
           '[]'::json
           ) AS likedByUsers
            FROM organizations p
            LEFT JOIN organization_likes pl 
            ON p.id = pl.organization_id
            WHERE p.id = $1
            GROUP BY p.id;
        `, [organizationid])
            const organization = organizations.rows[0];
            res.json(organization)
        }
        catch (err) {
            console.error(err)
            res.status(500).json({ error: err.message })
        }
    },
    async addOrganization(req, res) {
        const db = require("../../db_connection");

        const { user_id, title, description,
            mediaType, mediaUrl, createdAt } = req.body

        const created_at = new Date(Number(createdAt))

        try {
            const result = await db.query(
                `INSERT INTO organizations (user_id, title, description, media_type, media_url, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [user_id, title, description,
                    mediaType, mediaUrl, created_at])

            res.status(201).json({
                success: true,
                organizationid: result.rows[0].id
            })
        }
        catch (err) {
            console.error(err)

            res.status(500).json({
                success: false,
                error: err.message
            })
        }
    },
    async updateOrganization(req, res) {
        const db = require("../../db_connection");
        const cloudinary = require("cloudinary").v2;

        const { organizationid } = req.params;

        const {
            title,
            description,
            media_type,
            media_url
        } = req.body;

        try {
            // 1. get current organization
            const current = await db.query(
                `SELECT media_url FROM organizations WHERE id = $1`,
                [organizationid]
            );

            if (current.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Organization not found"
                });
            }

            const oldMediaUrl = current.rows[0].media_url;

            const hadMediaBefore = !!oldMediaUrl;
            const hasMediaNow = !!media_url;

            // helper: extract cloudinary public_id
            const extractPublicId = (url) => {
                try {
                    if (!url) return null;

                    const parts = url.split("/upload/");
                    if (parts.length < 2) return null;

                    let path = parts[1];

                    // remove version if exists
                    path = path.replace(/^v\d+\//, "");

                    // remove query strings if any
                    path = path.split("?")[0];

                    // remove file extension
                    const lastDot = path.lastIndexOf(".");
                    return lastDot !== -1 ? path.substring(0, lastDot) : path;
                } catch (err) {
                    console.error("extractPublicId failed:", err);
                    return null;
                }
            };

            // =========================
            // DELETE OLD MEDIA IF NEEDED
            // =========================

            // Case 1: removed media
            if (hadMediaBefore && !hasMediaNow) {
                const publicId = extractPublicId(oldMediaUrl);

                if (publicId) {
                    await cloudinary.uploader.destroy(publicId, {
                        resource_type: media_type
                    });
                }
            }

            // Case 2: replaced media
            if (hadMediaBefore && hasMediaNow && oldMediaUrl !== media_url) {
                const publicId = extractPublicId(oldMediaUrl);

                if (publicId) {
                    try {
                        await cloudinary.uploader.destroy(publicId, {
                            resource_type: media_type
                        });
                    } catch (err) {
                        console.error("Cloudinary delete failed:", err.message);
                    }
                }
                console.log("OLD URL:", oldMediaUrl);
                console.log("PUBLIC ID:", publicId);
            }


            // =========================
            // UPDATE DB ONLY
            // =========================

            await db.query(
                `UPDATE organizations
                SET title = $1,
                description = $2,
                media_type = $3,
                media_url = $4
                WHERE id = $5`,
                [
                    title,
                    description,
                    hasMediaNow ? media_type : null,
                    hasMediaNow ? media_url : null,
                    organizationid
                ]
            );

            return res.status(200).json({
                success: true,
                mediaDeleted: hadMediaBefore && !hasMediaNow,
                mediaReplaced: hadMediaBefore && hasMediaNow && oldMediaUrl !== media_url,
                mediaAdded: !hadMediaBefore && hasMediaNow
            });

        } catch (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                error: err.message
            });
        }
    },
    async deleteOrganization(req, res) {
        const db = require("../../db_connection");

        const { organizationid } = req.params;

        try {
            const organizations = await db.query(
                "SELECT media_url FROM organizations WHERE id = $1",
                [organizationid]
            );

            const organization = organizations.rows[0]

            const mediaUrl = organization.media_url;

            const extractPublicId = (url) => {
                if (!url) return null;

                const parts = url.split("/upload/");
                if (parts.length < 2) return null;

                let path = parts[1];
                path = path.replace(/^v\d+\//, "");
                return path.split(".")[0];
            };

            const publicId = extractPublicId(mediaUrl);

            // delete media first
            if (publicId) {
                await cloudinary.uploader.destroy(publicId, {
                    resource_type: organization.media_type
                });
            }

            // delete all likes for this organization
            await db.query(
                "DELETE FROM organization_likes WHERE organization_id = $1",
                [organizationid]
            );

            // then delete organization
            await db.query(
                "DELETE FROM organizations WHERE id = $1",
                [organizationid]
            );

            return res.json({
                success: true,
                deletedOrganization: true,
                deletedMedia: !!publicId
            });

        } catch (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                error: err.message
            });
        }
    },
    async addLike(req, res) {
        const db = require("../../db_connection");
        const { organizationid } = req.params;
        const { userId } = req.body;

        await db.query(
            `DELETE FROM organization_likes WHERE organization_id = $1`,
            [organizationid]
        );

        try {
            // prevent duplicates (important!)
            await db.query(
                `INSERT INTO organization_likes (organization_id, user_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
                [organizationid, userId]
            );

            res.json({ success: true });
        } catch (err) {
            console.log("addLike error:", err);
            res.status(500).json({ success: false });
        }
    },
    async removeLike(req, res) {
        const db = require("../../db_connection");
        const { organizationid } = req.params;
        const { userId } = req.body;

        try {
            await db.query(
                `DELETE FROM organization_likes
             WHERE organization_id = $1 AND user_id = $2`,
                [organizationid, userId]
            );

            res.json({ success: true });
        } catch (err) {
            console.log("removeLike error:", err);
            res.status(500).json({ success: false });
        }
    }
}