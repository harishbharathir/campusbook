import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { PERIODS } from "@shared/schema";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatPeriod(period: number): string {
    return `Period ${period} · ${PERIODS[period] || ""}`;
}

export function formatDate(dateStr: string): string {
    try {
        return format(new Date(dateStr + "T00:00:00"), "MMM d, yyyy");
    } catch {
        return dateStr;
    }
}

export function todayString(): string {
    return format(new Date(), "yyyy-MM-dd");
}

export { PERIODS };
