export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">ACE</h1>
        <p className="text-xl text-gray-600 mb-2">Ad Copy Engine</p>
        <p className="text-sm text-gray-500 mb-8">
          AI-Powered Facebook Ad Generator
        </p>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 max-w-md">
          <p className="text-sm text-gray-700">
            <strong>Phase 3: Frontend Separation</strong>
          </p>
          <p className="text-xs text-gray-600 mt-2">
            ACE app structure created. Ad generation and Facebook integration
            routes will be migrated from the main application.
          </p>
        </div>
      </div>
    </main>
  )
}
