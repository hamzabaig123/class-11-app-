'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { formatPercentage } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: string
  trendUp?: boolean
  emptyText?: string
  onClick?: () => void
  className?: string
  loading?: boolean
}

export function MetricCard({
  title,
  value,
  icon,
  trend,
  trendUp,
  emptyText,
  onClick,
  className,
  loading,
}: MetricCardProps) {
  return (
    <Card 
      className={cn(
        'transition-all hover:shadow-md',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <div className="h-10 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-3xl font-bold tracking-tight">{value}</p>
            )}
            {emptyText && !loading && (
              <p className="text-xs text-muted-foreground">{emptyText}</p>
            )}
          </div>
          <div className="p-3 rounded-lg bg-burgundy-50 text-burgundy-600">
            {icon}
          </div>
        </div>
        {trend && !loading && (
          <div className={cn('mt-2 flex items-center gap-1 text-xs', trendUp ? 'text-green-600' : 'text-red-600')}>
            {trendUp ? '↑' : '↓'} {trend}
          </div>
        )}
      </CardContent>
    </Card>
  )
}