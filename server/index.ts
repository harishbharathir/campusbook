import "dotenv/config";
import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import MongoStore from "connect-mongo";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import * as XLSX from "xlsx";
import { connectDB, DB_URI } from "./db.js";
import { UserModel, HallModel, BookingModel } from "./models.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
    cors: { origin: "*", credentials: true },
});

const PORT = parseInt(process.env.PORT || "3001", 10);
const IS_PROD = process.env.NODE_ENV === "production" || !!process.env.RENDER;
const SESSION_SECRET =
    process.env.SESSION_SECRET || "campusbook-secret-key-2024";

// ─── Middleware ───────────────────────────────────────────────────────────────
app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: DB_URI,
            ttl: 24 * 60 * 60 // 1 day
        }),
        cookie: {
            secure: IS_PROD,
            sameSite: IS_PROD ? "none" : "lax",
            maxAge: 24 * 60 * 60 * 1000,
        },
    })
);

app.use(passport.initialize());
app.use(passport.session());

// ─── Passport Config ──────────────────────────────────────────────────────────
passport.use(
    new LocalStrategy(async (username, password, done) => {
        try {
            const user = await UserModel.findOne({ username });
            if (!user) return done(null, false, { message: "Invalid credentials" });
            const match = await bcrypt.compare(password, user.password);
            if (!match) return done(null, false, { message: "Invalid credentials" });
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    })
);

passport.serializeUser((user: any, done) => {
    done(null, user._id.toString());
});

passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await UserModel.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function requireAuth(req: any, res: any, next: any) {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: "Unauthorized" });
}

function requireAdmin(req: any, res: any, next: any) {
    if (req.isAuthenticated() && req.user?.role === "admin") return next();
    res.status(403).json({ message: "Forbidden: Admin only" });
}

// ─── Helper: serialize user for client ───────────────────────────────────────
function serializeUser(user: any) {
    return {
        _id: user._id.toString(),
        username: user.username,
        role: user.role,
        name: user.name,
        email: user.email,
        department: user.department,
        createdAt: user.createdAt,
    };
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────
const authRouter = express.Router();

authRouter.post("/register", async (req, res) => {
    try {
        const { username, password, role, name, email, department } = req.body;
        if (!username || !password)
            return res.status(400).json({ message: "Username and password required" });
        const existing = await UserModel.findOne({ username });
        if (existing)
            return res.status(409).json({ message: "Username already taken" });
        const hashed = await bcrypt.hash(password, 10);
        const user = await UserModel.create({
            username,
            password: hashed,
            role: role || "faculty",
            name,
            email,
            department,
        });
        res.status(201).json({ message: "User created", user: serializeUser(user) });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

authRouter.post("/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
        if (err) return next(err);
        if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
        req.logIn(user, (err: any) => {
            if (err) return next(err);
            res.json({ user: serializeUser(user) });
        });
    })(req, res, next);
});

authRouter.post("/logout", (req, res) => {
    req.logout(() => {
        req.session.destroy(() => {
            res.json({ message: "Logged out" });
        });
    });
});

authRouter.get("/me", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    res.json({ user: serializeUser(req.user) });
});

authRouter.post("/change-password", requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await UserModel.findById((req.user as any)._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) return res.status(400).json({ message: "Incorrect current password" });

        const hashed = await bcrypt.hash(newPassword, 10);
        user.password = hashed;
        await user.save();

        res.json({ message: "Password changed successfully" });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// ─── Hall Routes ──────────────────────────────────────────────────────────────
const hallRouter = express.Router();

hallRouter.get("/", requireAuth, async (_req, res) => {
    const halls = await HallModel.find().sort({ createdAt: -1 });
    res.json(halls.map((h) => ({ ...h.toObject(), _id: h._id.toString() })));
});

hallRouter.post("/", requireAdmin, async (req, res) => {
    try {
        const { name, capacity, location, amenities } = req.body;
        if (!name || !capacity)
            return res.status(400).json({ message: "name and capacity are required" });
        const hall = await HallModel.create({ name, capacity, location, amenities });
        const serialized = { ...hall.toObject(), _id: hall._id.toString() };
        io.emit("hall:created", serialized);
        res.status(201).json(serialized);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

hallRouter.delete("/:id", requireAdmin, async (req, res) => {
    await HallModel.findByIdAndDelete(req.params.id);
    res.json({ message: "Hall deleted" });
});

// ─── Booking Routes ───────────────────────────────────────────────────────────
const bookingRouter = express.Router();

bookingRouter.get("/export/excel", requireAdmin, async (_req, res) => {
    try {
        const bookings = await BookingModel.find().sort({ createdAt: -1 });
        const halls = await HallModel.find();
        const hallMap: Record<string, string> = {};
        halls.forEach((h) => (hallMap[h._id.toString()] = h.name));

        const PERIODS: Record<number, string> = {
            1: "9:50 – 10:40",
            2: "10:40 – 11:30",
            3: "11:30 – 12:20",
            4: "12:20 – 1:10",
            5: "1:25 – 2:15",
            6: "2:15 – 3:05",
            7: "3:10 – 4:00",
            8: "4:00 – 4:50",
        };

        const data = bookings.map((b) => ({
            "Hall Name": hallMap[b.hallId] || b.hallId,
            "Faculty Name": b.facultyName || "—",
            "Booking Reason": b.bookingReason,
            Date: b.bookingDate,
            Period: `Period ${b.period} (${PERIODS[b.period] || ""})`,
            Status: b.status,
            "Rejection Reason": b.rejectionReason || "—",
            "Created At": b.createdAt?.toISOString(),
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Bookings");
        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Disposition", "attachment; filename=bookings.xlsx");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.send(buf);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

bookingRouter.get("/export/my-excel", requireAuth, async (req, res) => {
    try {
        const user = req.user as any;
        const bookings = await BookingModel.find({ userId: user._id.toString() }).sort({ createdAt: -1 });
        const halls = await HallModel.find();
        const hallMap: Record<string, string> = {};
        halls.forEach((h) => (hallMap[h._id.toString()] = h.name));

        const PERIODS: Record<number, string> = {
            1: "9:50 – 10:40",
            2: "10:40 – 11:30",
            3: "11:30 – 12:20",
            4: "12:20 – 1:10",
            5: "1:25 – 2:15",
            6: "2:15 – 3:05",
            7: "3:10 – 4:00",
            8: "4:00 – 4:50",
        };

        const data = bookings.map((b) => ({
            "Hall Name": hallMap[b.hallId] || b.hallId,
            Date: b.bookingDate,
            Period: `Period ${b.period} (${PERIODS[b.period] || ""})`,
            "Booking Reason": b.bookingReason,
            Status: b.status,
            "Rejection Reason": b.rejectionReason || "—",
            "Created At": b.createdAt?.toISOString(),
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "MyBookings");
        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Disposition", `attachment; filename=my_bookings_${user.username}.xlsx`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.send(buf);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

bookingRouter.get("/", requireAuth, async (req, res) => {
    try {
        const user = req.user as any;
        const filter: any = {};
        if (req.query.hallId) filter.hallId = req.query.hallId;
        if (user.role !== "admin") filter.userId = user._id.toString();
        const bookings = await BookingModel.find(filter).sort({ createdAt: -1 });
        res.json(bookings.map((b) => ({ ...b.toObject(), _id: b._id.toString() })));
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

bookingRouter.post("/", requireAuth, async (req, res) => {
    try {
        const user = req.user as any;
        const { hallId, bookingReason, bookingDate, period } = req.body;
        if (!hallId || !bookingReason || !bookingDate || !period)
            return res.status(400).json({ message: "hallId, bookingReason, bookingDate, period required" });

        // Check slot availability
        const existing = await BookingModel.findOne({
            hallId,
            bookingDate,
            period: Number(period),
            status: { $in: ["pending", "accepted", "booked"] },
        });
        if (existing)
            return res.status(409).json({ message: "This slot is already booked or pending" });

        const booking = await BookingModel.create({
            hallId,
            userId: user._id.toString(),
            facultyName: user.name || user.username,
            bookingReason,
            bookingDate,
            period: Number(period),
            status: "pending",
        });
        const serialized = { ...booking.toObject(), _id: booking._id.toString() };
        io.emit("booking:created", serialized);
        res.status(201).json(serialized);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

bookingRouter.patch("/:id", requireAdmin, async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;
        const booking = await BookingModel.findByIdAndUpdate(
            req.params.id,
            { status, rejectionReason: rejectionReason || undefined, updatedAt: new Date() },
            { new: true }
        );
        if (!booking) return res.status(404).json({ message: "Booking not found" });
        const serialized = { ...booking.toObject(), _id: booking._id.toString() };
        io.emit("booking:updated", serialized);
        res.json(serialized);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

bookingRouter.delete("/:id", requireAuth, async (req, res) => {
    try {
        const user = req.user as any;
        const booking = await BookingModel.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: "Booking not found" });
        if (user.role !== "admin" && booking.userId !== user._id.toString())
            return res.status(403).json({ message: "Forbidden" });
        await BookingModel.findByIdAndUpdate(req.params.id, {
            status: "cancelled",
            updatedAt: new Date(),
        });
        io.emit("booking:cancelled", { _id: req.params.id });
        res.json({ message: "Booking cancelled" });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// ─── User Routes (Admin only) ─────────────────────────────────────────────────
const userRouter = express.Router();

userRouter.get("/", requireAdmin, async (_req, res) => {
    const users = await UserModel.find().select("-password").sort({ createdAt: -1 });
    res.json(users.map((u) => ({ ...u.toObject(), _id: u._id.toString() })));
});

userRouter.post("/", requireAdmin, async (req, res) => {
    try {
        const { username, password, name, email, department, role } = req.body;
        if (!username || !password)
            return res.status(400).json({ message: "username and password required" });
        const existing = await UserModel.findOne({ username });
        if (existing) return res.status(409).json({ message: "Username already taken" });
        const hashed = await bcrypt.hash(password, 10);
        const user = await UserModel.create({
            username,
            password: hashed,
            role: role || "faculty",
            name,
            email,
            department,
        });
        res.status(201).json(serializeUser(user));
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

userRouter.delete("/:id", requireAdmin, async (req, res) => {
    await UserModel.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
});

// ─── Register routes ──────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/halls", hallRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/users", userRouter);

app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Static (Production) ──────────────────────────────────────────────────────
if (IS_PROD) {
    const staticPath = path.resolve(__dirname, "public");
    app.use(express.static(staticPath));
    app.get("/{*path}", (_req, res) => {
        res.sendFile(path.join(staticPath, "index.html"));
    });
}

// ─── Seed admin ───────────────────────────────────────────────────────────────
async function seedAdmin() {
    const count = await UserModel.countDocuments({ role: "admin" });
    if (count === 0) {
        const hashed = await bcrypt.hash("admin123", 10);
        await UserModel.create({
            username: "admin",
            password: hashed,
            role: "admin",
            name: "Administrator",
        });
        console.log("🌱 Default admin created: admin / admin123");
    }
}

// ─── Start ────────────────────────────────────────────────────────────────────
(async () => {
    try {
        console.log("🎬 Starting CampusBook server...");
        await connectDB();
        await seedAdmin();
        httpServer.listen(PORT, "0.0.0.0", () => {
            console.log(`🚀 CampusBook server running on http://0.0.0.0:${PORT}`);
            console.log(`🌍 Environment: ${IS_PROD ? "production" : "development"}`);
        });
    } catch (err) {
        console.error("💥 CRITICAL: Server failed to start:", err);
        process.exit(1);
    }
})();
