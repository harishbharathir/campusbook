import { z } from "zod";

// ─── User ────────────────────────────────────────────────────────────────────
export const userRoles = ["admin", "faculty"] as const;
export type UserRole = (typeof userRoles)[number];

export const userSchema = z.object({
    _id: z.string(),
    username: z.string().min(3),
    password: z.string().min(6),
    role: z.enum(userRoles).default("faculty"),
    name: z.string().optional(),
    email: z.string().email().optional(),
    department: z.string().optional(),
    createdAt: z.string().optional(),
});

export const insertUserSchema = userSchema.omit({ _id: true, createdAt: true });
export const loginSchema = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
});

export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginData = z.infer<typeof loginSchema>;

// ─── Hall ────────────────────────────────────────────────────────────────────
export const hallSchema = z.object({
    _id: z.string(),
    name: z.string().min(1),
    capacity: z.string().min(1),
    location: z.string().optional(),
    amenities: z.string().optional(),
    createdAt: z.string().optional(),
});

export const insertHallSchema = hallSchema.omit({ _id: true, createdAt: true });

export type Hall = z.infer<typeof hallSchema>;
export type InsertHall = z.infer<typeof insertHallSchema>;

// ─── Booking ─────────────────────────────────────────────────────────────────
export const bookingStatuses = [
    "pending",
    "accepted",
    "booked",
    "rejected",
    "cancelled",
] as const;
export type BookingStatus = (typeof bookingStatuses)[number];

export const bookingSchema = z.object({
    _id: z.string(),
    hallId: z.string(),
    userId: z.string(),
    facultyName: z.string().optional(),
    bookingReason: z.string().min(1),
    bookingDate: z.string().min(1), // "YYYY-MM-DD"
    period: z.number().int().min(1).max(8),
    status: z.enum(bookingStatuses).default("pending"),
    rejectionReason: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
});

export const insertBookingSchema = bookingSchema.omit({
    _id: true,
    userId: true,
    facultyName: true,
    status: true,
    rejectionReason: true,
    createdAt: true,
    updatedAt: true,
});

export const updateBookingSchema = z.object({
    status: z.enum(bookingStatuses),
    rejectionReason: z.string().optional(),
});

export type Booking = z.infer<typeof bookingSchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type UpdateBooking = z.infer<typeof updateBookingSchema>;

// ─── Time Slots ──────────────────────────────────────────────────────────────
export const PERIODS: Record<number, string> = {
    1: "9:00 – 9:50",
    2: "9:50 – 10:40",
    3: "10:55 – 11:45",
    4: "11:45 – 12:35",
    5: "01:30 – 02:15",
    6: "02:15 – 03:00",
    7: "03:15 – 04:00",
    8: "04:00 – 04:45",
};
