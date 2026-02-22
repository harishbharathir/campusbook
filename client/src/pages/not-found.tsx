import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-6">
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
