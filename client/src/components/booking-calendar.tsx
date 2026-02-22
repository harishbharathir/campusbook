import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Clock, X, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PERIODS, formatPeriod } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { Booking, Hall } from "@shared/schema";
import { toast } from "sonner";

interface BookingCalendarProps {
    hall: Hall;
    userId: string;
    selectedDate: Date;
}

export default function BookingCalendar({ hall, userId, selectedDate }: BookingCalendarProps) {
    const qc = useQueryClient();
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const [confirmSlot, setConfirmSlot] = useState<number | null>(null);
    const [reason, setReason] = useState("");

    const { data: bookings = [], isLoading } = useQuery<Booking[]>({
        queryKey: ["/api/bookings", hall._id, dateStr],
        queryFn: async () => {
            const res = await fetch(`/api/bookings?hallId=${hall._id}`, { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch bookings");
            const all: Booking[] = await res.json();
            return all.filter((b) => b.bookingDate === dateStr && b.status !== "cancelled" && b.status !== "rejected");
        },
    });

    const bookMut = useMutation({
        mutationFn: async (period: number) => {
            const res = await apiRequest("POST", "/api/bookings", {
                hallId: hall._id,
                bookingReason: reason,
                bookingDate: dateStr,
                period,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Booking failed");
            return data;
        },
        onSuccess: () => {
            toast.success("Booking request submitted!");
            qc.invalidateQueries({ queryKey: ["/api/bookings"] });
            setConfirmSlot(null);
            setReason("");
        },
        onError: (err: Error) => toast.error(err.message),
    });

    const cancelMut = useMutation({
        mutationFn: async (bookingId: string) => {
            const res = await apiRequest("DELETE", `/api/bookings/${bookingId}`);
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.message);
            }
        },
        onSuccess: () => {
            toast.success("Booking cancelled");
            qc.invalidateQueries({ queryKey: ["/api/bookings"] });
        },
        onError: (err: Error) => toast.error(err.message),
    });

    const getSlotInfo = (period: number) => {
        const booking = bookings.find((b) => b.period === period);
        if (!booking) return { type: "available" as const, booking: null };
        if (booking.userId === userId) {
            return { type: booking.status === "pending" ? ("myPending" as const) : ("myBooking" as const), booking };
        }
        return { type: "booked" as const, booking };
    };

    return (
        <>
            <div className="space-y-3 mt-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {hall.name} — {format(selectedDate, "MMM d, yyyy")}
                </h3>
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.entries(PERIODS).map(([pStr, time]) => {
                            const period = parseInt(pStr);
                            const { type, booking } = getSlotInfo(period);

                            return (
                                <motion.div
                                    key={period}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: period * 0.04 }}
                                    className={`relative group rounded-xl border p-3 transition-all duration-200 ${type === "available"
                                            ? "border-white/10 hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                                            : type === "myBooking"
                                                ? "border-blue-500/40 bg-blue-500/10"
                                                : type === "myPending"
                                                    ? "border-amber-500/40 bg-amber-500/10"
                                                    : "border-red-500/30 bg-red-500/10 opacity-70"
                                        }`}
                                    onClick={() => type === "available" && setConfirmSlot(period)}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-semibold">Period {period}</p>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Clock className="w-3 h-3" />
                                                {time}
                                            </div>
                                        </div>
                                        <Badge
                                            variant={
                                                type === "available" ? "available" :
                                                    type === "myBooking" ? "accepted" :
                                                        type === "myPending" ? "pending" : "booked"
                                            }
                                            className="text-xs shrink-0"
                                        >
                                            {type === "available" ? "Available" :
                                                type === "myBooking" ? "My Booking" :
                                                    type === "myPending" ? "Pending" : "Booked"}
                                        </Badge>
                                    </div>

                                    {(type === "myBooking" || type === "myPending") && booking && (
                                        <div className="mt-2 space-y-1">
                                            <p className="text-xs text-muted-foreground truncate">{booking.bookingReason}</p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    cancelMut.mutate(booking._id);
                                                }}
                                                disabled={cancelMut.isPending}
                                            >
                                                <X className="w-3 h-3 mr-1" />
                                                {type === "myPending" ? "Cancel Request" : "Cancel"}
                                            </Button>
                                        </div>
                                    )}

                                    {type === "available" && (
                                        <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-xs font-semibold text-primary">Book Now →</span>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Confirm Dialog */}
            <Dialog open={confirmSlot !== null} onOpenChange={(open) => !open && setConfirmSlot(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-primary" />
                            Confirm Booking
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="glass rounded-lg p-3 space-y-1 text-sm">
                            <p><span className="text-muted-foreground">Hall:</span> <span className="font-medium">{hall.name}</span></p>
                            <p><span className="text-muted-foreground">Date:</span> <span className="font-medium">{format(selectedDate, "MMMM d, yyyy")}</span></p>
                            {confirmSlot && (
                                <p><span className="text-muted-foreground">Period:</span> <span className="font-medium">{formatPeriod(confirmSlot)}</span></p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="booking-reason">Purpose / Reason *</Label>
                            <Input
                                id="booking-reason"
                                placeholder="e.g., Guest lecture on AI/ML"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setConfirmSlot(null)}>Cancel</Button>
                        <Button
                            onClick={() => confirmSlot && bookMut.mutate(confirmSlot)}
                            disabled={!reason.trim() || bookMut.isPending}
                        >
                            {bookMut.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Booking...</> : "Confirm Booking"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
