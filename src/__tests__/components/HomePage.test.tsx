/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
import { render, screen, waitFor } from "@testing-library/react";
import HomePage from "@/app/page";
import "@testing-library/jest-dom";

// Mock next/navigation
const mockReplace = jest.fn();

let mockedSearchParams: Record<string, string | null> = {};

const setSearchParams = (params: Record<string, string | null>) => {
  mockedSearchParams = params;
};

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => mockedSearchParams[key] ?? null,
  }),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe("HomePage (Root Route Handler)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSearchParams({});
    (global.fetch as jest.Mock).mockReset();
  });

  describe("Loading State", () => {
    it("should render loading state with Thunder Text branding", () => {
      render(<HomePage />);

      // The loading state should show the loader text
      expect(screen.getByText("Loading Thunder Text...")).toBeInTheDocument();
    });

    it("should show loading spinner initially", () => {
      render(<HomePage />);

      // Check for loading text
      expect(screen.getByText("Loading Thunder Text...")).toBeInTheDocument();
    });
  });

  describe("Routing Logic", () => {
    it("should redirect to login when no shop parameter is provided", async () => {
      setSearchParams({});

      render(<HomePage />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/auth/login");
      });
    });

    it("should redirect to welcome when shop is not found", async () => {
      setSearchParams({ shop: "test-shop.myshopify.com" });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      render(<HomePage />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          "/welcome?shop=test-shop.myshopify.com",
        );
      });
    });

    it("should redirect to dashboard when onboarding is complete", async () => {
      setSearchParams({ shop: "test-shop.myshopify.com" });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            onboarding_completed: true,
            user_type: "store",
          },
        }),
      });

      render(<HomePage />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          "/dashboard?shop=test-shop.myshopify.com",
        );
      });
    });

    it("should redirect to welcome when onboarding is not complete", async () => {
      setSearchParams({ shop: "test-shop.myshopify.com" });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            onboarding_completed: false,
            user_type: "store",
          },
        }),
      });

      render(<HomePage />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          "/welcome?shop=test-shop.myshopify.com",
        );
      });
    });

    it("should redirect coach users to coach login", async () => {
      setSearchParams({ shop: "coach@example.com" });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            onboarding_completed: true,
            user_type: "coach",
          },
        }),
      });

      render(<HomePage />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/coach/login");
      });
    });
  });

  describe("Error State", () => {
    it("should show error message when API call fails", async () => {
      setSearchParams({ shop: "test-shop.myshopify.com" });
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();
        expect(
          screen.getByText("Failed to load. Please try again."),
        ).toBeInTheDocument();
      });
    });

    it("should have a retry button in error state", async () => {
      setSearchParams({ shop: "test-shop.myshopify.com" });
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      render(<HomePage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /try again/i }),
        ).toBeInTheDocument();
      });
    });

    it("should show Thunder Text branding in error state", async () => {
      setSearchParams({ shop: "test-shop.myshopify.com" });
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText("Thunder Text")).toBeInTheDocument();
      });
    });
  });
});
