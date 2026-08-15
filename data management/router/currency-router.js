const { Router } = require("express")
const { currencyController } = require("../controller/currency-controller.js")

const currencyRouter = new Router()

currencyRouter.get("/", currencyController.getCurrencies)
currencyRouter.get("/:currencyname", currencyController.getCurrency)
// currencyRouter.post("/", currencyController.addCurrency)
currencyRouter.put("/:currencyname", currencyController.updateCurrencies)
currencyRouter.delete("/:currencyname", currencyController.deleteCurrency)

module.exports = { currencyRouter }