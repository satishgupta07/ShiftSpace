import mongoose, { Aggregate } from "mongoose";
import { Project } from "../models/project.model.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { UserRolesEnum } from "../utils/constants.js";
import { Task } from "../models/task.model.js";
import { Subtask } from "../models/subtask.model.js";

const getProjects = asyncHandler(async (req, res) => {
    /* Aggregate from ProjectMember so each result includes the caller's role
       alongside the project data. A sub-pipeline counts total members per project. */
    const projects = await ProjectMember.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(req.user._id),
            },
        },
        {
            $lookup: {
                from: "projects",
                localField: "project",
                foreignField: "_id",
                as: "projects",
                pipeline: [
                    {
                        $lookup: {
                            from: "projectmembers",
                            localField: "_id",
                            foreignField: "project",
                            as: "projectmembers",
                        },
                    },
                    {
                        $addFields: {
                            members: {
                                $size: "$projectmembers",
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$projects",
        },
        {
            $project: {
                project: "$projects",
                role: 1,
                _id: 0,
            },
        },
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, projects, "Projects fetched successfully"));
});

const getProjectById = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, project, "Project fetched successfully"));
});

const createProject = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    const project = await Project.create({
        name,
        description,
        createdBy: new mongoose.Types.ObjectId(req.user._id),
    });

    /* The user who creates a project is automatically added as ADMIN */
    await ProjectMember.create({
        user: new mongoose.Types.ObjectId(req.user._id),
        project: new mongoose.Types.ObjectId(project._id),
        role: UserRolesEnum.ADMIN,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, project, "Project created Successfully"));
});

const updateProject = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const { projectId } = req.params;

    const project = await Project.findByIdAndUpdate(
        projectId,
        {
            name,
            description,
        },
        { new: true },
    );

    if (!project) {
        throw new ApiError(404, "Project not found");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, project, "Project updated successfully"));
});

const deleteProject = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const project = await Project.findByIdAndDelete(projectId);
    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    /* Cascade delete: remove all subtasks, tasks, and members belonging to the project */
    const tasks = await Task.find({ project: new mongoose.Types.ObjectId(projectId) }).select("_id")
    const taskIds = tasks.map((t) => t._id);

    await Subtask.deleteMany({ task: { $in: taskIds } });
    await Task.deleteMany({ project: new mongoose.Types.ObjectId(projectId) });
    await ProjectMember.deleteMany({ project: new mongoose.Types.ObjectId(projectId) });

    return res
        .status(200)
        .json(new ApiResponse(200, project, "Project deleted successfully"));
});

export {
    getProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject
}
