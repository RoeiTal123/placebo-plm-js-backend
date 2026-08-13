const { Router } = require("express")
const { attachmentController } = require("../controller/attachment-controller.js")

const attachmentRouter = new Router()

attachmentRouter.get("/", attachmentController.getAttachments)
attachmentRouter.get("/:attachmentid", attachmentController.getAttachment)
attachmentRouter.post("/", attachmentController.addAttachment)
attachmentRouter.put("/:attachmentid", attachmentController.updateAttachment)
attachmentRouter.delete("/:attachmentid", attachmentController.deleteAttachment)

module.exports = { attachmentRouter }