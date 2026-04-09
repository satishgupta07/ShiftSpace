import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, `./public/images`);
    },
    /* Prefix with timestamp to avoid filename collisions from concurrent uploads */
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

export const upload = multer({
    storage,
    limits: {
        fileSize: 1 * 1000 * 1000,  // 1 MB per file
    },
});
