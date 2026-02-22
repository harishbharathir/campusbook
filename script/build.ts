import * as esbuild from "esbuild";

await esbuild.build({
    entryPoints: ["server/index.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: "dist/index.mjs",
    external: [
        "mongoose",
        "bcryptjs",
        "passport",
        "passport-local",
        "express",
        "express-session",
        "connect-mongo",
        "socket.io",
        "xlsx",
        "dotenv",
    ],
    banner: {
        js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
    },
});

console.log("✅ Server bundled to dist/index.mjs");
