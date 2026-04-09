import mongoose from "mongoose";
import { DB_NAME } from "../utils/constants.js";

/* Establishes the mongoose connection, called once from the index.js before the 
    http server starts. On failure the process exits so the container/process
    manager can restart with a clean state. */
const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`✅ MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error("❌ MongoDB connection error", error);
        process.exit(1);
    }
};

export default connectDB;
