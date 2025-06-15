import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs"; // Using bcryptjs as installed

const prisma = new PrismaClient();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "your@email.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          console.log("Auth Service: Missing credentials");
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          const user = await prisma.user.findUnique({
            where: { email: email }
          });

          if (!user) {
            console.log(`Auth Service: No user found for email: ${email}`);
            return null;
          }

          if (!user.hashedPassword) {
            console.log(`Auth Service: User ${email} has no password set. Cannot authenticate with credentials.`);
            // This case could happen if the user signed up via an OAuth provider
            // and doesn't have a password set locally.
            return null;
          }

          const passwordsMatch = await bcrypt.compare(password, user.hashedPassword);

          if (passwordsMatch) {
            console.log(`Auth Service: User ${email} authenticated successfully.`);
            // Return the user object without the password
            const { hashedPassword, ...userWithoutPassword } = user;
            return userWithoutPassword;
          } else {
            console.log(`Auth Service: Password mismatch for user ${email}.`);
            return null;
          }
        } catch (error) {
          console.error("Auth Service: Error in authorize function:", error);
          return null; // Return null in case of any error
        }
      }
    })
    // Potentially add other providers like Google, GitHub etc. here
    // e.g. GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })
  ],
  session: {
    strategy: "database", // Using database strategy for sessions
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async session({ session, user }) {
      // The `user` object here is the user profile from the database (thanks to database strategy)
      // or the object returned by the `authorize` function.
      if (session.user && user?.id) {
        session.user.id = user.id; // Add user ID to the session object
      }
      return session;
    },
    // Example JWT callback (useful if using JWT strategy or need token manipulation)
    // async jwt({ token, user }) {
    //   if (user) { // User object is available on sign-in
    //     token.id = user.id;
    //   }
    //   return token;
    // },
  },
  pages: {
    signIn: '/login', // Custom sign-in page
    // error: '/auth/error', // Custom error page (optional)
    // newUser: '/auth/new-user' // Optional: page for new users from OAuth if additional info needed
  },
  // The secret is automatically picked up from the AUTH_SECRET environment variable.
  // No need to explicitly set it here if it's in .env (or .env.local).
  // secret: process.env.AUTH_SECRET,
  // TrustHost is true by default, good for various deployment environments.
  // trustHost: true, (already true by default)
  // Debug can be enabled for development
  // debug: process.env.NODE_ENV === 'development',
});
