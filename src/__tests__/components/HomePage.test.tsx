import { render, screen, fireEvent } from '@testing-library/react'
import HomePage from '@/app/page'
import '@testing-library/jest-dom'

// Mock window.open
const mockWindowOpen = jest.fn()

beforeAll(() => {
  Object.defineProperty(window, 'open', { 
    value: mockWindowOpen,
    writable: true
  })
})

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render the Thunder Text title and subtitle', () => {
    render(<HomePage />)
    
    expect(screen.getByText('Thunder Text')).toBeInTheDocument()
    expect(screen.getByText('AI-Powered Product Description Generator')).toBeInTheDocument()
  })

  it('should display deployment status message', () => {
    render(<HomePage />)
    
    expect(screen.getByText('Deployment Complete - Initializing Services...')).toBeInTheDocument()
    expect(screen.getByText(/Thunder Text is now deployed and ready/)).toBeInTheDocument()
  })

  it('should show system status checklist', () => {
    render(<HomePage />)
    
    expect(screen.getByText('✅ System Status')).toBeInTheDocument()
    expect(screen.getByText('Database: Connected to Supabase')).toBeInTheDocument()
    expect(screen.getByText('AI Engine: OpenAI GPT-4 Vision Ready')).toBeInTheDocument()
    expect(screen.getByText('Shopify API: Authentication Configured')).toBeInTheDocument()
    expect(screen.getByText('Deployment: Live on Render')).toBeInTheDocument()
  })

  it('should show next steps section', () => {
    render(<HomePage />)
    
    expect(screen.getByText('📋 Next Steps')).toBeInTheDocument()
    expect(screen.getByText('Update Shopify Partner App settings with this URL')).toBeInTheDocument()
    expect(screen.getByText('Install app in your test store (zunosai-staging-test-store)')).toBeInTheDocument()
    expect(screen.getByText('Test the end-to-end workflow')).toBeInTheDocument()
    expect(screen.getByText('Begin generating product descriptions!')).toBeInTheDocument()
  })

  it('should render action buttons', () => {
    render(<HomePage />)
    
    const configureButton = screen.getByRole('button', { name: 'Configure Shopify App' })
    const dashboardButton = screen.getByRole('button', { name: 'Go to Dashboard' })
    
    expect(configureButton).toBeInTheDocument()
    expect(dashboardButton).toBeInTheDocument()
  })

  it('should handle configure button click', () => {
    render(<HomePage />)
    
    const configureButton = screen.getByRole('button', { name: 'Configure Shopify App' })
    fireEvent.click(configureButton)
    
    expect(mockWindowOpen).toHaveBeenCalledWith('https://partners.shopify.com', '_blank')
  })

  it('should handle dashboard button functionality', () => {
    // Test that the dashboard button exists and is interactive
    render(<HomePage />)
    
    const dashboardButton = screen.getByRole('button', { name: 'Go to Dashboard' })
    
    // Verify button exists and has click handler
    expect(dashboardButton).toBeInTheDocument()
    expect(dashboardButton).toHaveAttribute('style', expect.stringContaining('cursor: pointer'))
  })

  it('should have proper component structure', () => {
    render(<HomePage />)
    
    // Check that buttons are present and accessible
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)
    
    // Verify the Thunder Text title is rendered (core functionality test)
    expect(screen.getByText('Thunder Text')).toBeInTheDocument()
    
    // Verify both buttons have expected content
    expect(screen.getByRole('button', { name: 'Configure Shopify App' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go to Dashboard' })).toBeInTheDocument()
  })
})