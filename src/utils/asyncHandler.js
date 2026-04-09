/* Higher-order function: takes an async route handle as input and returns a new 
    function that wwraps it. Any rejected promise is forwarded to Epress error-handling 
    middleware via next(err), avoiding undhandled promise rejections. */
const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
    };
};

export { asyncHandler };
