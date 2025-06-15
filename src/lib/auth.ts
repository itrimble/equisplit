import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import AppleProvider from "next-auth/providers/apple"
import MicrosoftEntraIDProvider from "next-auth/providers/microsoft-entra-id"
// import EmailProvider from "next-auth/providers/email" // Temporarily disabled
import { prisma } from "./prisma"
import type { UserRole } from "@prisma/client"

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_SECRET!,
    }),
    MicrosoftEntraIDProvider({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenantId: process.env.MICROSOFT_TENANT_ID,
    }),
    // EmailProvider({
    //   server: {
    //     host: process.env.EMAIL_SERVER_HOST,
    //     port: process.env.EMAIL_SERVER_PORT,
    //     auth: {
    //       user: process.env.EMAIL_SERVER_USER,
    //       pass: process.env.EMAIL_SERVER_PASSWORD,
    //     },
    //   },
    //   from: process.env.EMAIL_FROM,
    // }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 15 * 60, // 15 minutes
  },
  jwt: {
    maxAge: 15 * 60, // 15 minutes
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role || UserRole.USER
        token.subscriptionStatus = user.subscriptionStatus
        token.emailVerified = user.emailVerified
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as UserRole
        session.user.subscriptionStatus = token.subscriptionStatus as string
        session.user.emailVerified = token.emailVerified as Date
      }
      return session
    },
    async signIn({ user, account }) {
      // Email verification for email provider
      if (account?.provider === "email") {
        return true // Email verification handled by NextAuth
      }
      
      // For OAuth providers, auto-verify email
      if (user.email && !user.emailVerified) {
        await prisma.user.update({
          where: { email: user.email },
          data: { emailVerified: new Date() },
        })
      }
      
      return true
    },
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
    newUser: "/auth/new-user",
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      console.log(`User ${user.email} signed in via ${account?.provider}`)
      
      // Log authentication event for audit
      if (user.id) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "LOGIN",
            resource: "authentication",
            ipAddress: "", // Will be filled by middleware
            userAgent: "", // Will be filled by middleware
            details: JSON.stringify({
              provider: account?.provider,
              isNewUser,
            }),
            complianceLevel: "STANDARD",
          },
        })
      }
    },
    async signOut({ token }) {
      console.log(`User signed out`)
      
      // Log sign out event
      if (token?.sub) {
        await prisma.auditLog.create({
          data: {
            userId: token.sub,
            action: "LOGOUT",
            resource: "authentication",
            ipAddress: "", // Will be filled by middleware
            userAgent: "", // Will be filled by middleware
            complianceLevel: "STANDARD",
          },
        })
      }
    },
  },
  debug: process.env.NODE_ENV === "development",
})