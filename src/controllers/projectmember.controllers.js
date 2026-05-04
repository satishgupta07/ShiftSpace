import mongoose from "mongoose";
import { ProjectMember } from "../models/projectmember.models.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { UserRolesEnum } from "../utils/constants.js";

/* GET /:projectId/members
   Any project member can view the full member list.
   Each entry includes the user's public profile alongside their project-scoped role. */
const getProjectMembers = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const members = await ProjectMember.aggregate([
        {
            $match: {
                project: new mongoose.Types.ObjectId(projectId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user",
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
                user: { $arrayElemAt: ["$user", 0] },
            },
        },
        {
            $project: {
                user: 1,
                role: 1,
                _id: 0,
            },
        },
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, members, "Project members fetched successfully"));
});

/* POST /:projectId/members
   Only ADMIN can add a new member to the project.
   Defaults the role to MEMBER when none is provided. */
const addProjectMember = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { userId, role = UserRolesEnum.MEMBER } = req.body;

    const user = await User.findById(userId).select("_id username fullName avatar");
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const existingMember = await ProjectMember.findOne({
        project: new mongoose.Types.ObjectId(projectId),
        user: new mongoose.Types.ObjectId(userId),
    });

    if (existingMember) {
        throw new ApiError(409, "User is already a member of this project");
    }

    const member = await ProjectMember.create({
        user: new mongoose.Types.ObjectId(userId),
        project: new mongoose.Types.ObjectId(projectId),
        role,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, { member, user }, "Member added successfully"));
});

/* PUT /:projectId/members/:userId
   Only ADMIN can update another member's project-scoped role.
   An ADMIN cannot change their own role to prevent accidental self-lockout. */
const updateMemberRole = asyncHandler(async (req, res) => {
    const { projectId, userId } = req.params;
    const { role } = req.body;

    if (req.user._id.toString() === userId) {
        throw new ApiError(400, "You cannot change your own role");
    }

    const member = await ProjectMember.findOneAndUpdate(
        {
            project: new mongoose.Types.ObjectId(projectId),
            user: new mongoose.Types.ObjectId(userId),
        },
        { role },
        { new: true },
    );

    if (!member) {
        throw new ApiError(404, "Member not found in this project");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, member, "Member role updated successfully"));
});

/* DELETE /:projectId/members/:userId
   Only ADMIN can remove a member from the project.
   An ADMIN cannot remove themselves to prevent losing project administration. */
const removeProjectMember = asyncHandler(async (req, res) => {
    const { projectId, userId } = req.params;

    if (req.user._id.toString() === userId) {
        throw new ApiError(400, "You cannot remove yourself from the project");
    }

    const member = await ProjectMember.findOneAndDelete({
        project: new mongoose.Types.ObjectId(projectId),
        user: new mongoose.Types.ObjectId(userId),
    });

    if (!member) {
        throw new ApiError(404, "Member not found in this project");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, member, "Member removed successfully"));
});

export { getProjectMembers, addProjectMember, updateMemberRole, removeProjectMember };
