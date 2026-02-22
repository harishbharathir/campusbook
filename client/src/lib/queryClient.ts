import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

export async function apiRequest(
    method: string,
    path: string,
    body?: unknown
): Promise<Response> {
    const res = await fetch(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        credentials: "include",
    });
    return res;
}
