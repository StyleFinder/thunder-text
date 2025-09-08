import NextAuth from "next-auth"
import { SupabaseAdapter } from "@next-auth/supabase-adapter"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_KEY!,
  }),
  providers: [
    // Shopify OAuth provider will be configured here
    {
      id: "shopify",
      name: "Shopify",
      type: "oauth",
      authorization: {
        url: "https://shopify.dev/oauth/authorize",
        params: {
          scope: process.env.SHOPIFY_SCOPES,
          response_type: "code",
        },
      },
      token: "https://shopify.dev/oauth/access_token",
      userinfo: "https://shopify.dev/admin/api/2024-01/shop.json",
      clientId: process.env.SHOPIFY_API_KEY,
      clientSecret: process.env.SHOPIFY_API_SECRET,
      profile(profile: any) {
        return {
          id: profile.shop.id,
          name: profile.shop.name,
          email: profile.shop.email,
          image: null,
        }
      },
    },
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
})