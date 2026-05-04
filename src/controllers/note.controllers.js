import mongoose from "mongoose";
import { ProjectNote } from "../models/note.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/* GET /:projectId
   Any project member can list all notes for a project.
   createdBy is populated with public user fields. */
const getNotes = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const notes = await ProjectNote.find({
        project: new mongoose.Types.ObjectId(projectId),
    }).populate("createdBy", "username fullName avatar");

    return res
        .status(200)
        .json(new ApiResponse(200, notes, "Notes fetched successfully"));
});

/* POST /:projectId
   Only ADMIN can create a note. The authenticated user is recorded as createdBy. */
const createNote = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { content } = req.body;

    const note = await ProjectNote.create({
        project: new mongoose.Types.ObjectId(projectId),
        createdBy: new mongoose.Types.ObjectId(req.user._id),
        content,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, note, "Note created successfully"));
});

/* GET /:projectId/n/:noteId
   Any project member can fetch a single note.
   Scoped to the project to prevent cross-project access. */
const getNoteById = asyncHandler(async (req, res) => {
    const { projectId, noteId } = req.params;

    const note = await ProjectNote.findOne({
        _id: new mongoose.Types.ObjectId(noteId),
        project: new mongoose.Types.ObjectId(projectId),
    }).populate("createdBy", "username fullName avatar");

    if (!note) {
        throw new ApiError(404, "Note not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, note, "Note fetched successfully"));
});

/* PUT /:projectId/n/:noteId
   Only ADMIN can update a note's content. */
const updateNote = asyncHandler(async (req, res) => {
    const { projectId, noteId } = req.params;
    const { content } = req.body;

    const note = await ProjectNote.findOneAndUpdate(
        {
            _id: new mongoose.Types.ObjectId(noteId),
            project: new mongoose.Types.ObjectId(projectId),
        },
        { content },
        { new: true },
    );

    if (!note) {
        throw new ApiError(404, "Note not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, note, "Note updated successfully"));
});

/* DELETE /:projectId/n/:noteId
   Only ADMIN can delete a note. */
const deleteNote = asyncHandler(async (req, res) => {
    const { projectId, noteId } = req.params;

    const note = await ProjectNote.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(noteId),
        project: new mongoose.Types.ObjectId(projectId),
    });

    if (!note) {
        throw new ApiError(404, "Note not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, note, "Note deleted successfully"));
});

export { getNotes, createNote, getNoteById, updateNote, deleteNote };
