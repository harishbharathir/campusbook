import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background relative">
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50">
                <img 
                    src="/TRP_Engineering_College.png" 
                    alt="TRP Engineering College" 
                    className="h-16 sm:h-24 w-auto object-contain drop-shadow-md" 
                />
            </div>
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 flex gap-3 sm:gap-4 items-center">
                <img 
                    src="/nba-logo.png" 
                    alt="NBA" 
                    className="h-12 sm:h-20 w-auto object-contain drop-shadow-md bg-white/10 rounded px-2" 
                />
                <img 
                    src="/naac-logo.png" 
                    alt="NAAC" 
                    className="h-12 sm:h-20 w-auto object-contain drop-shadow-md" 
                />
            </div>
            <div className="text-center space-y-6 mt-12 sm:mt-0">
                <div className="flex justify-center">
                    <BookOpen className="w-16 h-16 text-primary/50" />
                </div>
                <h1 className="text-6xl font-extrabold gradient-text">404</h1>
                <p className="text-xl text-muted-foreground">Page not found</p>
                <Link href="/">
                    <Button>Go Home</Button>
                </Link>
            </div>
        </div>
    );
}
