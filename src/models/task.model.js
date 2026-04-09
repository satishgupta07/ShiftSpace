import mongoose, { Schema } from "mongoose";
import { AvailableTaskStatues, TaskStatusEnum } from "../utils/constants.js";

const taskSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: String,
        project: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true
        },
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        assignedBy: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        status: {
            type: String,
            enum: AvailableTaskStatues,
            default: TaskStatusEnum.TODO
        },
        /* Each attachment stores the public URL, MIME type, and size so the 
            client can render a preview and display file metadata without extra requests. */
        attachments: {
            type: [
                {
                    url: String,
                    mimetype: String,
                    size: Number
                }
            ],
            default: []
        }
    },
    { timestamps: true }
);

export const Task = mongoose.model("Task", taskSchema);