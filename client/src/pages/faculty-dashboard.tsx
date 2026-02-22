import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, isFuture, parseISO } from "date-fns";
import {
    Building2, CalendarDays, Search, X, Clock, AlertCircle, Loader2
} from "lucide-react";
import DashboardLayout from "./dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BookingCalendar from "@/components/booking-calendar";
import { useAuthStore } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import { formatPeriod, formatDate, PERIODS } from "@/lib/utils";
import { socket } from "@/lib/config";
import { toast } from "sonner";
import type { Hall, Booking } from "@shared/schema";

function getStatusBadgeVariant(status: string): any {
    const map: Record<string, any> = {
        pending: "pending", accepted: "accepted", booked: "accepted",
        rejected: "rejected", cancelled: "cancelled",
    };
    return map[status] || "secondary";
}

export default function FacultyDashboard() {
    const user = useAuthStore((s) => s.user)!;
    const qc = useQueryClient();

    const [hallSearch, setHallSearch] = useState("");
    const [capacityFilter, setCapacityFilter] = useState("all");
    const [selectedHall, setSelectedHall] = useState<Hall | null>(null);
    const [bookingDate, setBookingDate] = useState<Date>(new Date());
    const [calendarDate, setCalendarDate] = useState<Date>(new Date());

    const { data: halls = [] } = useQuery<Hall[]>({
        queryKey: ["/api/halls"],
        queryFn: async () => {
            const res = await fetch("/api/halls", { credentials: "include" });
            return res.json();
        },
    });

    const { data: myBookings = [] } = useQuery<Booking[]>({
        queryKey: ["/api/bookings", "mine"],
        queryFn: async () => {
            const res = await fetch("/api/bookings", { credentials: "include" });
            return res.json();
        },
    });

    // Calendar view bookings (all, for slot coloring)
    const calendarDateStr = format(calendarDate, "yyyy-MM-dd");
    const { data: calendarBookings = [] } = useQuery<Booking[]>({
        queryKey: ["/api/bookings", "calendar", calendarDateStr],
        queryFn: async () => {
            const res = await fetch("/api/bookings", { credentials: "include" });
            const all: Booking[] = await res.json();
            return all.filter((b) => b.bookingDate === calendarDateStr && b.status !== "cancelled" && b.status !== "rejected");
        },
    });

    useEffect(() => {
        const refresh = () => {
            qc.invalidateQueries({ queryKey: ["/api/bookings"] });
            qc.invalidateQueries({ queryKey: ["/api/halls"] });
        };
        socket.on("booking:created", refresh);
        socket.on("booking:updated", refresh);
        socket.on("booking:cancelled", refresh);
        socket.on("hall:created", refresh);
        return () => {
            socket.off("booking:created", refresh);
            socket.off("booking:updated", refresh);
            socket.off("booking:cancelled", refresh);
            socket.off("hall:created", refresh);
        };
    }, [qc]);

    const cancelMut = useMutation({
        mutationFn: async (id: string) => {
            const res = await apiRequest("DELETE", `/api/bookings/${id}`);
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.message);
            }
        },
        onSuccess: () => {
            toast.success("Booking cancelled");
            qc.invalidateQueries({ queryKey: ["/api/bookings"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const hallMap: Record<string, string> = {};
    halls.forEach((h) => (hallMap[h._id] = h.name));

    const today = format(new Date(), "yyyy-MM-dd");
    const todayBookings = myBookings.filter((b) => b.bookingDate === today && (b.status === "accepted" || b.status === "booked"));
    const upcoming = myBookings
        .filter((b) => isFuture(parseISO(b.bookingDate + "T00:00:00")) && b.status !== "cancelled" && b.status !== "rejected")
        .sort((a, b) => a.bookingDate.localeCompare(b.bookingDate))
        .slice(0, 3);
    const pendingCount = myBookings.filter((b) => b.status === "pending").length;

    const filteredHalls = halls.filter((h) => {
        if (hallSearch && !h.name.toLowerCase().includes(hallSearch.toLowerCase())) return false;
        if (capacityFilter !== "all") {
            const cap = parseInt(h.capacity);
            if (capacityFilter === "small" && cap > 60) return false;
            if (capacityFilter === "medium" && (cap <= 60 || cap > 120)) return false;
            if (capacityFilter === "large" && cap <= 120) return false;
        }
        return true;
    });

    const isCancellable = (b: Booking) =>
        b.status !== "cancelled" && b.status !== "rejected" &&
        (isFuture(parseISO(b.bookingDate + "T00:00:00")) || b.bookingDate === today);

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold gradient-text">Faculty Dashboard</h1>
                    <p className="text-muted-foreground text-sm mt-1">Book halls and manage your reservations</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { title: "Today's Bookings", value: todayBookings.length, color: "bg-blue-500/15 text-blue-400" },
                        { title: "Total Bookings", value: myBookings.length, color: "bg-emerald-500/15 text-emerald-400" },
                        { title: "Available Halls", value: halls.length, color: "bg-purple-500/15 text-purple-400" },
                        { title: "Pending Requests", value: pendingCount, color: "bg-amber-500/15 text-amber-400" },
                    ].map((s, i) => (
                        <motion.div key={s.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <Card className="glass-card border-0">
                                <CardContent className="p-5">
                                    <p className="text-sm text-muted-foreground">{s.title}</p>
                                    <p className="text-3xl font-bold mt-1">{s.value}</p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Tabs */}
                <Tabs defaultValue="book" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="book" className="gap-1.5"><Building2 className="w-3.5 h-3.5" />Book Halls</TabsTrigger>
                        <TabsTrigger value="mybookings" className="gap-1.5"><CalendarDays className="w-3.5 h-3.5" />My Bookings</TabsTrigger>
                        <TabsTrigger value="calendar" className="gap-1.5"><Clock className="w-3.5 h-3.5" />Calendar View</TabsTrigger>
                    </TabsList>

                    {/* ── BOOK HALLS ────────────────────────────────────────────────── */}
                    <TabsContent value="book">
                        <div className="flex flex-col sm:flex-row gap-3 mb-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input placeholder="Search halls..." className="pl-9" value={hallSearch} onChange={(e) => setHallSearch(e.target.value)} />
                            </div>
                            <Select value={capacityFilter} onValueChange={setCapacityFilter}>
                                <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Capacities</SelectItem>
                                    <SelectItem value="small">Small (&lt;60)</SelectItem>
                                    <SelectItem value="medium">Medium (60–120)</SelectItem>
                                    <SelectItem value="large">Large (&gt;120)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {filteredHalls.length === 0 ? (
                            <div className="text-center py-16 text-muted-foreground">
                                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>No halls found. Ask your admin to add halls.</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredHalls.map((hall) => (
                                        <Card
                                            key={hall._id}
                                            className={`glass-card border-0 cursor-pointer transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 ${selectedHall?._id === hall._id ? "border-primary/50 bg-primary/8" : ""}`}
                                            onClick={() => setSelectedHall(selectedHall?._id === hall._id ? null : hall)}
                                        >
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-sm flex items-center justify-between">
                                                    {hall.name}
                                                    {selectedHall?._id === hall._id && <Badge variant="default" className="text-xs">Selected</Badge>}
                                                </CardTitle>
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

                                {selectedHall && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 glass-card p-5 rounded-xl">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold">Book {selectedHall.name}</h3>
                                            <Button variant="ghost" size="icon" onClick={() => setSelectedHall(null)}><X className="w-4 h-4" /></Button>
                                        </div>
                                        <div className="grid lg:grid-cols-[260px_1fr] gap-6">
                                            <div className="glass rounded-xl p-2">
                                                <CalendarPicker
                                                    mode="single"
                                                    selected={bookingDate}
                                                    onSelect={(d) => d && setBookingDate(d)}
                                                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                                                    className="w-full"
                                                />
                                            </div>
                                            <BookingCalendar hall={selectedHall} userId={user._id} selectedDate={bookingDate} />
                                        </div>
                                    </motion.div>
                                )}
                            </>
                        )}
                    </TabsContent>

                    {/* ── MY BOOKINGS ───────────────────────────────────────────────── */}
                    <TabsContent value="mybookings">
                        {/* Upcoming */}
                        {upcoming.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Upcoming Bookings</h3>
                                <div className="grid sm:grid-cols-3 gap-3">
                                    {upcoming.map((b) => (
                                        <Card key={b._id} className="glass-card border-0 border-l-2 border-l-primary/50">
                                            <CardContent className="p-4 space-y-1">
                                                <p className="font-semibold text-sm">{hallMap[b.hallId] || b.hallId}</p>
                                                <p className="text-xs text-muted-foreground">{formatDate(b.bookingDate)} · {formatPeriod(b.period)}</p>
                                                <p className="text-xs truncate">{b.bookingReason}</p>
                                                <Badge variant={getStatusBadgeVariant(b.status)} className="text-xs capitalize">{b.status}</Badge>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* All bookings */}
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">All Bookings</h3>
                        {myBookings.length === 0 ? (
                            <div className="text-center py-16 text-muted-foreground">
                                <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>No bookings yet. Book a hall to get started!</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {[...myBookings].sort((a, b) => b.bookingDate.localeCompare(a.bookingDate)).map((b) => (
                                    <Card key={b._id} className="glass-card border-0">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 min-w-0 grid sm:grid-cols-3 gap-2 text-sm">
                                                    <div>
                                                        <p className="font-medium truncate">{hallMap[b.hallId] || b.hallId}</p>
                                                        <p className="text-xs text-muted-foreground truncate">{b.bookingReason}</p>
                                                    </div>
                                                    <div className="text-muted-foreground text-xs">
                                                        <p>{formatDate(b.bookingDate)}</p>
                                                        <p>{formatPeriod(b.period)}</p>
                                                    </div>
                                                    <div>
                                                        <Badge variant={getStatusBadgeVariant(b.status)} className="text-xs capitalize">{b.status}</Badge>
                                                        {b.rejectionReason && <p className="text-xs text-red-400 mt-1">{b.rejectionReason}</p>}
                                                    </div>
                                                </div>
                                                {isCancellable(b) && (
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-red-500/10 shrink-0" onClick={() => cancelMut.mutate(b._id)} disabled={cancelMut.isPending}>
                                                        <X className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* ── CALENDAR VIEW ─────────────────────────────────────────────── */}
                    <TabsContent value="calendar">
                        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
                            <div className="glass-card rounded-xl p-3">
                                <CalendarPicker mode="single" selected={calendarDate} onSelect={(d) => d && setCalendarDate(d)} className="w-full" />
                            </div>
                            <div className="space-y-4">
                                <h3 className="font-semibold">{format(calendarDate, "MMMM d, yyyy")}</h3>
                                {halls.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">No halls configured.</p>
                                ) : (
                                    halls.map((hall) => (
                                        <Card key={hall._id} className="glass-card border-0">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm">{hall.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {Object.entries(PERIODS).map(([pStr, time]) => {
                                                        const period = parseInt(pStr);
                                                        const booking = calendarBookings.find((b) => b.hallId === hall._id && b.period === period);
                                                        const isMe = booking?.userId === user._id;
                                                        return (
                                                            <div
                                                                key={period}
                                                                className={`rounded-lg p-2 text-center text-xs border ${!booking ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" :
                                                                        isMe ? "border-blue-500/40 bg-blue-500/10 text-blue-400" :
                                                                            "border-red-500/30 bg-red-500/10 text-red-400"
                                                                    }`}
                                                                title={booking ? `${booking.facultyName || "Unknown"}: ${booking.bookingReason}` : "Available"}
                                                            >
                                                                <div className="font-bold">P{period}</div>
                                                                <div className="text-[10px] mt-0.5 opacity-75">
                                                                    {!booking ? "Free" : isMe ? "Yours" : "Taken"}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Available</span>
                                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Your Booking</span>
                                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Booked</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
