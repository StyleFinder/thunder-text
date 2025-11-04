"use client";

import { ReactNode } from "react";
import { AppProvider, Frame, Navigation, TopBar } from "@shopify/polaris";
import {
  HomeIcon,
  ChartLineIcon,
  PersonIcon,
  SettingsIcon,
} from "@shopify/polaris-icons";
import { usePathname } from "next/navigation";
import enTranslations from "@shopify/polaris/locales/en.json";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();

  const navigationMarkup = (
    <Navigation location="/">
      <Navigation.Section
        items={[
          {
            url: "/admin/bhb-dashboard",
            label: "BHB Dashboard",
            icon: HomeIcon,
            selected: pathname === "/admin/bhb-dashboard",
          },
          {
            url: "/admin/campaign-insights",
            label: "Campaign Insights",
            icon: ChartLineIcon,
            selected: pathname === "/admin/campaign-insights",
            disabled: true, // Coming soon
          },
          {
            url: "/admin/stores",
            label: "Store Management",
            icon: PersonIcon,
            selected: pathname === "/admin/stores",
            disabled: true, // Coming soon
          },
        ]}
      />
      <Navigation.Section
        title="Settings"
        items={[
          {
            url: "/admin/settings",
            label: "Admin Settings",
            icon: SettingsIcon,
            selected: pathname === "/admin/settings",
            disabled: true, // Coming soon
          },
        ]}
      />
    </Navigation>
  );

  // Simplified TopBar without user menu (will add authentication later)
  const topBarMarkup = <TopBar showNavigationToggle />;

  const logo = {
    width: 124,
    topBarSource: "/thunder-text-logo.svg",
    contextualSaveBarSource: "/thunder-text-logo.svg",
    url: "/admin/bhb-dashboard",
    accessibilityLabel: "Thunder Text Admin",
  };

  return (
    <AppProvider i18n={enTranslations}>
      <Frame
        topBar={topBarMarkup}
        navigation={navigationMarkup}
        logo={logo}
        showMobileNavigation={false}
      >
        {children}
      </Frame>
    </AppProvider>
  );
}
