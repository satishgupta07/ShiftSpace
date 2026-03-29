import { User } from "../models/user.model.js";
import crypto from "crypto";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { emailVerificationMailgenContent, forgotPasswordMailgenContent, sendEmail } from "../utils/mail.js";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating access token",
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const { email, username, password, role } = req.body;

    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists", []);
    }

    const user = await User.create({
        email,
        password,
        username,
        isEmailVerified: false,
    });

    const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = tokenExpiry;

    await user.save({ validateBeforeSave: false });

    await sendEmail({
        email: user?.email,
        subject: "Please verify your email",
        mailgenContent: emailVerificationMailgenContent(
            user.username,
            `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`,
        ),
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",
    );

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering a user");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                200,
                { user: createdUser },
                "User registered successfully and verification email has been sent on your email",
            ),
        );
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    if (!email) {
        throw new ApiError(400, " email is required");
    }

    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(400, "User does not exists");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(400, "Invalid credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id,
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User logged in successfully",
            ),
        );
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: "",
            },
        },
        {
            new: true,
        },
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"));
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const verifyEmail = asyncHandler(async (req, res) => {
    const { verificationToken } = req.params;

    console.log("verificationToken", verificationToken)

    if (!verificationToken) {
        throw new ApiError(400, "Email verification token is missing");
    }

    let hashedToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");

    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpiry: { $gt: Date.now() },
    });

    console.log(user);

    if (!user) {
        throw new ApiError(400, "Token is invalid or expired");
    }

    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;

    user.isEmailVerified = true;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                isEmailVerified: true,
            },
            "Email is verified",
        ),
    );
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(404, "User does not exists", []);
    }

    const { unHashedToken, hashedToken, tokenExpiry } =
        user.generateTemporaryToken();

    user.forgotPasswordToken = hashedToken;
    user.forgotPasswordExpiry = tokenExpiry;

    await user.save({ validateBeforeSave: false });

    await sendEmail({
        email: user?.email,
        subject: "Password reset request",
        mailgenContent: forgotPasswordMailgenContent(
            user.username,
            `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHashedToken}`,
        ),
    });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Password reset mail has been sent on your mail id",
            ),
        );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    verifyEmail,
    forgotPasswordRequest
}