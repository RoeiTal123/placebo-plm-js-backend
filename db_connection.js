require("dotenv").config();

// const { Pool } = require("pg");
// require("dotenv").config();

// const pool = new Pool({
//     connectionString: process.env.DATABASE_URL,
//     ssl: { rejectUnauthorized: false }
// });

console.log(
    "DATABASE_URL:",
    process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ":<PASSWORD>@")
);


// module.exports = pool;
// console.log("DB HOST:", process.env.HOST);
// console.log("DB PORT:", process.env.PORT);
// console.log("DB USER:", process.env.USER);

// const { Pool } = require("pg");

// const db = new Pool({
//     connectionString: process.env.DATABASE_URL
// });

// module.exports = db;

require("dotenv").config();

const { Pool } = require("pg");

const url = process.env.DATABASE_URL;

console.log(
    "DB:",
    url?.replace(/:([^:@]+)@/, ":<PASSWORD>@")
);

const db = new Pool({
    connectionString: url
});

db.query("SELECT NOW()")
    .then(result => console.log("DATABASE CONNECTED:", result.rows[0]))
    .catch(err => console.error("DATABASE FAILED:", err.message));

module.exports = db;