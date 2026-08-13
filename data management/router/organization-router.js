const { Router } = require("express")
const { organizationController } = require("../controller/organization-controller.js")

const organizationRouter = new Router()

organizationRouter.get("/", organizationController.getOrganizations)
organizationRouter.get("/:organizationid", organizationController.getOrganization)
organizationRouter.organization("/", organizationController.addOrganization)
organizationRouter.organization("/:organizationid/likes", organizationController.addLike);
organizationRouter.put("/:organizationid", organizationController.updateOrganization)
organizationRouter.delete("/:organizationid/likes", organizationController.removeLike);
organizationRouter.delete("/:organizationid", organizationController.deleteOrganization)

module.exports = { organizationRouter }