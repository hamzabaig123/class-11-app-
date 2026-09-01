import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function formatTimeAgo(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return then.toLocaleDateString()
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ${secs % 60}s`
  const hours = Math.floor(mins / 60)
  return `${hours}h ${mins % 60}m`
}

export function formatPercentage(value: number | null, fallback = '—'): string {
  if (value === null || value === undefined) return fallback
  return `${Math.round(value)}%`
}

export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'EASY': return 'text-green-600 bg-green-100'
    case 'MEDIUM': return 'text-yellow-600 bg-yellow-100'
    case 'HARD': return 'text-red-600 bg-red-100'
    default: return 'text-gray-600 bg-gray-100'
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'text-green-600 bg-green-100'
    case 'ARCHIVED': return 'text-gray-600 bg-gray-100'
    case 'FLAGGED': return 'text-orange-600 bg-orange-100'
    case 'MASTERED': return 'text-purple-600 bg-purple-100'
    case 'LEARNING': return 'text-blue-600 bg-blue-100'
    case 'REVIEW': return 'text-indigo-600 bg-indigo-100'
    case 'LAPSED': return 'text-red-600 bg-red-100'
    default: return 'text-gray-600 bg-gray-100'
  }
}

export function getUserTimezone(userId: string): Promise<string> {
  // This will be replaced by the actual implementation in the router
  return Promise.resolve('UTC')
}