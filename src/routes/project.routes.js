import { Router } from "express";
import { validateProjectPermission, verifyJWT } from "../middlewares/auth.middleware.js";
import { createProject, deleteProject, getProjectById, getProjects, updateProject } from "../controllers/project.controllers.js";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";
import { createProjectValidator } from "../validators/index.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = Router();

/* All projects routes require a valid JWT  */
router.use(verifyJWT);

// GET /projects -> returns all projects the authenticated user is a member of
// POST /projects -> any authenticated user can create a new project
router
    .route("/")
    .get(getProjects)
    .post(createProjectValidator(), validate, createProject);

// GET /projects/:projectId -> any project member can view the project
// PUT /projects/:projectId -> only ADMIN can update project details
// PUT /projects/:projectId -> only ADMIN can delete the project (cascade to task/members)
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