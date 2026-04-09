/* Higher-order function: takes an async route handler as input and returns a new 
    function that wraps it. Any rejected promise is forwarded to Express error-handling 
    middleware via next(err), avoiding unhandled promise rejections. */
const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
    };
};

export { asyncHandler };
