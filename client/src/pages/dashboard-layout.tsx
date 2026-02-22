import { ReactNode } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { BookOpen, LogOut, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/store";
import { queryClient } from "@/lib/queryClient";
import { toast } from "sonner";
import type { User as UserType } from "@shared/schema";

interface DashboardLayoutProps {
    children: ReactNode;
    user: UserType;
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
    const [, setLocation] = useLocation();
    const clearUser = useAuthStore((s) => s.clearUser);

    const logoutMut = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
            if (!res.ok) throw new Error("Logout failed");
        },
        onSuccess: () => {
            clearUser();
            queryClient.clear();
            toast.success("Logged out successfully");
            setLocation("/");
        },
        onError: () => toast.error("Logout failed"),
    });

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-40 glass border-b border-white/8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
                    {/* Logo */}
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-bold text-lg gradient-text">CampusBook</span>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm">
                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                                {user.role === "admin" ? (
                                    <Shield className="w-3.5 h-3.5 text-primary" />
                                ) : (
                                    <User className="w-3.5 h-3.5 text-primary" />
                                )}
                            </div>
                            <span className="text-foreground/80 font-medium hidden sm:block">
                                {user.name || user.username}
                            </span>
                            <Badge variant={user.role === "admin" ? "default" : "secondary"} className="hidden sm:flex capitalize">
                                {user.role}
                            </Badge>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => logoutMut.mutate()}
                            disabled={logoutMut.isPending}
                            className="gap-1.5"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:block">Logout</span>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {children}
            </main>
        </div>
    );
}
