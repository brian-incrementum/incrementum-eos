'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmployeeCombobox } from '@/components/ui/employee-combobox'
import { createMetric } from '@/lib/actions/metrics'
import type { EmployeeWithProfile } from '@/lib/actions/employees'

interface AddMetricModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scorecardId: string
  employees: EmployeeWithProfile[]
  currentUserId: string
}

export function AddMetricModal({
  open,
  onOpenChange,
  scorecardId,
  employees,
  currentUserId,
}: AddMetricModalProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cadence, setCadence] = useState<'weekly' | 'monthly' | 'quarterly'>('weekly')
  const [scoringMode, setScoringMode] = useState<'at_least' | 'at_most' | 'between' | 'yes_no'>('at_least')
  const [unit, setUnit] = useState('')
  const [ownerId, setOwnerId] = useState(currentUserId)
  const [targetValue, setTargetValue] = useState('')
  const [targetMin, setTargetMin] = useState('')
  const [targetMax, setTargetMax] = useState('')
  const [targetBoolean, setTargetBoolean] = useState<'true' | 'false'>('true')

  const resetForm = () => {
    setName('')
    setDescription('')
    setCadence('weekly')
    setScoringMode('at_least')
    setUnit('')
    setOwnerId(currentUserId)
    setTargetValue('')
    setTargetMin('')
    setTargetMax('')
    setTargetBoolean('true')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createMetric(scorecardId, formData)

      if (result.success) {
        resetForm()
        onOpenChange(false)
      } else {
        setError(result.error || 'Failed to create metric')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add New Metric</DialogTitle>
          <DialogDescription>
            Create a new metric to track in your scorecard.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Metric Name *
              </label>
              <input
                id="name"
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

            {/* Description */}
            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description (optional)
              </label>
              <textarea
                id="description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this metric measures and why it's important"
                rows={3}
                className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 resize-none"
              />
            </div>

            {/* Cadence */}
            <div className="grid gap-2">
              <label htmlFor="cadence" className="text-sm font-medium">
                Cadence *
              </label>
              <select
                id="cadence"
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
              <label htmlFor="scoring_mode" className="text-sm font-medium">
                Scoring Mode *
              </label>
              <select
                id="scoring_mode"
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
              <label htmlFor="unit" className="text-sm font-medium">
                Unit (optional)
              </label>
              <select
                id="unit"
                name="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <option value="">None</option>
                <option value="$">$ (Dollar)</option>
                <option value="%">% (Percentage)</option>
                <option value="#"># (Count)</option>
              </select>
            </div>

            {/* Owner */}
            <div className="grid gap-2">
              <label htmlFor="owner_user_id" className="text-sm font-medium">
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
                <label htmlFor="target_value" className="text-sm font-medium">
                  Target Value *
                </label>
                <input
                  id="target_value"
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
                  <label htmlFor="target_min" className="text-sm font-medium">
                    Target Min *
                  </label>
                  <input
                    id="target_min"
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
                  <label htmlFor="target_max" className="text-sm font-medium">
                    Target Max *
                  </label>
                  <input
                    id="target_max"
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
              {isPending ? 'Creating...' : 'Create Metric'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
