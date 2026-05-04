import mongoose from "mongoose";
import { Project } from "../models/project.model.js";
import { Task } from "../models/task.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Subtask } from "../models/subtask.model.js";

const getTasks = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) {
        throw new ApiError(404, "Project not found");
    }
    const tasks = await Task.find({
        project: new mongoose.Types.ObjectId(projectId),
    }).populate("assignedTo", "avatar username fullName");

    return res
        .status(200)
        .json(new ApiResponse(200, tasks, "Task fetched successfully"));
});

const createTask = asyncHandler(async (req, res) => {
    const { title, description, assignedTo, status } = req.body;
    const { projectId } = req.params;
    const project = await Project.findById(projectId);

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    const files = req.files || [];

    const attachments = files.map((file) => {
        return {
            url: `${process.env.SERVER_URL}/images/${file.filename}`,
            mimetype: file.mimetype,
            size: file.size
        }
    });

    const task = await Task.create({
        title,
        description,
        project: new mongoose.Types.ObjectId(projectId),
        assignedTo: assignedTo ? new mongoose.Types.ObjectId(assignedTo) : undefined,
        status,
        assignedBy: new mongoose.Types.ObjectId(req.user._id),
        attachments
    });

    return res
        .status(201)
        .json(new ApiResponse(201, task, "Task created succcessfully"))
})

const getTaskById = asyncHandler(async (req, res) => {
    const { projectId, taskId } = req.params;

    /* Single aggregate fetches the task, its assignee, and all subtasks with their
        creators in one round-trip. $arrayElemAt[0] unwraps the single-element arrays 
        produced by $lookup into plain objects. */
    const task = await Task.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(taskId),
                project: new mongoose.Types.ObjectId(projectId)
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "assignedTo",
                foreignField: "_id",
                as: "assignedTo",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "subtasks",
                localField: "_id",
                foreignField: "task",
                as: "subtasks",
                pipeline: [
                    {
                        /* Resolve each subtask's creator inside the same pipeline */
                        $lookup: {
                            from: "users",
                            localField: "createdBy",
                            foreignField: "_id",
                            as: "createdBy",
                            pipeline: [
                                {
                                    $project: {
                                        _id: 1,
                                        username: 1,
                                        fullName: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            createdBy: {
                                $arrayElemAt: ["$createdBy", 0],
                            },
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                assignedTo: {
                    $arrayElemAt: ["$assignedTo", 0],
                },
            },
        },
    ]);

    if (!task || task.length === 0) {
        throw new ApiError(404, "Task not found");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, task[0], "Task fetched successfully"));
});

const createSubTask = asyncHandler(async (req, res) => {
    const { projectId, taskId } = req.params;
    const { title } = req.body;

    const task = await Task.findOne({
        _id: new mongoose.Types.ObjectId(taskId),
        project: new mongoose.Types.ObjectId(projectId)
    })

    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    const subtask = await Subtask.create({
        title,
        task: new mongoose.Types.ObjectId(taskId),
        createdBy: new mongoose.Types.ObjectId(req.user._id)
    })

    return res
        .status(201)
        .json(new ApiResponse(201, subtask, "Subtask created successfully"))
});

/* PUT /:projectId/t/:taskId
   Only ADMIN or PROJECT_ADMIN can update task details.
   Partial updates are supported — only provided fields are applied. */
const updateTask = asyncHandler(async (req, res) => {
    const { projectId, taskId } = req.params;
    const { title, description, assignedTo, status } = req.body;

    const task = await Task.findOneAndUpdate(
        {
            _id: new mongoose.Types.ObjectId(taskId),
            project: new mongoose.Types.ObjectId(projectId),
        },
        {
            title,
            description,
            status,
            ...(assignedTo && { assignedTo: new mongoose.Types.ObjectId(assignedTo) }),
        },
        { new: true },
    );

    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, task, "Task updated successfully"));
});

/* DELETE /:projectId/t/:taskId
   Only ADMIN or PROJECT_ADMIN can delete a task.
   Cascade deletes all subtasks belonging to the task. */
const deleteTask = asyncHandler(async (req, res) => {
    const { projectId, taskId } = req.params;

    const task = await Task.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(taskId),
        project: new mongoose.Types.ObjectId(projectId),
    });

    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    await Subtask.deleteMany({ task: new mongoose.Types.ObjectId(taskId) });

    return res
        .status(200)
        .json(new ApiResponse(200, task, "Task deleted successfully"));
});

/* PUT /:projectId/t/:taskId/subtasks/:subtaskId
   Any project member can update a subtask (e.g. toggle isCompleted).
   Both title and isCompleted are optional — only supplied fields are applied. */
const updateSubtask = asyncHandler(async (req, res) => {
    const { projectId, taskId, subtaskId } = req.params;
    const { title, isCompleted } = req.body;

    /* Confirm the parent task belongs to this project before touching the subtask */
    const task = await Task.findOne({
        _id: new mongoose.Types.ObjectId(taskId),
        project: new mongoose.Types.ObjectId(projectId),
    });

    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    const subtask = await Subtask.findOneAndUpdate(
        {
            _id: new mongoose.Types.ObjectId(subtaskId),
            task: new mongoose.Types.ObjectId(taskId),
        },
        {
            ...(title !== undefined && { title }),
            ...(isCompleted !== undefined && { isCompleted }),
        },
        { new: true },
    );

    if (!subtask) {
        throw new ApiError(404, "Subtask not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, subtask, "Subtask updated successfully"));
});

/* DELETE /:projectId/t/:taskId/subtasks/:subtaskId
   Only ADMIN or PROJECT_ADMIN can delete a subtask. */
const deleteSubtask = asyncHandler(async (req, res) => {
    const { projectId, taskId, subtaskId } = req.params;

    const task = await Task.findOne({
        _id: new mongoose.Types.ObjectId(taskId),
        project: new mongoose.Types.ObjectId(projectId),
    });

    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    const subtask = await Subtask.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(subtaskId),
        task: new mongoose.Types.ObjectId(taskId),
    });

    if (!subtask) {
        throw new ApiError(404, "Subtask not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, subtask, "Subtask deleted successfully"));
});

export {
    getTasks,
    createTask,
    getTaskById,
    createSubTask,
    updateTask,
    deleteTask,
    updateSubtask,
    deleteSubtask,
}