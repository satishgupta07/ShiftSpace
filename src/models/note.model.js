import mongoose, { Schema } from "mongoose";

/* Stores free-form notes scoped to a project. 
    Notes are user-authored and tied to a specific project, allowing team members
    to leave context, decisions, or documentation  alongside tasks. */
const projectNoteSchema = new Schema(
    {
        project: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
    },
    { timestamps: true },
);

export const ProjectNote = mongoose.model("ProjectNote", projectNoteSchema);
