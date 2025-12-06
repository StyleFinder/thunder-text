import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

// Validate NEXTAUTH_SECRET is set
if (!process.env.NEXTAUTH_SECRET) {
  console.error(
    "❌ CRITICAL: NEXTAUTH_SECRET environment variable is not set!",
  );
  console.error("This is required for NextAuth to function properly.");
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
