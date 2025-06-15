// This file exports the handlers from our main auth configuration for Next.js App Router.
// For Auth.js v5 (next-auth@5.x.x), the handlers (GET, POST) are typically part of the
// object returned by NextAuth(), so we export them directly.

export { GET, POST } from "@/auth";

// If you needed to refer to them as `handlers.GET` and `handlers.POST` (older versions or different setup)
// you might do:
// import { handlers } from "@/auth";
// export const { GET, POST } = handlers;
// Or more explicitly:
// export const GET = handlers.GET;
// export const POST = handlers.POST;

// Setting runtime to 'edge' is optional and depends on your deployment environment and Prisma setup.
// For Prisma with SQLite, the default Node.js runtime is usually required.
// export const runtime = "edge"; // Optional: "nodejs" (default) or "edge"
// Prisma typically requires Node.js runtime. If using Edge, ensure Prisma Client is configured for it.
// For this setup, we'll assume the default Node.js runtime.
