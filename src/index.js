import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";
import logger from "./utils/logger.js";

dotenv.config({
    path: "./.env",
});

const port = process.env.PORT || 3000;

/* Only start the HTTP server after a successful DB connection to avoid 
    accepting requests before the database is ready. */
connectDB()
    .then(() => {
        app.listen(port, () => {
            logger.info(`Example app listening on port http://localhost:${port}`);
        });
    })
    .catch((err) => {
        logger.error("MongoDB connection error", err);
        process.exit(1);
    });
