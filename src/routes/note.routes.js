import { Router } from "express";
import { validateProjectPermission, verifyJWT } from "../middlewares/auth.middleware.js";
import { getNotes, createNote, getNoteById, updateNote, deleteNote } from "../controllers/note.controllers.js";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";
import { createNoteValidator, updateNoteValidator } from "../validators/index.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = Router();

/* All note routes require a valid JWT */
router.use(verifyJWT);

// GET /notes/:projectId -> any project member can list notes
// POST /notes/:projectId -> only ADMIN can create a note
router
    .route("/:projectId")
    .get(validateProjectPermission(AvailableUserRole), getNotes)
    .post(
        validateProjectPermission([UserRolesEnum.ADMIN]),
        createNoteValidator(),
        validate,
        createNote,
    );

// GET /notes/:projectId/n/:noteId -> any project member can view a note
// PUT /notes/:projectId/n/:noteId -> only ADMIN can update a note
// DELETE /notes/:projectId/n/:noteId -> only ADMIN can delete a note
router
    .route("/:projectId/n/:noteId")
    .get(validateProjectPermission(AvailableUserRole), getNoteById)
    .put(
        validateProjectPermission([UserRolesEnum.ADMIN]),
        updateNoteValidator(),
        validate,
        updateNote,
    )
    .delete(validateProjectPermission([UserRolesEnum.ADMIN]), deleteNote);

export default router;
