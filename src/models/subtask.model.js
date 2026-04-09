import mongoose, { Schema } from "mongoose";

/* Subtasks are lightweight checklist items that belong to a parent task.
   They have status - isCompleted - is a simple boolean toggle  */
const subTaskSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        task: {
            type: Schema.Types.ObjectId,
            ref: "Task",
            required: true
        },
        isCompleted: {
            type: Boolean,
            default: false
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    { timestamps: true }
)

export const Subtask = mongoose.model("Subtask", subTaskSchema);
