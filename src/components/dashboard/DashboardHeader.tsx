'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatTimeAgo } from '@/lib/utils'

interface DashboardHeaderProps {
  user: {
    displayName: string
    initials: string
  }
  studyBrief?: string
}

export function DashboardHeader({ user, studyBrief }: DashboardHeaderProps) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user.displayName}
          </p>
        </div>
        <Avatar className="h-10 w-10">
          <AvatarImage src="" alt={user.displayName} />
          <AvatarFallback className="text-lg">{user.initials}</AvatarFallback>
        </Avatar>
      </div>

      {studyBrief && (
        <div className="rounded-lg bg-burgundy-50 p-4 border border-burgundy-100">
          <p className="text-burgundy-800 text-sm leading-relaxed">{studyBrief}</p>
        </div>
      )}
    </div>
  )
}