import { Router } from "express";
import { forgotPasswordRequest, getCurrentUser, loginUser, logoutUser, registerUser, verifyEmail } from "../controllers/auth.controllers.js";
import { validate } from "../middlewares/validator.middleware.js";
import { userForgotPasswordValidator, userLoginValidator, userRegisterValidator } from "../validators/index.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// unsecured route
router.route("/register").post(userRegisterValidator(), validate, registerUser);
router.route("/login").post(userLoginValidator(), validate, loginUser);
router.route("/verify-email/:verificationToken").get(verifyEmail);
router
    .route("/forgot-password")
    .post(userForgotPasswordValidator(), validate, forgotPasswordRequest);

//secure routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/current-user").post(verifyJWT, getCurrentUser);

export default router;