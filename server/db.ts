import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const IS_PROD = process.env.NODE_ENV === "production" || !!process.env.RENDER;

if (!MONGODB_URI && IS_PROD) {
    console.error("❌ CRITICAL: MONGODB_URI is not set in production!");
    console.error("Please add MONGODB_URI to your Render Environment Variables.");
    process.exit(1);
}

export const DB_URI = MONGODB_URI || "mongodb://127.0.0.1:27017/campusbook";

export async function connectDB() {
    try {
        const maskedUri = DB_URI.replace(/:([^@]+)@/, ":****@");
        console.log(`🔌 Connecting to MongoDB: ${maskedUri.split("@").pop() || maskedUri}`);
        await mongoose.connect(DB_URI);
        console.log("✅ MongoDB connected successfully");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    }
}
