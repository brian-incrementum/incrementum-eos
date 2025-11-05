import Link from 'next/link'
import type { Tables } from '@/lib/types/database.types'

type Scorecard = Tables<'scorecards'>

interface ScorecardHeaderProps {
  scorecard: Scorecard
}

export function ScorecardHeader({ scorecard }: ScorecardHeaderProps) {
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'personal':
        return 'bg-blue-100 text-blue-800'
      case 'team':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const createdDate = new Date(scorecard.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="mb-8">
      {/* Breadcrumb */}
      <nav className="flex mb-4" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <Link
              href="/scorecards"
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Scorecards
            </Link>
          </li>
          <li>
            <span className="text-gray-400 text-sm">›</span>
          </li>
          <li>
            <span className="text-gray-900 text-sm font-medium">
              {scorecard.name}
            </span>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {scorecard.name}
            </h1>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(scorecard.type)}`}
              >
                {scorecard.type}
              </span>
              <span className="text-sm text-gray-500">Created {createdDate}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
