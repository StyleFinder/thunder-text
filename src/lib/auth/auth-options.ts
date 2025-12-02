import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { supabaseAdmin } from '@/lib/supabase/admin';
import bcrypt from 'bcrypt';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        userType: { label: 'User Type', type: 'text' } // 'shop' | 'coach'
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Check user type: admin, coach, or shop
        if (credentials.userType === 'admin') {
          // Lookup in super_admins table
          const { data: admin, error } = await supabaseAdmin
            .from('super_admins')
            .select('*')
            .eq('email', credentials.email)
            .eq('is_active', true)
            .single();

          if (error || !admin) {
            return null;
          }

          const isValid = await bcrypt.compare(credentials.password, admin.password_hash);
          if (!isValid) {
            return null;
          }

          return {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: 'admin'
          };
        } else if (credentials.userType === 'coach') {
          // Lookup in coaches table
          const { data: coach, error } = await supabaseAdmin
            .from('coaches')
            .select('*')
            .eq('email', credentials.email)
            .eq('is_active', true)
            .single();

          if (error || !coach || !coach.password_hash) {
            return null;
          }

          const isValid = await bcrypt.compare(credentials.password, coach.password_hash);
          if (!isValid) {
            return null;
          }

          return {
            id: coach.id,
            email: coach.email,
            name: coach.name,
            role: 'coach'
          };
        } else {
          // Lookup in shops table (standalone users)
          const { data: shop, error } = await supabaseAdmin
            .from('shops')
            .select('*')
            .eq('email', credentials.email)
            .eq('shop_type', 'standalone')
            .eq('is_active', true)
            .single();

          if (error || !shop || !shop.password_hash) {
            return null;
          }

          const isValid = await bcrypt.compare(credentials.password, shop.password_hash);
          if (!isValid) {
            return null;
          }

          return {
            id: shop.id,
            email: shop.email,
            name: shop.display_name || shop.store_name || shop.shop_domain,
            role: 'user',
            shopDomain: shop.shop_domain
          };
        }
      }
    })
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.shopDomain = user.shopDomain;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.shopDomain = token.shopDomain;
      }
      return session;
    }
  },

  pages: {
    signIn: '/auth/login',
    error: '/auth/error'
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },

  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },

  secret: process.env.NEXTAUTH_SECRET
};
