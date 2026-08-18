const db = require("../../db_connection");

exports.currencyController = {

    // =========================
    // GET CURRENCIES
    // =========================
    async getCurrencies(req, res) {
        try {

            // Check when rates were last updated
            const latestResult = await db.query(`
                SELECT MAX(rate_date) AS latest_date
                FROM fx_rates
            `);

            const latestDate =
                latestResult.rows[0].latest_date;

            const today = new Date();
            const todayDate =
                today.toISOString().split("T")[0];

            let needsUpdate = true;

            if (latestDate) {
                const latest = new Date(latestDate);
                const current = new Date(todayDate);

                const difference =
                    current.getTime() - latest.getTime();

                const oneDay =
                    24 * 60 * 60 * 1000;

                needsUpdate =
                    difference >= oneDay;
            }

            // =========================
            // GET FRESH DATA IF NEEDED
            // =========================

            if (needsUpdate) {

                const response = await fetch(
                    "https://api.frankfurter.dev/v2/rates?base=EUR"
                );

                if (!response.ok) {
                    throw new Error(
                        "Failed to retrieve currency rates"
                    );
                }

                const rates = await response.json();

                for (const item of rates) {

                    await db.query(
                        `
                        INSERT INTO fx_rates (
                            base_currency,
                            quote_currency,
                            rate,
                            rate_date,
                            source
                        )
                        VALUES (
                            $1,
                            $2,
                            $3,
                            $4,
                            $5
                        )
                        `,
                        [
                            item.base,
                            item.quote,
                            item.rate,
                            todayDate,
                            "ecb"
                        ]
                    );
                }
            }

            // =========================
            // RETURN DATABASE DATA
            // =========================

            const result = await db.query(`
                SELECT
                    id,
                    base_currency,
                    quote_currency,
                    rate,
                    rate_date,
                    source,
                    created_by
                FROM fx_rates
                ORDER BY quote_currency
            `);

            res.json(result.rows);

        } catch (err) {

            console.error(
                "Currency API Error:",
                err
            );

            res.status(500).json({
                success: false,
                error: err.message
            });
        }
    },


    // =========================
    // GET ONE CURRENCY
    // =========================
    async getCurrency(req, res) {

        const {
            currency
        } = req.params;

        try {

            const result = await db.query(
                `
                SELECT
                    id,
                    base_currency,
                    quote_currency,
                    rate,
                    rate_date,
                    source,
                    created_by
                FROM fx_rates
                WHERE UPPER(quote_currency) =
                      UPPER($1)
                ORDER BY rate_date DESC
                LIMIT 1
                `,
                [currency]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: "Currency not found"
                });
            }

            res.json(result.rows[0]);

        } catch (err) {

            console.error(err);

            res.status(500).json({
                success: false,
                error: err.message
            });
        }
    },


    // =========================
    // UPDATE CURRENCIES
    // =========================
    async updateCurrencies(req, res) {

        try {

            const response = await fetch(
                "https://api.frankfurter.dev/v2/rates?base=EUR"
            );

            if (!response.ok) {
                throw new Error(
                    "Failed to retrieve currency rates"
                );
            }

            const rates = await response.json();

            const today =
                new Date()
                    .toISOString()
                    .split("T")[0];

            for (const item of rates) {

                await db.query(
                    `
                    INSERT INTO fx_rates (
                        base_currency,
                        quote_currency,
                        rate,
                        rate_date,
                        source
                    )
                    VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5
                    )
                    `,
                    [
                        item.base,
                        item.quote,
                        item.rate,
                        today,
                        "ecb"
                    ]
                );
            }

            const result = await db.query(`
                SELECT
                    id,
                    base_currency,
                    quote_currency,
                    rate,
                    rate_date,
                    source,
                    created_by
                FROM fx_rates
                ORDER BY quote_currency
            `);

            res.json({
                success: true,
                updated: true,
                rates: result.rows
            });

        } catch (err) {

            console.error(err);

            res.status(500).json({
                success: false,
                error: err.message
            });
        }
    },


    // =========================
    // DELETE CURRENCY
    // =========================
    async deleteCurrency(req, res) {

        const {
            currency
        } = req.params;

        try {

            const result = await db.query(
                `
                DELETE FROM fx_rates
                WHERE UPPER(quote_currency) =
                      UPPER($1)
                RETURNING *
                `,
                [currency]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: "Currency not found"
                });
            }

            res.json({
                success: true,
                deletedCurrency:
                    result.rows[0]
            });

        } catch (err) {

            console.error(err);

            res.status(500).json({
                success: false,
                error: err.message
            });
        }
    },


    // =========================
    // RETRIEVE CURRENCY DATA
    // =========================
    async retrieveCurrencyData(req, res) {

        try {

            const response = await fetch(
                "https://api.frankfurter.dev/v2/rates?base=EUR"
            );

            if (!response.ok) {
                return res.status(
                    response.status
                ).json({
                    success: false,
                    error:
                        "Failed to retrieve currency data"
                });
            }

            const rates = await response.json();

            res.json({
                success: true,
                rates
            });

        } catch (err) {

            console.error(
                "Currency API Error:",
                err
            );

            res.status(500).json({
                success: false,
                error:
                    "Failed to retrieve currency data"
            });
        }
    }
};