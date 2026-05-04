import { Router } from "express";
import { validateProjectPermission, verifyJWT } from "../middlewares/auth.middleware.js";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";
import { createSubtaskValidator, createTaskValidator, updateTaskValidator, updateSubtaskValidator } from "../validators/index.js";
import { validate } from "../middlewares/validator.middleware.js";
import { createSubTask, createTask, getTaskById, getTasks, updateTask, deleteTask, updateSubtask, deleteSubtask } from "../controllers/task.controllers.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

/* All projects routes require a valid JWT  */
router.use(verifyJWT);

/* GET /tasks/:projectId -> any project member can lits tasks
   POST /tasks/:projectId -> only ADMIN or PROJECT_ADMIN can create tasks;
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

/* GET /tasks/:projectId/t/:taskId -> fetch a single task with its subtasks and assignee details
   PUT /tasks/:projectId/t/:taskId -> only ADMIN or PROJECT_ADMIN can update task details
   DELETE /tasks/:projectId/t/:taskId -> only ADMIN or PROJECT_ADMIN can delete a task (cascade to subtasks) */
router
    .route("/:projectId/t/:taskId")
    .get(validateProjectPermission(AvailableUserRole), getTaskById)
    .put(
        validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN]),
        updateTaskValidator(),
        validate,
        updateTask,
    )
    .delete(
        validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN]),
        deleteTask,
    );

/* POST /tasks/:projectId/t/:taskId/subtasks -> only ADMIN or PROJECT_ADMIN can add subtasks */
router
    .route("/:projectId/t/:taskId/subtasks")
    .post(
        validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN]),
        createSubtaskValidator(),
        validate,
        createSubTask,
    );

/* PUT /tasks/:projectId/t/:taskId/subtasks/:subtaskId -> any project member can update a subtask
   DELETE /tasks/:projectId/t/:taskId/subtasks/:subtaskId -> only ADMIN or PROJECT_ADMIN can delete */
router
    .route("/:projectId/t/:taskId/subtasks/:subtaskId")
    .put(
        validateProjectPermission(AvailableUserRole),
        updateSubtaskValidator(),
        validate,
        updateSubtask,
    )
    .delete(
        validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN]),
        deleteSubtask,
    );

export default router;
