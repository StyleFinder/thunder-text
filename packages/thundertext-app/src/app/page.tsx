export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">ThunderText</h1>
        <p className="text-xl text-gray-600 mb-8">
          AI-Powered Product Description Generator
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md">
          <p className="text-sm text-gray-700">
            <strong>Phase 3: Frontend Separation</strong>
          </p>
          <p className="text-xs text-gray-600 mt-2">
            ThunderText app structure created. Routes will be migrated from the
            main application.
          </p>
        </div>
      </div>
    </main>
  )
}
