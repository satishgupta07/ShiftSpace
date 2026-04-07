import { Router } from "express";
import { validateProjectPermission, verifyJWT } from "../middlewares/auth.middleware.js";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";
import { createSubtaskValidator, createTaskValidator } from "../validators/index.js";
import { validate } from "../middlewares/validator.middleware.js";
import { createSubTask, createTask, getTaskById, getTasks } from "../controllers/task.controllers.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();
router.use(verifyJWT);

router
    .route("/:projectId")
    .get(validateProjectPermission(AvailableUserRole), getTasks)
    .post(
        validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN]),
        upload.array("attachments"),
        createTaskValidator(),
        validate,
        createTask
    );

router
    .route("/:projectId/t/:taskId")
    .get(validateProjectPermission(AvailableUserRole), getTaskById)

router
    .route("/:projectId/t/:taskId/subtasks")
    .post(
        validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN]),
        createSubtaskValidator(),
        validate,
        createSubTask
    )

export default router;
