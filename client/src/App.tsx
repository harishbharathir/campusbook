import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { useAuthStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import AuthPage from "@/pages/auth";
import AdminDashboard from "@/pages/admin-dashboard";
import FacultyDashboard from "@/pages/faculty-dashboard";
import NotFound from "@/pages/not-found";

function App() {
    const { user, setUser, clearUser } = useAuthStore();
    const [, setLocation] = useLocation();

    const { data, isLoading } = useQuery({
        queryKey: ["/api/auth/me"],
        queryFn: async () => {
            const res = await fetch("/api/auth/me", { credentials: "include" });
            if (!res.ok) return null;
            return res.json();
        },
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        if (data?.user) {
            setUser(data.user);
        } else if (data === null) {
            clearUser();
        }
    }, [data, setUser, clearUser]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-muted-foreground text-sm">Loading CampusBook...</p>
                </div>
            </div>
        );
    }

    return (
        <Switch>
            <Route path="/" component={user ? (user.role === "admin" ? AdminDashboard : FacultyDashboard) : AuthPage} />
            <Route path="/admin" component={user?.role === "admin" ? AdminDashboard : AuthPage} />
            <Route path="/faculty" component={user?.role === "faculty" ? FacultyDashboard : AuthPage} />
            <Route component={NotFound} />
        </Switch>
    );
}

export default App;
