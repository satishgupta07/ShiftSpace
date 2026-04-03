import { Router } from "express";
import { validateProjectPermission, verifyJWT } from "../middlewares/auth.middleware.js";
import { createProject, deleteProject, getProjectById, getProjects, updateProject } from "../controllers/project.controllers.js";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";
import { createProjectValidator } from "../validators/index.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = Router();
router.use(verifyJWT);

router
    .route("/")
    .get(getProjects)
    .post(createProjectValidator(), validate, createProject);

router
    .route("/:projectId")
    .get(validateProjectPermission(AvailableUserRole), getProjectById)
    .put(
        validateProjectPermission([UserRolesEnum.ADMIN]),
        createProjectValidator(),
        validate,
        updateProject,
    )
    .delete(validateProjectPermission([UserRolesEnum.ADMIN]), deleteProject);

export default router;