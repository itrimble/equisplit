import { UserRole } from "@prisma/client"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: UserRole
      subscriptionStatus: string
      emailVerified: Date
    } & DefaultSession["user"]
  }

  interface User {
    role: UserRole
    subscriptionStatus: string
    emailVerified: Date
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole
    subscriptionStatus: string
    emailVerified: Date
  }
}