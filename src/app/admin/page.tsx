"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, Spinner, InlineStack, Text } from "@shopify/polaris";

/**
 * Admin root page - redirects to BHB Dashboard
 */
export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to BHB Dashboard as default admin page
    router.push("/admin/bhb-dashboard");
  }, [router]);

  return (
    <Box padding="800">
      <InlineStack align="center" blockAlign="center" gap="400">
        <Spinner size="large" />
        <Text as="p" variant="bodyLg">
          Redirecting to BHB Dashboard...
        </Text>
      </InlineStack>
    </Box>
  );
}
