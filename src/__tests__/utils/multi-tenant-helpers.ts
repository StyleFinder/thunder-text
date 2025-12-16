/**
 * Multi-Tenant Test Helpers
 *
 * Provides utilities for testing tenant isolation - ensuring that
 * data from one shop cannot be accessed by another shop.
 */

import { NextRequest } from "next/server";
import { TENANT_A, TENANT_B, createAuthHeaders } from "./test-constants";

// TenantConfig allows any tenant-like object for testing edge cases
export type TenantConfig = {
  domain: string;
  name: string;
  displayName: string;
};

/**
 * Creates an authenticated request for a specific tenant
 */
export function createTenantRequest(
  tenant: TenantConfig,
  url: string,
  options: {
    method?: string;
    body?: unknown;
  } = {}
): NextRequest {
  const { method = "GET", body } = options;

  const requestInit: RequestInit = {
    method,
    headers: createAuthHeaders(tenant.domain),
  };

  if (body && method !== "GET") {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(url, requestInit as ConstructorParameters<typeof NextRequest>[1]);
}

/**
 * Creates a GET request with shop query param for a specific tenant
 */
export function createTenantGetRequest(
  tenant: TenantConfig,
  baseUrl: string
): NextRequest {
  const url = baseUrl.includes("?")
    ? `${baseUrl}&shop=${tenant.domain}`
    : `${baseUrl}?shop=${tenant.domain}`;

  return new NextRequest(url);
}

/**
 * Test isolation scenario - attempts to access Tenant B's data as Tenant A
 * Returns true if isolation is working (access denied or no data returned)
 */
export interface IsolationTestResult {
  isolated: boolean;
  reason: string;
  tenantAData?: unknown;
  tenantBData?: unknown;
  crossAccessResult?: unknown;
}

/**
 * Creates both tenant requests for parallel testing
 */
export function createBothTenantRequests(
  url: string,
  options: {
    method?: string;
    body?: unknown;
  } = {}
): { tenantA: NextRequest; tenantB: NextRequest } {
  return {
    tenantA: createTenantRequest(TENANT_A, url, options),
    tenantB: createTenantRequest(TENANT_B, url, options),
  };
}

/**
 * Helper to verify that a response only contains data for the requesting tenant
 */
export function verifyTenantDataIsolation<T extends { store_id?: string }>(
  data: T[],
  expectedStoreId: string
): { isolated: boolean; violations: T[] } {
  const violations = data.filter(
    (item) => item.store_id && item.store_id !== expectedStoreId
  );

  return {
    isolated: violations.length === 0,
    violations,
  };
}

/**
 * Standard test assertions for tenant isolation
 */
export const isolationAssertions = {
  /**
   * Assert that Tenant A cannot see Tenant B's data
   */
  assertNoDataLeakage: (
    tenantAResponse: { store_id?: string }[],
    tenantBStoreId: string
  ): void => {
    const hasLeakedData = tenantAResponse.some(
      (item) => item.store_id === tenantBStoreId
    );
    if (hasLeakedData) {
      throw new Error(
        `Data leakage detected: Tenant A can see Tenant B's data (store_id: ${tenantBStoreId})`
      );
    }
  },

  /**
   * Assert that response only contains data for the authenticated tenant
   */
  assertOnlyOwnData: (
    response: { store_id?: string }[],
    ownStoreId: string
  ): void => {
    const foreignData = response.filter(
      (item) => item.store_id && item.store_id !== ownStoreId
    );
    if (foreignData.length > 0) {
      throw new Error(
        `Tenant can see foreign data: ${foreignData.length} items with different store_ids`
      );
    }
  },
};

/**
 * Re-export tenant configs for convenience
 */
export { TENANT_A, TENANT_B };
