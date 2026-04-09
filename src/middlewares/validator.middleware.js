import { validationResult } from "express-validator";
import { ApiError } from "../utils/apiError.js";

/* Reads validation results set by express-validator chains and if any errors
    exist, forward a 422 ApiError whose 'erros' array contains one 
    {fieldName: message} object per failing field. */
export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }
    const extractedErrors = [];
    errors.array().map((err) =>
        extractedErrors.push({
            [err.path]: err.msg,
        }),
    );
    return next(new ApiError(422, "Received data is not valid", extractedErrors));
};
