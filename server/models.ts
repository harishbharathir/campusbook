import mongoose, { Schema, Document } from "mongoose";

// ─── User ─────────────────────────────────────────────────────────────────────
export interface IUser extends Document {
    username: string;
    password: string;
    role: "admin" | "faculty";
    name?: string;
    email?: string;
    department?: string;
    createdAt: Date;
}

const userSchema = new Schema<IUser>({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "faculty"], default: "faculty" },
    name: { type: String },
    email: { type: String },
    department: { type: String },
    createdAt: { type: Date, default: Date.now },
});

export const UserModel = mongoose.model<IUser>("User", userSchema);

// ─── Hall ─────────────────────────────────────────────────────────────────────
export interface IHall extends Document {
    name: string;
    capacity: string;
    location?: string;
    amenities?: string;
    createdAt: Date;
}

const hallSchema = new Schema<IHall>({
    name: { type: String, required: true },
    capacity: { type: String, required: true },
    location: { type: String },
    amenities: { type: String },
    createdAt: { type: Date, default: Date.now },
});

export const HallModel = mongoose.model<IHall>("Hall", hallSchema);

// ─── Booking ──────────────────────────────────────────────────────────────────
export interface IBooking extends Document {
    hallId: string;
    userId: string;
    facultyName?: string;
    bookingReason: string;
    bookingDate: string;
    period: number;
    status: "pending" | "accepted" | "booked" | "rejected" | "cancelled";
    rejectionReason?: string;
    createdAt: Date;
    updatedAt?: Date;
}

const bookingSchema = new Schema<IBooking>({
    hallId: { type: String, required: true },
    userId: { type: String, required: true },
    facultyName: { type: String },
    bookingReason: { type: String, required: true },
    bookingDate: { type: String, required: true },
    period: { type: Number, required: true, min: 1, max: 8 },
    status: {
        type: String,
        enum: ["pending", "accepted", "booked", "rejected", "cancelled"],
        default: "pending",
    },
    rejectionReason: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
});

export const BookingModel = mongoose.model<IBooking>("Booking", bookingSchema);
