"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-3", className)}
            classNames={{
                months: "flex flex-col sm:flex-row gap-4",
                month: "flex flex-col gap-4 w-full",
                caption: "flex justify-center pt-1 relative items-center w-full",
                caption_label: "text-sm font-semibold",
                nav: "flex items-center gap-1",
                nav_button: cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-7 w-7 opacity-50 hover:opacity-100"),
                nav_button_previous: "absolute left-2",
                nav_button_next: "absolute right-2",
                table: "w-full border-collapse",
                head_row: "grid grid-cols-7 mb-1",
                head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem] text-center",
                row: "grid grid-cols-7 w-full mt-2",
                cell: cn(
                    "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-primary/10 [&:has([aria-selected].day-outside)]:bg-primary/5 [&:has([aria-selected].day-range-end)]:rounded-r-md",
                    props.mode === "range"
                        ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
                        : "[&:has([aria-selected])]:rounded-md"
                ),
                day: cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-full p-0 font-normal aria-selected:opacity-100"),
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-white/10 text-foreground",
                day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-primary/20 aria-selected:text-muted-foreground aria-selected:opacity-30",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_middle: "aria-selected:bg-primary/10 aria-selected:text-foreground",
                day_hidden: "invisible",
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation }) => orientation === "left" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />,
            }}
            {...props}
        />
    );
}

Calendar.displayName = "Calendar";

export { Calendar };
