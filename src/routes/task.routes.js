import { Router } from "express";
import { validateProjectPermission, verifyJWT } from "../middlewares/auth.middleware.js";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";
import { createSubtaskValidator, createTaskValidator } from "../validators/index.js";
import { validate } from "../middlewares/validator.middleware.js";
import { createSubTask, createTask, getTaskById, getTasks } from "../controllers/task.controllers.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

/* All projects routes require a valid JWT  */
router.use(verifyJWT);

/* GET /tasks/:projectId -> any project member can lits tasks
   PUT /tasks/:projectId -> only ADMIN or PROJECT_ADMIN can create tasks;
                            upload.array("attachments") handles multi-file upload before validation   */
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

/* GET /tasks/:projectId/t/:taskId -> fetch a single task with its subtasks ans assignee details */
router
    .route("/:projectId/t/:taskId")
    .get(validateProjectPermission(AvailableUserRole), getTaskById)

/* POST /tasks/:projectId/t/:taskId/subtasks -> only ADMIN or PROJECT_ADMIN can add subtasks */
router
    .route("/:projectId/t/:taskId/subtasks")
    .post(
        validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN]),
        createSubtaskValidator(),
        validate,
        createSubTask
    )

export default router;
