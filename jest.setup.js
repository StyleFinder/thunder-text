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

// Mock Shopify Polaris
jest.mock('@shopify/polaris', () => ({
  AppProvider: ({ children }) => children,
  Page: ({ children, title }) => <div data-testid="page" title={title}>{children}</div>,
  Layout: ({ children }) => <div data-testid="layout">{children}</div>,
  'Layout.Section': ({ children }) => <div data-testid="layout-section">{children}</div>,
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  Button: ({ children, ...props }) => <button data-testid="button" {...props}>{children}</button>,
  Text: ({ children, as: Component = 'span', ...props }) => <Component data-testid="text" {...props}>{children}</Component>,
  Stack: ({ children, vertical }) => <div data-testid="stack" data-vertical={vertical}>{children}</div>,
  'Stack.Item': ({ children }) => <div data-testid="stack-item">{children}</div>,
  TextField: (props) => <input data-testid="text-field" {...props} />,
  Select: ({ options, value, onChange, ...props }) => (
    <select data-testid="select" value={value} onChange={(e) => onChange(e.target.value)} {...props}>
      {options.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  ),
  DropZone: ({ children, onDrop, ...props }) => (
    <div data-testid="drop-zone" {...props}>
      {children}
    </div>
  ),
  'DropZone.FileUpload': () => <div data-testid="file-upload">Drop files here</div>,
  Spinner: ({ size }) => <div data-testid="spinner" data-size={size}>Loading...</div>,
  Banner: ({ children, status, onDismiss }) => (
    <div data-testid="banner" data-status={status}>
      {children}
      {onDismiss && <button onClick={onDismiss}>Dismiss</button>}
    </div>
  ),
  Badge: ({ children }) => <span data-testid="badge">{children}</span>,
  List: ({ children, type }) => {
    const Component = type === 'bullet' ? 'ul' : 'ol'
    return <Component data-testid="list">{children}</Component>
  },
  'List.Item': ({ children }) => <li data-testid="list-item">{children}</li>,
  Modal: ({ children, open, title, onClose, primaryAction, secondaryActions }) => 
    open ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
        {primaryAction && <button onClick={primaryAction.onAction}>{primaryAction.content}</button>}
        {secondaryActions && secondaryActions.map((action, index) => (
          <button key={index} onClick={action.onAction}>{action.content}</button>
        ))}
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
  'Modal.Section': ({ children }) => <div data-testid="modal-section">{children}</div>,
  ResourceList: ({ items, renderItem, emptyState, loading }) => (
    <div data-testid="resource-list">
      {loading && <div>Loading...</div>}
      {!loading && items.length === 0 && emptyState}
      {items.map((item, index) => (
        <div key={index} data-testid="resource-item">
          {renderItem(item)}
        </div>
      ))}
    </div>
  ),
  ResourceItem: ({ children, media, id }) => (
    <div data-testid="resource-item-content" data-id={id}>
      {media && <div data-testid="media">{media}</div>}
      {children}
    </div>
  ),
  Thumbnail: ({ source, alt, size }) => (
    <img data-testid="thumbnail" src={source} alt={alt} data-size={size} />
  ),
  TextContainer: ({ children }) => <div data-testid="text-container">{children}</div>,
}))

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

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      insert: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    })),
  })),
}))

// Mock environment variables
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'https://thunder-text-nine.vercel.app'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_KEY = 'test-service-key'