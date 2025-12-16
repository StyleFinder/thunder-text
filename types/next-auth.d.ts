import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name?: string;
    role: 'admin' | 'coach' | 'shop';
    shopDomain?: string;
    twoFactorEnabled?: boolean;
    hasShopifyLinked?: boolean;
    staffRole?: 'owner' | 'staff';
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      role: 'admin' | 'coach' | 'shop';
      shopDomain?: string;
      twoFactorEnabled?: boolean;
      hasShopifyLinked?: boolean;
      staffRole?: 'owner' | 'staff';
    };
    accessTokenExpired?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'admin' | 'coach' | 'shop';
    shopDomain?: string;
    twoFactorEnabled?: boolean;
    hasShopifyLinked?: boolean;
    staffRole?: 'owner' | 'staff';
    accessTokenIssuedAt?: number;
    accessTokenExpired?: boolean;
  }
}
