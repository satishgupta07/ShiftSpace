import mongoose, { Schema } from "mongoose";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";

/* Junction table linking users to project with a role.
    A user's project-level role is stored here,  separated from any global role,
    so the same user can have different roles across differnet projects. */
const projectMemberSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        project: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true
        },
        role: {
            type: String,
            enum: AvailableUserRole,
            default: UserRolesEnum.MEMBER
        }
    },
    { timestamps: true }
)

export const ProjectMember = mongoose.model("ProjectMember", projectMemberSchema);
