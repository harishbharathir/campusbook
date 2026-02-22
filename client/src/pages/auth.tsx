import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpen, Building2, Lock, User, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuthStore } from "@/lib/store";
import { toast } from "sonner";

async function loginFn(body: { username: string; password: string }) {
    const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");
    return data;
}

async function registerFn(body: { username: string; password: string; name?: string }) {
    const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Registration failed");
    return data;
}

export default function AuthPage() {
    const [, setLocation] = useLocation();
    const setUser = useAuthStore((s) => s.setUser);
    const [activeTab, setActiveTab] = useState("faculty");
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [form, setForm] = useState({ username: "", password: "", name: "" });
    const [showPw, setShowPw] = useState(false);

    const loginMut = useMutation({
        mutationFn: loginFn,
        onSuccess: (data) => {
            setUser(data.user);
            toast.success(`Welcome back, ${data.user.name || data.user.username}!`);
            setLocation(data.user.role === "admin" ? "/admin" : "/faculty");
        },
        onError: (err: Error) => toast.error(err.message),
    });

    const registerMut = useMutation({
        mutationFn: registerFn,
        onSuccess: async (_, vars) => {
            toast.success("Account created! Logging in...");
            const loginData = await loginFn({ username: vars.username, password: vars.password });
            setUser(loginData.user);
            setLocation("/faculty");
        },
        onError: (err: Error) => toast.error(err.message),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === "login") {
            loginMut.mutate({ username: form.username, password: form.password });
        } else {
            registerMut.mutate({ username: form.username, password: form.password, name: form.name });
        }
    };

    const isBusy = loginMut.isPending || registerMut.isPending;

    return (
        <div className="min-h-screen flex">
            {/* Left — Form */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 max-w-md mx-auto w-full">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full space-y-8"
                >
                    {/* Logo */}
                    <div className="text-center space-y-2">
                        <div className="flex justify-center mb-4">
                            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
                                <BookOpen className="w-7 h-7 text-primary" />
                            </div>
                        </div>
                        <h1 className="text-4xl font-extrabold gradient-text">CampusBook</h1>
                        <p className="text-muted-foreground text-sm">University Seminar Hall Reservation</p>
                    </div>

                    {/* Role Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="w-full">
                            <TabsTrigger value="faculty" className="flex-1 gap-2">
                                <User className="w-4 h-4" /> Faculty
                            </TabsTrigger>
                            <TabsTrigger value="admin" className="flex-1 gap-2">
                                <Building2 className="w-4 h-4" /> Administrator
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="faculty">
                            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                                {mode === "signup" && (
                                    <div className="space-y-1.5">
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input
                                            id="name"
                                            placeholder="Dr. Jane Smith"
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        />
                                    </div>
                                )}
                                <div className="space-y-1.5">
                                    <Label htmlFor="username">Username</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="username"
                                            placeholder="john.doe"
                                            className="pl-9"
                                            value={form.username}
                                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="password"
                                            type={showPw ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="pl-9 pr-9"
                                            value={form.password}
                                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPw(!showPw)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <Button type="submit" className="w-full h-11 text-base" disabled={isBusy}>
                                    {isBusy ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
                                </Button>
                                <p className="text-center text-sm text-muted-foreground">
                                    {mode === "login" ? "Don't have an account?" : "Already have an account?"}
                                    {" "}
                                    <button
                                        type="button"
                                        onClick={() => setMode(mode === "login" ? "signup" : "login")}
                                        className="text-primary hover:underline font-medium"
                                    >
                                        {mode === "login" ? "Sign up" : "Sign in"}
                                    </button>
                                </p>
                            </form>
                        </TabsContent>

                        <TabsContent value="admin">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    loginMut.mutate({ username: form.username, password: form.password });
                                }}
                                className="mt-6 space-y-5"
                            >
                                <div className="space-y-1.5">
                                    <Label htmlFor="admin-username">Admin Username</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="admin-username"
                                            placeholder="admin"
                                            className="pl-9"
                                            value={form.username}
                                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="admin-password">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="admin-password"
                                            type={showPw ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="pl-9 pr-9"
                                            value={form.password}
                                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPw(!showPw)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <Button type="submit" className="w-full h-11 text-base" disabled={isBusy}>
                                    {isBusy ? "Signing in..." : "Admin Sign In"}
                                </Button>
                                <p className="text-center text-xs text-muted-foreground">
                                    Default: <code className="bg-white/5 px-1 rounded">admin</code> / <code className="bg-white/5 px-1 rounded">admin123</code>
                                </p>
                            </form>
                        </TabsContent>
                    </Tabs>
                </motion.div>
            </div>

            {/* Right — Background */}
            <div className="hidden lg:flex flex-1 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-teal-600/20" />
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `radial-gradient(circle at 20% 50%, rgba(96, 165, 250, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(167, 139, 250, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 60% 80%, rgba(52, 211, 153, 0.15) 0%, transparent 50%)`,
                    }}
                />
                <div className="relative z-10 flex flex-col items-center justify-center px-12 text-center space-y-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <div className="w-24 h-24 rounded-3xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-6 mx-auto">
                            <BookOpen className="w-12 h-12 text-primary" />
                        </div>
                        <h2 className="text-5xl font-extrabold text-white mb-4">
                            Smart Hall<br />Reservations
                        </h2>
                        <p className="text-lg text-white/60 max-w-sm mx-auto leading-relaxed">
                            Streamline seminar hall booking for your entire campus — with real-time updates and effortless scheduling.
                        </p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        className="flex gap-4 mt-8"
                    >
                        {["8 Periods", "Real-time Updates", "Easy Booking"].map((f) => (
                            <div key={f} className="glass rounded-xl px-4 py-2 text-sm text-white/70">{f}</div>
                        ))}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
