/**
 * useBusinessProfile Hook Tests
 *
 * Q4: Tests for the business profile hook extracted in Q1
 */

import { renderHook, act } from "@testing-library/react";
import { useBusinessProfile } from "@/hooks/useBusinessProfile";
import type { BusinessProfile } from "@/types/business-profile";

/**
 * Creates a test business profile with required defaults
 */
function createTestProfile(overrides: Partial<BusinessProfile>): BusinessProfile {
  return {
    id: "test-id",
    shop_id: "test-shop-id",
    interview_status: "not_started",
    interview_mode: "full",
    current_question_number: 0,
    questions_completed: 0,
    total_questions: 19,
    master_profile_text: null,
    profile_summary: null,
    market_research: null,
    ideal_customer_avatar: null,
    pain_point_strategy: null,
    mission_vision_values: null,
    positioning_statement: null,
    ai_engine_instructions: null,
    business_foundation: null,
    market_positioning: null,
    ideal_customer_profile: null,
    customer_challenges: null,
    business_model: null,
    brand_identity: null,
    strategic_vision: null,
    voice_tone: null,
    voice_style: null,
    voice_vocabulary: null,
    voice_personality: null,
    profile_version: 1,
    is_current: true,
    tokens_used: null,
    generation_time_ms: null,
    generation_tokens_used: null,
    interview_started_at: null,
    interview_completed_at: null,
    profile_generated_at: null,
    last_generated_at: null,
    last_edited_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("useBusinessProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("initial state", () => {
    it("should initialize with default values", () => {
      const { result } = renderHook(() =>
        useBusinessProfile({ shopDomain: "test-shop.myshopify.com" })
      );

      expect(result.current.profile).toBeNull();
      expect(result.current.profileLoading).toBe(true);
      expect(result.current.isGeneratingProfile).toBe(false);
      expect(result.current.isRegenerating).toBe(false);
      expect(result.current.showProfileSuccess).toBe(false);
    });
  });

  describe("loadProfile", () => {
    it("should return null profile when shopDomain is null", async () => {
      const { result } = renderHook(() =>
        useBusinessProfile({ shopDomain: null })
      );

      let loadResult: { profile: any; status: string };
      await act(async () => {
        loadResult = await result.current.loadProfile();
      });

      expect(loadResult!.profile).toBeNull();
      expect(loadResult!.status).toBe("not_started");
      expect(result.current.profileLoading).toBe(false);
    });

    it("should load profile successfully", async () => {
      const mockProfile = {
        id: "123",
        business_name: "Test Business",
        interview_status: "completed",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              profile: mockProfile,
            },
          }),
      });

      const { result } = renderHook(() =>
        useBusinessProfile({ shopDomain: "test-shop.myshopify.com" })
      );

      let loadResult: { profile: any; status: string };
      await act(async () => {
        loadResult = await result.current.loadProfile();
      });

      expect(loadResult!.profile).toEqual(mockProfile);
      expect(loadResult!.status).toBe("completed");
      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.profileLoading).toBe(false);
    });

    it("should handle API error gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() =>
        useBusinessProfile({ shopDomain: "test-shop.myshopify.com" })
      );

      let loadResult: { profile: any; status: string };
      await act(async () => {
        loadResult = await result.current.loadProfile();
      });

      expect(loadResult!.profile).toBeNull();
      expect(loadResult!.status).toBe("not_started");
      expect(result.current.profileLoading).toBe(false);
    });

    it("should handle non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Not found" }),
      });

      const { result } = renderHook(() =>
        useBusinessProfile({ shopDomain: "test-shop.myshopify.com" })
      );

      let loadResult: { profile: any; status: string };
      await act(async () => {
        loadResult = await result.current.loadProfile();
      });

      expect(loadResult!.profile).toBeNull();
      expect(loadResult!.status).toBe("not_started");
    });

    it("should send correct authorization header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { profile: null },
          }),
      });

      const { result } = renderHook(() =>
        useBusinessProfile({ shopDomain: "test-shop.myshopify.com" })
      );

      await act(async () => {
        await result.current.loadProfile();
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/business-profile", {
        headers: {
          Authorization: "Bearer test-shop.myshopify.com",
        },
      });
    });
  });

  describe("generateProfile", () => {
    it("should return null when shopDomain is null", async () => {
      const { result } = renderHook(() =>
        useBusinessProfile({ shopDomain: null })
      );

      let generateResult: any;
      await act(async () => {
        generateResult = await result.current.generateProfile();
      });

      expect(generateResult).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should generate profile successfully", async () => {
      const mockProfile = {
        id: "123",
        business_name: "Test Business",
        target_audience: "Young professionals",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              profile: mockProfile,
            },
          }),
      });

      const { result } = renderHook(() =>
        useBusinessProfile({ shopDomain: "test-shop.myshopify.com" })
      );

      let generateResult: any;
      await act(async () => {
        generateResult = await result.current.generateProfile();
      });

      expect(generateResult).toEqual(mockProfile);
      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.showProfileSuccess).toBe(true);
      expect(result.current.isGeneratingProfile).toBe(false);
    });

    it("should set isGeneratingProfile during generation", async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce({
        ok: true,
        json: () => pendingPromise,
      });

      const { result } = renderHook(() =>
        useBusinessProfile({ shopDomain: "test-shop.myshopify.com" })
      );

      // Start generation but don't await
      act(() => {
        result.current.generateProfile();
      });

      // Check that isGeneratingProfile is true during generation
      expect(result.current.isGeneratingProfile).toBe(true);

      // Complete the generation
      await act(async () => {
        resolvePromise!({
          success: true,
          data: { profile: { id: "123" } },
        });
      });

      expect(result.current.isGeneratingProfile).toBe(false);
    });

    it("should handle generation failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: false,
            error: "Generation failed",
          }),
      });

      const { result } = renderHook(() =>
        useBusinessProfile({ shopDomain: "test-shop.myshopify.com" })
      );

      let generateResult: any;
      await act(async () => {
        generateResult = await result.current.generateProfile();
      });

      expect(generateResult).toBeNull();
      expect(result.current.profile).toBeNull();
    });
  });

  describe("regenerateProfile", () => {
    it("should return null when shopDomain is null", async () => {
      const { result } = renderHook(() =>
        useBusinessProfile({ shopDomain: null })
      );

      let regenerateResult: any;
      await act(async () => {
        regenerateResult = await result.current.regenerateProfile();
      });

      expect(regenerateResult).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should regenerate profile successfully", async () => {
      const mockProfile = {
        id: "456",
        business_name: "Regenerated Business",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              profile: mockProfile,
            },
          }),
      });

      const { result } = renderHook(() =>
        useBusinessProfile({ shopDomain: "test-shop.myshopify.com" })
      );

      let regenerateResult: any;
      await act(async () => {
        regenerateResult = await result.current.regenerateProfile();
      });

      expect(regenerateResult).toEqual(mockProfile);
      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.showProfileSuccess).toBe(true);
    });

    it("should hide success message after 2 seconds", async () => {
      const mockProfile = { id: "456" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { profile: mockProfile },
          }),
      });

      const { result } = renderHook(() =>
        useBusinessProfile({ shopDomain: "test-shop.myshopify.com" })
      );

      await act(async () => {
        await result.current.regenerateProfile();
      });

      expect(result.current.showProfileSuccess).toBe(true);

      // Fast forward 2 seconds
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(result.current.showProfileSuccess).toBe(false);
    });

    it("should set isRegenerating during regeneration", async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce({
        ok: true,
        json: () => pendingPromise,
      });

      const { result } = renderHook(() =>
        useBusinessProfile({ shopDomain: "test-shop.myshopify.com" })
      );

      // Start regeneration but don't await
      act(() => {
        result.current.regenerateProfile();
      });

      expect(result.current.isRegenerating).toBe(true);

      // Complete the regeneration
      await act(async () => {
        resolvePromise!({
          success: true,
          data: { profile: { id: "123" } },
        });
      });

      expect(result.current.isRegenerating).toBe(false);
    });
  });

  describe("setProfile", () => {
    it("should update the profile state", () => {
      const { result } = renderHook(() =>
        useBusinessProfile({ shopDomain: "test-shop.myshopify.com" })
      );

      const newProfile = createTestProfile({
        id: "123",
        interview_status: "completed",
      });

      act(() => {
        result.current.setProfile(newProfile);
      });

      expect(result.current.profile).toEqual(newProfile);
    });

    it("should clear the profile when set to null", () => {
      const { result } = renderHook(() =>
        useBusinessProfile({ shopDomain: "test-shop.myshopify.com" })
      );

      // First set a profile
      act(() => {
        result.current.setProfile(createTestProfile({
          id: "123",
          interview_status: "completed",
        }));
      });

      // Then clear it
      act(() => {
        result.current.setProfile(null);
      });

      expect(result.current.profile).toBeNull();
    });
  });

  describe("setShowProfileSuccess", () => {
    it("should update the showProfileSuccess state", () => {
      const { result } = renderHook(() =>
        useBusinessProfile({ shopDomain: "test-shop.myshopify.com" })
      );

      act(() => {
        result.current.setShowProfileSuccess(true);
      });

      expect(result.current.showProfileSuccess).toBe(true);

      act(() => {
        result.current.setShowProfileSuccess(false);
      });

      expect(result.current.showProfileSuccess).toBe(false);
    });
  });
});
