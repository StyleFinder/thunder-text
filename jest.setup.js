import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}))

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }) => children,
}))

// Note: @shopify/polaris has been removed from this project
// Polaris components are no longer used - migrated to custom UI components

// Create a mock for the OpenAI chat completions
const mockCreate = jest.fn()

// Mock OpenAI - needs to match the module-level instance usage pattern
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  }
})

// Export the mock for test access
global.mockOpenAICreate = mockCreate

// Don't mock Supabase - integration tests need real connection
// jest.mock('@supabase/supabase-js') is removed to allow real DB connections

// Mock environment variables (if not already set)
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret'
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'https://thunder-text.onrender.com'
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key'
// Don't override Supabase env vars - use real connection from .env.local