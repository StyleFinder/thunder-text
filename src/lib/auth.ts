import NextAuth from "next-auth"
import { SupabaseAdapter } from "@next-auth/supabase-adapter"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    secret: process.env.SUPABASE_SERVICE_KEY || 'placeholder-service-key',
  }),
  providers: [
    // Shopify OAuth provider will be configured here
    {
      id: "shopify",
      name: "Shopify",
      type: "oauth",
      authorization: {
        url: `https://${process.env.SHOPIFY_TEST_STORE}.myshopify.com/admin/oauth/authorize`,
        params: {
          scope: process.env.SHOPIFY_SCOPES,
          response_type: "code",
        },
      },
      checks: ["state"],
      token: `https://${process.env.SHOPIFY_TEST_STORE}.myshopify.com/admin/oauth/access_token`,
      userinfo: `https://${process.env.SHOPIFY_TEST_STORE}.myshopify.com/admin/api/2024-01/shop.json`,
      clientId: process.env.SHOPIFY_API_KEY,
      clientSecret: process.env.SHOPIFY_API_SECRET,
      profile(profile: any) {
        return {
          id: profile.shop?.id || profile.id,
          name: profile.shop?.name || profile.name,
          email: profile.shop?.email || profile.email,
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