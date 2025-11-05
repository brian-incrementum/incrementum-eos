import Link from 'next/link'
import type { ScorecardWithDetails } from '@/lib/types/scorecards'

interface ScorecardsTableProps {
  scorecards: ScorecardWithDetails[]
  emptyMessage?: string
}

export function ScorecardsTable({ scorecards, emptyMessage = 'No scorecards found' }: ScorecardsTableProps) {
  if (scorecards.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Scorecard Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Owner
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Team/Role
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Metrics
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {scorecards.map((scorecard) => (
              <tr key={scorecard.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <Link
                    href={`/scorecards/${scorecard.id}`}
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {scorecard.name}
                  </Link>
                </td>
                <td className="px-6 py-4 text-gray-700">
                  {scorecard.owner?.full_name || 'Unknown'}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      scorecard.type === 'team'
                        ? 'bg-blue-100 text-blue-800'
                        : scorecard.type === 'role'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {scorecard.type === 'team'
                      ? 'Team'
                      : scorecard.type === 'role'
                      ? 'Role'
                      : scorecard.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-700">
                  {scorecard.type === 'team' && scorecard.team?.name
                    ? scorecard.team.name
                    : scorecard.type === 'role' && scorecard.role?.name
                    ? scorecard.role.name
                    : '-'}
                </td>
                <td className="px-6 py-4 text-center text-gray-700 font-medium">
                  {scorecard.metric_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
