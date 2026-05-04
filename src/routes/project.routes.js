import { Router } from "express";
import { validateProjectPermission, verifyJWT } from "../middlewares/auth.middleware.js";
import { createProject, deleteProject, getProjectById, getProjects, updateProject } from "../controllers/project.controllers.js";
import { getProjectMembers, addProjectMember, updateMemberRole, removeProjectMember } from "../controllers/projectmember.controllers.js";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";
import { createProjectValidator, addProjectMemberValidator, updateMemberRoleValidator } from "../validators/index.js";
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
// DELETE /projects/:projectId -> only ADMIN can delete the project (cascade to task/members)
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

// GET /projects/:projectId/members -> any project member can list all members
// POST /projects/:projectId/members -> only ADMIN can add a new member
router
    .route("/:projectId/members")
    .get(validateProjectPermission(AvailableUserRole), getProjectMembers)
    .post(
        validateProjectPermission([UserRolesEnum.ADMIN]),
        addProjectMemberValidator(),
        validate,
        addProjectMember,
    );

// PUT /projects/:projectId/members/:userId -> only ADMIN can update a member's role
// DELETE /projects/:projectId/members/:userId -> only ADMIN can remove a member
router
    .route("/:projectId/members/:userId")
    .put(
        validateProjectPermission([UserRolesEnum.ADMIN]),
        updateMemberRoleValidator(),
        validate,
        updateMemberRole,
    )
    .delete(validateProjectPermission([UserRolesEnum.ADMIN]), removeProjectMember);

export default router;