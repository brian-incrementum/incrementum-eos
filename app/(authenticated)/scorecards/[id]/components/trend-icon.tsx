import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface TrendIconProps {
  trend: 'up' | 'down' | 'flat'
}

export function TrendIcon({ trend }: TrendIconProps) {
  if (trend === 'up') {
    return <TrendingUp className="w-4 h-4 text-green-600" />
  }

  if (trend === 'down') {
    return <TrendingDown className="w-4 h-4 text-red-600" />
  }

  return <Minus className="w-4 h-4 text-gray-400" />
}
