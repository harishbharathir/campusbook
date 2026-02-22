import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    if (process.env.NODE_ENV === "production") {
        console.error("❌ CRITICAL: MONGODB_URI is not set in production!");
        process.exit(1);
    }
    console.warn("⚠️ MONGODB_URI is missing, falling back to localhost");
}

const finalUri = MONGODB_URI || "mongodb://127.0.0.1:27017/campusbook";

export async function connectDB() {
    try {
        const maskedUri = finalUri.replace(/:([^@]+)@/, ":****@");
        console.log(`🔌 Connecting to MongoDB: ${maskedUri.split("@").pop() || maskedUri}`);
        await mongoose.connect(finalUri);
        console.log("✅ MongoDB connected successfully");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    }
}
