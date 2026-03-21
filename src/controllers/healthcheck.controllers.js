import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
const healthCheck = async (req, res, next) => {
    try {
        res
            .status(200)
            .json(new ApiResponse(200, { message: "Server is running" }));
    } catch (error) {
        next(err)
    }
};
 */

const healthCheck = asyncHandler(async (req, res) => {
    res.status(200).json(new ApiResponse(200, { message: "Server is running" }));
});

export { healthCheck };
