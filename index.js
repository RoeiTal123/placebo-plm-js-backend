const cors = require("cors");
const express = require("express")
const app = express()
const fs = require("fs")
const path = require("path")
require("dotenv").config();

const { organizationRouter } = require("./data management/router/organization-router.js")
const { userRouter } = require("./data management/router/user-router.js")
const { supplierRouter } = require("./data management/router/supplier-router.js")

process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT: ", err);
});

process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED: ", err);
});

app.use(express.json())

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://127.0.0.1:5500",
    // "http://localhost:5500",
    // "https://final-project-part-2-frontend.onrender.com"
  ],
  credentials: true
}));

app.use("/api/orgainzations", organizationRouter)
app.use("/api/users", userRouter)
app.use("/api/suppliers", supplierRouter)
app.use("/api/materials", locationRouter)
app.use("/api/bom_lines", locationRouter)
app.use("/api/orders", locationRouter)
app.use("/api/order_additional_cost", locationRouter)
app.use("/api/order_lines", locationRouter)
app.use("/api/attachments", locationRouter)
app.use("/api/audit_logs", locationRouter)

app.listen(process.env.PORT || 3000);