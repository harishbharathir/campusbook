import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
    Building2, Users, Calendar, ClipboardList, BarChart3,
    Plus, Trash2, Check, X, Download, Search, Loader2,
    AlertCircle, ChevronRight
} from "lucide-react";
import DashboardLayout from "./dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { useAuthStore } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import { formatPeriod, formatDate, PERIODS } from "@/lib/utils";
import { socket } from "@/lib/config";
import { toast } from "sonner";
import type { Hall, Booking } from "@shared/schema";

type FacultyUser = { _id: string; username: string; name?: string; email?: string; department?: string; role: string; createdAt?: string };

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) {
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass-card border-0">
                <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">{title}</p>
                            <p className="text-3xl font-bold mt-1">{value}</p>
                        </div>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                            <Icon className="w-6 h-6" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

function getStatusBadgeVariant(status: string): any {
    const map: Record<string, string> = {
        pending: "pending", accepted: "accepted", booked: "accepted",
        rejected: "rejected", cancelled: "cancelled",
    };
    return map[status] || "secondary";
}

export default function AdminDashboard() {
    const user = useAuthStore((s) => s.user)!;
    const qc = useQueryClient();

    // State
    const [addHallOpen, setAddHallOpen] = useState(false);
    const [addFacultyOpen, setAddFacultyOpen] = useState(false);
    const [rejectDialog, setRejectDialog] = useState<{ open: boolean; bookingId: string }>({ open: false, bookingId: "" });
    const [rejectReason, setRejectReason] = useState("");
    const [calendarDate, setCalendarDate] = useState<Date>(new Date());
    const [bookingSearch, setBookingSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [hallForm, setHallForm] = useState({ name: "", capacity: "", location: "", amenities: "" });
    const [facultyForm, setFacultyForm] = useState({ username: "", password: "", name: "", email: "", department: "" });

    // Queries
    const { data: halls = [] } = useQuery<Hall[]>({
        queryKey: ["/api/halls"],
        queryFn: async () => {
            const res = await fetch("/api/halls", { credentials: "include" });
            return res.json();
        },
    });

    const { data: bookings = [] } = useQuery<Booking[]>({
        queryKey: ["/api/bookings"],
        queryFn: async () => {
            const res = await fetch("/api/bookings", { credentials: "include" });
            return res.json();
        },
    });

    const { data: facultyUsers = [] } = useQuery<FacultyUser[]>({
        queryKey: ["/api/users"],
        queryFn: async () => {
            const res = await fetch("/api/users", { credentials: "include" });
            return res.json();
        },
    });

    // Real-time
    useEffect(() => {
        const refresh = () => {
            qc.invalidateQueries({ queryKey: ["/api/bookings"] });
            qc.invalidateQueries({ queryKey: ["/api/halls"] });
        };
        socket.on("booking:created", refresh);
        socket.on("booking:updated", refresh);
        socket.on("booking:cancelled", refresh);
        socket.on("hall:created", refresh);
        return () => { socket.off("booking:created", refresh); socket.off("booking:updated", refresh); socket.off("booking:cancelled", refresh); socket.off("hall:created", refresh); };
    }, [qc]);

    // Stats
    const pending = bookings.filter((b) => b.status === "pending");
    const confirmed = bookings.filter((b) => b.status === "accepted" || b.status === "booked");
    const facultyCount = facultyUsers.filter((u) => u.role === "faculty").length;

    // Mutations
    const addHallMut = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/halls", hallForm);
            const d = await res.json();
            if (!res.ok) throw new Error(d.message);
            return d;
        },
        onSuccess: () => {
            toast.success("Hall added!"); setAddHallOpen(false); setHallForm({ name: "", capacity: "", location: "", amenities: "" });
            qc.invalidateQueries({ queryKey: ["/api/halls"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const deleteHallMut = useMutation({
        mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/halls/${id}`); },
        onSuccess: () => { toast.success("Hall deleted"); qc.invalidateQueries({ queryKey: ["/api/halls"] }); },
        onError: (e: Error) => toast.error(e.message),
    });

    const addFacultyMut = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/users", facultyForm);
            const d = await res.json();
            if (!res.ok) throw new Error(d.message);
            return d;
        },
        onSuccess: () => {
            toast.success("Faculty added!"); setAddFacultyOpen(false); setFacultyForm({ username: "", password: "", name: "", email: "", department: "" });
            qc.invalidateQueries({ queryKey: ["/api/users"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const deleteFacultyMut = useMutation({
        mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/users/${id}`); },
        onSuccess: () => { toast.success("Faculty deleted"); qc.invalidateQueries({ queryKey: ["/api/users"] }); },
        onError: (e: Error) => toast.error(e.message),
    });

    const updateBookingMut = useMutation({
        mutationFn: async ({ id, status, rejectionReason }: { id: string; status: string; rejectionReason?: string }) => {
            const res = await apiRequest("PATCH", `/api/bookings/${id}`, { status, rejectionReason });
            const d = await res.json();
            if (!res.ok) throw new Error(d.message);
            return d;
        },
        onSuccess: () => { toast.success("Booking updated"); qc.invalidateQueries({ queryKey: ["/api/bookings"] }); setRejectDialog({ open: false, bookingId: "" }); setRejectReason(""); },
        onError: (e: Error) => toast.error(e.message),
    });

    const hallMap: Record<string, string> = {};
    halls.forEach((h) => (hallMap[h._id] = h.name));

    const calendarDateStr = format(calendarDate, "yyyy-MM-dd");
    const calendarBookings = bookings.filter((b) => b.bookingDate === calendarDateStr && b.status !== "cancelled" && b.status !== "rejected");

    const filteredBookings = bookings.filter((b) => {
        if (statusFilter !== "all" && b.status !== statusFilter) return false;
        if (bookingSearch) {
            const s = bookingSearch.toLowerCase();
            return (hallMap[b.hallId] || "").toLowerCase().includes(s) ||
                (b.facultyName || "").toLowerCase().includes(s) ||
                b.bookingReason.toLowerCase().includes(s);
        }
        return true;
    });

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                {/* Title */}
                <div>
                    <h1 className="text-2xl font-bold gradient-text">Admin Dashboard</h1>
                    <p className="text-muted-foreground text-sm mt-1">Manage halls, faculty, and booking requests</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Total Halls" value={halls.length} icon={Building2} color="bg-blue-500/15 text-blue-400" />
                    <StatCard title="Confirmed Bookings" value={confirmed.length} icon={BarChart3} color="bg-emerald-500/15 text-emerald-400" />
                    <StatCard title="Pending Requests" value={pending.length} icon={ClipboardList} color="bg-amber-500/15 text-amber-400" />
                    <StatCard title="Faculty Users" value={facultyCount} icon={Users} color="bg-purple-500/15 text-purple-400" />
                </div>

                {/* Tabs */}
                <Tabs defaultValue="halls" className="space-y-4">
                    <TabsList className="flex-wrap h-auto gap-1 p-1">
                        <TabsTrigger value="halls" className="gap-1.5"><Building2 className="w-3.5 h-3.5" />Halls</TabsTrigger>
                        <TabsTrigger value="faculty" className="gap-1.5"><Users className="w-3.5 h-3.5" />Faculty</TabsTrigger>
                        <TabsTrigger value="calendar" className="gap-1.5"><Calendar className="w-3.5 h-3.5" />Calendar</TabsTrigger>
                        <TabsTrigger value="requests" className="gap-1.5 relative">
                            <ClipboardList className="w-3.5 h-3.5" />Requests
                            {pending.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] bg-amber-500 text-white rounded-full flex items-center justify-center">{pending.length}</span>}
                        </TabsTrigger>
                        <TabsTrigger value="bookings" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" />All Bookings</TabsTrigger>
                    </TabsList>

                    {/* ── HALLS ─────────────────────────────────────────────────────── */}
                    <TabsContent value="halls">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-semibold">Seminar Halls ({halls.length})</h2>
                            <Button size="sm" onClick={() => setAddHallOpen(true)} className="gap-1.5">
                                <Plus className="w-4 h-4" /> Add New Hall
                            </Button>
                        </div>
                        {halls.length === 0 ? (
                            <div className="text-center py-16 text-muted-foreground">
                                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>No halls yet. Add your first hall!</p>
                            </div>
                        ) : (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {halls.map((hall) => (
                                    <Card key={hall._id} className="glass-card border-0 group">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between">
                                                <CardTitle className="text-base">{hall.name}</CardTitle>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => deleteHallMut.mutate(hall._id)}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-2 text-sm text-muted-foreground">
                                            <p><span className="font-medium text-foreground">Capacity:</span> {hall.capacity}</p>
                                            {hall.location && <p><span className="font-medium text-foreground">Location:</span> {hall.location}</p>}
                                            {hall.amenities && (
                                                <div className="flex flex-wrap gap-1 pt-1">
                                                    {hall.amenities.split(",").map((a) => (
                                                        <Badge key={a} variant="outline" className="text-xs">{a.trim()}</Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* ── FACULTY ────────────────────────────────────────────────────── */}
                    <TabsContent value="faculty">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-semibold">Faculty Members ({facultyCount})</h2>
                            <Button size="sm" onClick={() => setAddFacultyOpen(true)} className="gap-1.5">
                                <Plus className="w-4 h-4" /> Add Faculty
                            </Button>
                        </div>
                        {facultyUsers.filter(u => u.role === "faculty").length === 0 ? (
                            <div className="text-center py-16 text-muted-foreground">
                                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>No faculty accounts yet.</p>
                            </div>
                        ) : (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {facultyUsers.filter(u => u.role === "faculty").map((fu) => (
                                    <Card key={fu._id} className="glass-card border-0 group">
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 text-purple-400 font-bold text-sm">
                                                {(fu.name || fu.username).charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{fu.name || fu.username}</p>
                                                <p className="text-xs text-muted-foreground truncate">@{fu.username}</p>
                                                {fu.department && <p className="text-xs text-muted-foreground truncate">{fu.department}</p>}
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0" onClick={() => deleteFacultyMut.mutate(fu._id)}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* ── CALENDAR ────────────────────────────────────────────────────── */}
                    <TabsContent value="calendar">
                        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
                            <div className="glass-card rounded-xl p-3">
                                <CalendarPicker
                                    mode="single"
                                    selected={calendarDate}
                                    onSelect={(d) => d && setCalendarDate(d)}
                                    className="w-full"
                                />
                            </div>
                            <div className="space-y-4">
                                <h3 className="font-semibold">Availability for {format(calendarDate, "MMMM d, yyyy")}</h3>
                                {halls.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">No halls configured.</p>
                                ) : (
                                    halls.map((hall) => (
                                        <Card key={hall._id} className="glass-card border-0">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-semibold">{hall.name} <span className="text-muted-foreground font-normal">· Cap: {hall.capacity}</span></CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {Object.entries(PERIODS).map(([pStr, time]) => {
                                                        const period = parseInt(pStr);
                                                        const booking = calendarBookings.find((b) => b.hallId === hall._id && b.period === period);
                                                        return (
                                                            <div
                                                                key={period}
                                                                className={`rounded-lg p-2 text-center text-xs border ${!booking ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" :
                                                                        booking.status === "pending" ? "border-amber-500/30 bg-amber-500/10 text-amber-400" :
                                                                            "border-red-500/30 bg-red-500/10 text-red-400"
                                                                    }`}
                                                            >
                                                                <div className="font-bold">P{period}</div>
                                                                <div className="text-[10px] opacity-75 mt-0.5">{!booking ? "Free" : booking.status === "pending" ? "Pending" : "Booked"}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* ── REQUESTS ─────────────────────────────────────────────────────── */}
                    <TabsContent value="requests">
                        <h2 className="font-semibold mb-4">Pending Requests ({pending.length})</h2>
                        {pending.length === 0 ? (
                            <div className="text-center py-16 text-muted-foreground">
                                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>No pending requests!</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pending.map((b) => (
                                    <Card key={b._id} className="glass-card border-0 border-l-2 border-l-amber-500/50">
                                        <CardContent className="p-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-semibold">{hallMap[b.hallId] || b.hallId}</span>
                                                        <Badge variant="pending" className="text-xs">Pending</Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{b.facultyName} · {formatDate(b.bookingDate)} · {formatPeriod(b.period)}</p>
                                                    <p className="text-sm">{b.bookingReason}</p>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <Button variant="success" size="sm" className="gap-1" onClick={() => updateBookingMut.mutate({ id: b._id, status: "accepted" })}>
                                                        <Check className="w-3.5 h-3.5" /> Accept
                                                    </Button>
                                                    <Button variant="warning" size="sm" className="gap-1 text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20" onClick={() => setRejectDialog({ open: true, bookingId: b._id })}>
                                                        <X className="w-3.5 h-3.5" /> Reject
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* ── ALL BOOKINGS ──────────────────────────────────────────────────── */}
                    <TabsContent value="bookings">
                        <div className="flex flex-col sm:flex-row gap-3 mb-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input placeholder="Search bookings..." className="pl-9" value={bookingSearch} onChange={(e) => setBookingSearch(e.target.value)} />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="accepted">Accepted</SelectItem>
                                    <SelectItem value="booked">Booked</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" className="gap-1.5 sm:w-auto" onClick={() => window.open("/api/bookings/export/excel", "_blank")}>
                                <Download className="w-4 h-4" /> Export Excel
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {filteredBookings.length === 0 ? (
                                <div className="text-center py-16 text-muted-foreground">
                                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>No bookings found</p>
                                </div>
                            ) : (
                                filteredBookings.map((b) => (
                                    <Card key={b._id} className="glass-card border-0">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 min-w-0 grid sm:grid-cols-4 gap-2 text-sm">
                                                    <div className="font-medium truncate">{hallMap[b.hallId] || b.hallId}</div>
                                                    <div className="text-muted-foreground truncate">{b.facultyName}</div>
                                                    <div className="text-muted-foreground">{formatDate(b.bookingDate)} · P{b.period}</div>
                                                    <div className="text-muted-foreground truncate">{b.bookingReason}</div>
                                                </div>
                                                <Badge variant={getStatusBadgeVariant(b.status)} className="shrink-0 capitalize">{b.status}</Badge>
                                            </div>
                                            {b.rejectionReason && (
                                                <p className="text-xs text-red-400 mt-2 pl-0">Rejection: {b.rejectionReason}</p>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Add Hall Dialog */}
            <Dialog open={addHallOpen} onOpenChange={setAddHallOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add New Hall</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        {[["name", "Hall Name *"], ["capacity", "Capacity *"], ["location", "Location"], ["amenities", "Amenities (comma-separated)"]].map(([field, label]) => (
                            <div key={field} className="space-y-1.5">
                                <Label>{label}</Label>
                                <Input placeholder={label} value={(hallForm as any)[field]} onChange={(e) => setHallForm({ ...hallForm, [field]: e.target.value })} />
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddHallOpen(false)}>Cancel</Button>
                        <Button onClick={() => addHallMut.mutate()} disabled={!hallForm.name || !hallForm.capacity || addHallMut.isPending}>
                            {addHallMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Add Hall
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Faculty Dialog */}
            <Dialog open={addFacultyOpen} onOpenChange={setAddFacultyOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Faculty Account</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        {[["username", "Username *"], ["password", "Password *"], ["name", "Full Name"], ["email", "Email"], ["department", "Department"]].map(([field, label]) => (
                            <div key={field} className="space-y-1.5">
                                <Label>{label}</Label>
                                <Input type={field === "password" ? "password" : "text"} placeholder={label} value={(facultyForm as any)[field]} onChange={(e) => setFacultyForm({ ...facultyForm, [field]: e.target.value })} />
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddFacultyOpen(false)}>Cancel</Button>
                        <Button onClick={() => addFacultyMut.mutate()} disabled={!facultyForm.username || !facultyForm.password || addFacultyMut.isPending}>
                            {addFacultyMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Add Faculty
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={rejectDialog.open} onOpenChange={(open) => !open && setRejectDialog({ open: false, bookingId: "" })}>
                <DialogContent>
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-red-400" />Reject Booking</DialogTitle></DialogHeader>
                    <div className="space-y-1.5 py-2">
                        <Label>Rejection Reason *</Label>
                        <Input placeholder="e.g., Hall not available for event type" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialog({ open: false, bookingId: "" })}>Cancel</Button>
                        <Button variant="destructive" onClick={() => updateBookingMut.mutate({ id: rejectDialog.bookingId, status: "rejected", rejectionReason: rejectReason })} disabled={!rejectReason.trim() || updateBookingMut.isPending}>
                            Reject Booking
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
