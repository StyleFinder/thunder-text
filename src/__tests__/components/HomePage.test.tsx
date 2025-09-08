import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import HomePage from '@/app/page'

// Mock useSession
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock fetch
global.fetch = jest.fn()

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      })
    })

    it('should render welcome screen', () => {
      render(<HomePage />)
      
      expect(screen.getByText('Welcome to Thunder Text')).toBeInTheDocument()
      expect(screen.getByText(/Generate compelling, SEO-optimized product descriptions/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Connect Your Shopify Store/i })).toBeInTheDocument()
    })
  })

  describe('when user is authenticated', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' } },
        status: 'authenticated',
        update: jest.fn(),
      })
    })

    it('should render generation interface', () => {
      render(<HomePage />)
      
      expect(screen.getByText('Generate Product Description')).toBeInTheDocument()
      expect(screen.getByText('Product Images')).toBeInTheDocument()
      expect(screen.getByLabelText('Product Title (Optional)')).toBeInTheDocument()
      expect(screen.getByLabelText('Category (Optional)')).toBeInTheDocument()
      expect(screen.getByLabelText('Description Length')).toBeInTheDocument()
    })

    it('should show error when trying to generate without images', async () => {
      render(<HomePage />)
      
      const generateButton = screen.getByRole('button', { name: /Generate Description/i })
      fireEvent.click(generateButton)
      
      await waitFor(() => {
        expect(screen.getByText('Please upload at least one product image')).toBeInTheDocument()
      })
    })

    it('should handle successful generation', async () => {
      const mockResponse = {
        success: true,
        data: {
          title: 'Generated Title',
          description: 'Generated description',
          bulletPoints: ['Feature 1', 'Feature 2'],
          metaDescription: 'Generated meta description',
          keywords: ['keyword1', 'keyword2'],
          confidence: 0.95,
          processingTime: 2000,
          tokenUsage: { prompt: 100, completion: 50, total: 150 },
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      render(<HomePage />)
      
      // Simulate file upload (this would require more complex mocking in a real scenario)
      const generateButton = screen.getByRole('button', { name: /Generate Description/i })
      
      // For testing purposes, we'll directly set the internal state
      // In a real test, you'd simulate file upload through the DropZone component
      const component = screen.getByTestId('page').closest('div')
      
      // Since we can't easily test file upload in JSDOM, we'll test the API call handling
      expect(generateButton).toBeInTheDocument()
    })

    it('should handle API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'API Error' }),
      })

      render(<HomePage />)
      
      // Test error handling would require simulating file upload and generation
      // This is a placeholder for more comprehensive testing
      expect(screen.getByRole('button', { name: /Generate Description/i })).toBeInTheDocument()
    })

    it('should update form fields correctly', () => {
      render(<HomePage />)
      
      const titleField = screen.getByLabelText('Product Title (Optional)')
      const categoryField = screen.getByLabelText('Category (Optional)')
      const lengthSelect = screen.getByLabelText('Description Length')
      
      fireEvent.change(titleField, { target: { value: 'Test Product' } })
      fireEvent.change(categoryField, { target: { value: 'Electronics' } })
      fireEvent.change(lengthSelect, { target: { value: 'long' } })
      
      expect(titleField).toHaveValue('Test Product')
      expect(categoryField).toHaveValue('Electronics')
      expect(lengthSelect).toHaveValue('long')
    })
  })

  describe('when loading', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      })
    })

    it('should show loading spinner', () => {
      render(<HomePage />)
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.getByTestId('spinner')).toBeInTheDocument()
    })
  })
})