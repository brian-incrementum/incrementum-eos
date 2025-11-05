import { getStatusClasses, type StatusColor } from '@/lib/utils/scorecard-ui-helpers'

interface StatusDotProps {
  status: StatusColor
}

export function StatusDot({ status }: StatusDotProps) {
  const classes = getStatusClasses(status)

  return <div className={`w-3 h-3 rounded-full ${classes.dot}`} />
}
