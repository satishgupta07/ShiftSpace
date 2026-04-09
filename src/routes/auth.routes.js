import { Router } from "express";
import { changeCurrentPassword, forgotPasswordRequest, getCurrentUser, loginUser, logoutUser, refreshAccessToken, registerUser, resendEmailVerification, resetForgotPassword, verifyEmail } from "../controllers/auth.controllers.js";
import { validate } from "../middlewares/validator.middleware.js";
import { userChangeCurrentPasswordValidator, userForgotPasswordValidator, userLoginValidator, userRegisterValidator, userResetForgotPasswordValidator } from "../validators/index.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

/* ___________  Public Routes (no JWT required) __________________ */

// POST /register -> creates a new user and sends a verification token
router.route("/register").post(userRegisterValidator(), validate, registerUser);

// POST /login -> returns access + refresh tokens on valid credentials
router.route("/login").post(userLoginValidator(), validate, loginUser);

// GET verify-email/:verificationToken -> activates the account via emailed link
router.route("/verify-email/:verificationToken").get(verifyEmail);

// POST /refresh-token -> issues a new access token using a valid refresh token
router.route("/refresh-token").post(refreshAccessToken);

// POST /forgot-password -> sends a password-reset link to the provided email
router
    .route("/forgot-password")
    .post(userForgotPasswordValidator(), validate, forgotPasswordRequest);

// POST /reset-password/:resetToken -> sets a new password using the emailed token  
router
    .route("/reset-password/:resetToken")
    .post(userResetForgotPasswordValidator(), validate, resetForgotPassword);


/* ___________  Protected Routes (JWT required) __________________ */

// POST /logout -> clears auth cookies and invalidates the refresh token
router.route("/logout").post(verifyJWT, logoutUser);

// GET /current-user -> returns the authenticated user's profile
router.route("/current-user").get(verifyJWT, getCurrentUser);

// POST /change-password -> updates the password after verifying the old one
router
    .route("/change-password")
    .post(
        verifyJWT,
        userChangeCurrentPasswordValidator(),
        validate,
        changeCurrentPassword
    );

// POST /resend-email-verification -> re-sends the verification email    
router
    .route("/resend-email-verification")
    .post(verifyJWT, resendEmailVerification);

export default router;