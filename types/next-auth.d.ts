import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name?: string;
    role: 'admin' | 'coach' | 'shop';
    /** @deprecated Use shopId instead - domain exposed for backward compatibility */
    shopDomain?: string;
    /** UUID of the shop - use this for routing */
    shopId?: string;
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
      /** @deprecated Use shopId instead - domain exposed for backward compatibility */
      shopDomain?: string;
      /** UUID of the shop - use this for routing */
      shopId?: string;
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
    /** @deprecated Use shopId instead */
    shopDomain?: string;
    /** UUID of the shop - use this for routing */
    shopId?: string;
    twoFactorEnabled?: boolean;
    hasShopifyLinked?: boolean;
    staffRole?: 'owner' | 'staff';
    accessTokenIssuedAt?: number;
    accessTokenExpired?: boolean;
  }
}
