const { Router } = require("express")
const { organisationController } = require("../controller/organisation-controller.js")

const organisationRouter = new Router()

organisationRouter.get("/", organisationController.getOrganisations)
organisationRouter.get("/:organisationid", organisationController.getOrganisation)
organisationRouter.post("/", organisationController.addOrganisation)
organisationRouter.post("/:organisationid/likes", organisationController.addLike);
organisationRouter.put("/:organisationid", organisationController.updateOrganisation)
organisationRouter.delete("/:organisationid/likes", organisationController.removeLike);
organisationRouter.delete("/:organisationid", organisationController.deleteOrganisation)

module.exports = { organizationRouter }