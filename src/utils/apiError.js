/* Standardised error class for all API responses */
class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = "",
    ) {
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.message = message;
        this.success = false;
        this.errors = errors;

        if (stack) {
            this.stack = stack;
        } else {
            /* Removes the constructor call itself from the stack trace
                so the trace starts at the actual throw site. */
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { ApiError };
