'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmployeeCombobox } from '@/components/ui/employee-combobox'
import { updateMetric } from '@/lib/actions/metrics'
import type { Tables } from '@/lib/types/database.types'
import type { EmployeeWithProfile } from '@/lib/actions/employees'

type Metric = Tables<'metrics'>

interface EditMetricModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  metric: Metric | null
  scorecardId: string
  employees: EmployeeWithProfile[]
  currentUserId: string
}

export function EditMetricModal({
  open,
  onOpenChange,
  metric,
  scorecardId,
  employees,
  currentUserId,
}: EditMetricModalProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [cadence, setCadence] = useState<'weekly' | 'monthly' | 'quarterly'>('weekly')
  const [scoringMode, setScoringMode] = useState<'at_least' | 'at_most' | 'between' | 'yes_no'>('at_least')
  const [unit, setUnit] = useState('')
  const [ownerId, setOwnerId] = useState(currentUserId)
  const [targetValue, setTargetValue] = useState('')
  const [targetMin, setTargetMin] = useState('')
  const [targetMax, setTargetMax] = useState('')
  const [targetBoolean, setTargetBoolean] = useState<'true' | 'false'>('true')

  // Populate form when metric changes
  useEffect(() => {
    if (metric) {
      setName(metric.name)
      setCadence(metric.cadence)
      setScoringMode(metric.scoring_mode)
      setUnit(metric.unit || '')
      setOwnerId(metric.owner_user_id || currentUserId)
      setTargetValue(metric.target_value?.toString() || '')
      setTargetMin(metric.target_min?.toString() || '')
      setTargetMax(metric.target_max?.toString() || '')
      setTargetBoolean(metric.target_boolean === null ? 'true' : metric.target_boolean ? 'true' : 'false')
      setError(null)
    }
  }, [metric, currentUserId])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!metric) return

    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updateMetric(metric.id, scorecardId, formData)

      if (result.success) {
        onOpenChange(false)
      } else {
        setError(result.error || 'Failed to update metric')
      }
    })
  }

  if (!metric) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Metric</DialogTitle>
          <DialogDescription>
            Update your metric details and targets.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <label htmlFor="edit-name" className="text-sm font-medium">
                Metric Name *
              </label>
              <input
                id="edit-name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Revenue, Customer Satisfaction"
                required
                minLength={3}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>

            {/* Cadence */}
            <div className="grid gap-2">
              <label htmlFor="edit-cadence" className="text-sm font-medium">
                Cadence *
              </label>
              <select
                id="edit-cadence"
                name="cadence"
                value={cadence}
                onChange={(e) => setCadence(e.target.value as 'weekly' | 'monthly' | 'quarterly')}
                required
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>

            {/* Scoring Mode */}
            <div className="grid gap-2">
              <label htmlFor="edit-scoring_mode" className="text-sm font-medium">
                Scoring Mode *
              </label>
              <select
                id="edit-scoring_mode"
                name="scoring_mode"
                value={scoringMode}
                onChange={(e) => setScoringMode(e.target.value as 'at_least' | 'at_most' | 'between' | 'yes_no')}
                required
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <option value="at_least">At Least (≥)</option>
                <option value="at_most">At Most (≤)</option>
                <option value="between">Between (range)</option>
                <option value="yes_no">Yes/No</option>
              </select>
            </div>

            {/* Unit */}
            <div className="grid gap-2">
              <label htmlFor="edit-unit" className="text-sm font-medium">
                Unit (optional)
              </label>
              <input
                id="edit-unit"
                name="unit"
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g., $, %, count"
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>

            {/* Owner */}
            <div className="grid gap-2">
              <label htmlFor="edit-owner_user_id" className="text-sm font-medium">
                Owner *
              </label>
              <EmployeeCombobox
                employees={employees}
                value={ownerId}
                onValueChange={setOwnerId}
                placeholder="Select owner..."
              />
              <input
                type="hidden"
                name="owner_user_id"
                value={ownerId}
              />
            </div>

            {/* Conditional Target Fields */}
            {scoringMode === 'yes_no' && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  Target *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="target_boolean"
                      value="true"
                      checked={targetBoolean === 'true'}
                      onChange={(e) => setTargetBoolean(e.target.value as 'true' | 'false')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="target_boolean"
                      value="false"
                      checked={targetBoolean === 'false'}
                      onChange={(e) => setTargetBoolean(e.target.value as 'true' | 'false')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">No</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  Select whether &quot;Yes&quot; or &quot;No&quot; is the target outcome for this metric.
                </p>
              </div>
            )}

            {(scoringMode === 'at_least' || scoringMode === 'at_most') && (
              <div className="grid gap-2">
                <label htmlFor="edit-target_value" className="text-sm font-medium">
                  Target Value *
                </label>
                <input
                  id="edit-target_value"
                  name="target_value"
                  type="number"
                  step="any"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="e.g., 10000"
                  required
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>
            )}

            {scoringMode === 'between' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="edit-target_min" className="text-sm font-medium">
                    Target Min *
                  </label>
                  <input
                    id="edit-target_min"
                    name="target_min"
                    type="number"
                    step="any"
                    value={targetMin}
                    onChange={(e) => setTargetMin(e.target.value)}
                    placeholder="e.g., 5000"
                    required
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="edit-target_max" className="text-sm font-medium">
                    Target Max *
                  </label>
                  <input
                    id="edit-target_max"
                    name="target_max"
                    type="number"
                    step="any"
                    value={targetMax}
                    onChange={(e) => setTargetMax(e.target.value)}
                    placeholder="e.g., 15000"
                    required
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-gray-300 bg-white hover:bg-gray-100 h-10 px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
