/**
 * Loading skeleton for scorecard detail page
 * Provides instant visual feedback while data loads
 */
export default function ScorecardDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-gray-200 rounded" />
          <div className="h-4 w-48 bg-gray-200 rounded" />
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded" />
      </div>

      {/* Stats/Info cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-4 space-y-2">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-6 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* Metrics skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 bg-gray-200 rounded" />
          <div className="h-8 w-24 bg-gray-200 rounded" />
        </div>

        {/* Metric cards */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border rounded-lg p-6 space-y-4">
            {/* Metric header */}
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-5 w-48 bg-gray-200 rounded" />
                <div className="h-4 w-64 bg-gray-200 rounded" />
              </div>
              <div className="h-8 w-8 bg-gray-200 rounded" />
            </div>

            {/* Metric details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="space-y-1">
                  <div className="h-3 w-20 bg-gray-200 rounded" />
                  <div className="h-5 w-16 bg-gray-200 rounded" />
                </div>
              ))}
            </div>

            {/* Entries table skeleton */}
            <div className="space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="border rounded">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center justify-between p-3 border-b last:border-b-0">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                    <div className="h-4 w-16 bg-gray-200 rounded" />
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
