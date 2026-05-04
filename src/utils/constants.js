export const DB_NAME = "shiftspace"

export const UserRolesEnum = {
    ADMIN: "admin",             // Full system access
    PROJECT_ADMIN: "project_admin", // Project-level administrative access
    MEMBER: "member",           // Basic project member access
};

export const AvailableUserRole = Object.values(UserRolesEnum);

export const TaskStatusEnum = {
    TODO: "todo",               // Task not started
    IN_PROGRESS: "in_progress", // Task currently being worked on
    DONE: "done",               // Task completed
};

export const AvailableTaskStatues = Object.values(TaskStatusEnum);
