/**
 * Settings Feature Types
 */

export interface Invitation {
  id: string;
  invited_email: string;
  invited_name: string | null;
  status: "pending" | "accepted" | "expired" | "revoked";
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

export interface InvitationLimits {
  used: number;
  limit: number;
  canInvite: boolean;
}

export interface ShopInfo {
  id: string;
  shop_domain: string;
  created_at: string;
  updated_at: string;
}

export interface LlmsSettings {
  include_products: boolean;
  include_collections: boolean;
  include_blog_posts: boolean;
  sync_schedule: "none" | "daily" | "weekly";
  last_generated_at: string | null;
  next_sync_at: string | null;
  last_product_count: number;
}

// Aggregate export for convenient import
export type SettingsTypes = {
  Invitation: Invitation;
  InvitationLimits: InvitationLimits;
  ShopInfo: ShopInfo;
  LlmsSettings: LlmsSettings;
};
