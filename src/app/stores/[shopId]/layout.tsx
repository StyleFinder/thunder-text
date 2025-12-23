import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { supabaseAdmin } from "@/lib/supabase";
import { ShopProvider } from "./ShopContext";

/**
 * Shop Layout for /stores/[shopId]/* routes
 *
 * This layout:
 * 1. Validates the shopId exists in the database
 * 2. Verifies the user has access to this shop
 * 3. Fetches the shop domain for backward compatibility
 * 4. Provides shop context to all child pages via ShopProvider
 */

interface ShopLayoutProps {
  children: React.ReactNode;
  params: Promise<{ shopId: string }>;
}

export default async function ShopLayout({ children, params }: ShopLayoutProps) {
  const { shopId } = await params;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(shopId)) {
    notFound();
  }

  // Get session
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login");
  }

  let shopDomain: string | null = null;

  // For shop users, verify they can only access their own shop
  if (session.user.role === "shop") {
    if (session.user.id !== shopId) {
      // Redirect to their own shop
      redirect(`/stores/${session.user.id}/dashboard`);
    }
    // Shop user's domain is in their session
    shopDomain = session.user.shopDomain || null;
  }

  // For admin/coach users, verify shop exists and fetch domain
  if (session.user.role === "admin" || session.user.role === "coach") {
    const { data: shop, error } = await supabaseAdmin
      .from("shops")
      .select("id, shop_domain")
      .eq("id", shopId)
      .single();

    if (error || !shop) {
      notFound();
    }
    shopDomain = shop.shop_domain;
  }

  // ALWAYS verify the shop exists in the database and fetch domain
  // This handles cases where:
  // 1. Session shopDomain is stale/undefined (e.g., after OAuth updates the DB but not the session)
  // 2. The shop record was merged/deleted during OAuth (session points to deleted record)
  const { data: dbShop, error: dbError } = await supabaseAdmin
    .from("shops")
    .select("shop_domain")
    .eq("id", shopId)
    .single();

  if (dbError || !dbShop) {
    // Shop doesn't exist - likely merged into another record during OAuth
    // Redirect to login to get a fresh session
    redirect("/auth/login?error=session_expired");
  }

  // Use database value as source of truth (more recent than session)
  shopDomain = dbShop.shop_domain || null;

  // Shop context is now validated - render children with context
  return (
    <ShopProvider shopId={shopId} shopDomain={shopDomain}>
      {children}
    </ShopProvider>
  );
}
