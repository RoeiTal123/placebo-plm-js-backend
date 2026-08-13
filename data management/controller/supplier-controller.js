const { dbConnection } = require("../../db_connection")
const cloudinary = require("../../cloudinary");

exports.locationController = {
    async getLocations(req, res) {
        const db = require("../../db_connection");

        const user_id = req.query.user_id
        let locations
        try {
            if (user_id) {
                locations = await db.query(
                    `SELECT *
                    FROM locations
                    WHERE $1 = ANY(feeders)
                    ORDER BY created_at DESC
                    `,
                    [user_id]
                );
            } else {
                locations = await db.query(
                    `SELECT *
                    FROM locations
                    ORDER BY created_at DESC
                    `
                );
            }

            res.json(locations.rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    },
    async getLocation(req, res) {
        const locationid = req.params.locationid
        const db = require("../../db_connection");

        try {
            const result = await db.query(
                `
            SELECT *
            FROM locations
            WHERE id = $1
            `,
                [locationid]
            );

            const location = result.rows[0];

            if (!location) {
                return res.status(404).json({
                    error: "Location not found"
                });
            }

            res.json(location);
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    },
    async addLocation(req, res) {
        const db = require("../../db_connection");

        const { location_name, description, lat, lng,
             location_media_url, owner_id,  feeders, media_type, created_at} = req.body

        const created_at1 = created_at ? new Date(created_at) : new Date();

        try {
            const result = await db.query(
                `INSERT INTO locations ( location_name, lat, lng, description,
                                         location_media_url, media_type, owner_id,
                                         feeders, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
                [location_name, lat, lng, description, location_media_url, media_type,
                owner_id, feeders, created_at1])

            res.status(201).json({
                success: true,
                locationid: result.rows[0].id
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
    async updateLocation(req, res) {
        const db = require("../../db_connection");
        const cloudinary = require("cloudinary").v2;

        const { locationid } = req.params;

        const {
            location_name,
            description,
            media_type,
            location_media_url
        } = req.body;

        try {
            const current = await db.query(
                `SELECT location_media_url FROM locations WHERE id = $1`,
                [locationid]
            );

            if (current.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Location not found"
                });
            }

            const oldMediaUrl = current.rows[0].location_media_url;

            const hadMediaBefore = !!oldMediaUrl;
            const hasMediaNow = !!location_media_url;

            const extractPublicId = (url) => {
                try {
                    if (!url) return null;

                    const parts = url.split("/upload/");
                    if (parts.length < 2) return null;

                    let path = parts[1];

                    path = path.replace(/^v\d+\//, "");

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
            if (hadMediaBefore && hasMediaNow && oldMediaUrl !== location_media_url) {
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
                `UPDATE locations
                SET location_name = $1,
                description = $2,
                media_type = $3,
                location_media_url = $4
                WHERE id = $5`,
                [
                    location_name,
                    description,
                    hasMediaNow ? media_type : null,
                    hasMediaNow ? location_media_url : null,
                    locationid
                ]
            );

            return res.status(200).json({
                success: true,
                mediaDeleted: hadMediaBefore && !hasMediaNow,
                mediaReplaced: hadMediaBefore && hasMediaNow && oldMediaUrl !== location_media_url,
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
    async deleteLocation(req, res) {
        const db = require("../../db_connection");

        const { locationid } = req.params;

        try {
            const locations = await db.query(
                "SELECT location_media_url FROM locations WHERE id = $1",
                [locationid]
            );

            const location = locations.rows[0]

            const mediaUrl = location.location_mediaUrl;

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
                    resource_type: location.media_type
                });
            }

            // then delete location
            await db.query(
                "DELETE FROM locations WHERE id = $1",
                [locationid]
            );

            return res.json({
                success: true,
                deletedLocation: true,
                deletedMedia: !!publicId
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