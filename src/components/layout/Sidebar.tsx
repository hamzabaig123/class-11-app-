'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  BookOpen,
  Brain,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FolderOpen,
  FileText,
  Menu,
  X,
  Target,
  Flame,
  Plus,
  Gauge,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { trpc } from '@/lib/trpc'

const primaryNav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Question Library', href: '/questions', icon: BookOpen },
  { name: 'Revision Planner', href: '/revision', icon: Brain },
  { name: 'Practice', href: '/practice/new', icon: Target },
  { name: 'AI Studio', href: '/ai-studio', icon: Sparkles },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Notes', href: '/notes', icon: FileText },
  { name: 'Collections', href: '/collections', icon: FolderOpen },
]

const secondaryNav = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help', href: '/help', icon: HelpCircle },
]

interface SidebarContentProps {
  collapsed: boolean
  onToggleCollapse: () => void
  onNavClick?: () => void
}

function SidebarGoalCard() {
  const router = useRouter()
  const { data: summary } = trpc.dashboard.summary.useQuery()

  const DEFAULT_DAILY_GOAL = 20
  const goal = summary?.settings?.dailyQuestionGoal ?? DEFAULT_DAILY_GOAL
  const todayAttempted = summary?.today?.attemptedCount ?? 0
  const todayStudyMin = Math.floor((summary?.today?.studySeconds ?? 0) / 60)
  const minuteGoal = summary?.settings?.dailyMinuteGoal ?? null

  const progress = Math.min((todayAttempted / Math.max(goal, 1)) * 100, 100)
  const hasSetGoal = !!summary?.settings?.dailyQuestionGoal || !!summary?.settings?.dailyMinuteGoal

  if (!hasSetGoal) {
    return (
      <div
        className="rounded-lg border border-dashed border-burgundy-300/50 bg-burgundy-50 dark:bg-burgundy-900/10 p-3 space-y-2 cursor-pointer hover:bg-burgundy-100/70 transition-colors"
        onClick={() => router.push('/settings?tab=study')}
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-burgundy-600/10">
            <Gauge className="h-4 w-4 text-burgundy-700" />
          </div>
          <div>
            <p className="text-xs font-semibold text-burgundy-700">Set a daily goal</p>
            <p className="text-[11px] text-burgundy-700/80">
              Consistency builds retention.
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="w-full h-7 text-xs">
          <Plus className="h-3 w-3 mr-1.5" />
          Set today's goal
        </Button>
      </div>
    )
  }

  const isComplete = todayAttempted >= goal

  return (
    <div className="rounded-lg bg-muted/50 p-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">Today's Goal</span>
        <span
          className={cn(
            'font-semibold tabular-nums',
            isComplete ? 'text-green-600 dark:text-green-500' : 'text-foreground'
          )}
        >
          {todayAttempted}/{goal}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isComplete ? 'bg-green-500' : 'bg-burgundy-600'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ClockIcon className="h-3 w-3" />
          <span>
            {todayStudyMin}
            {minuteGoal ? `/${minuteGoal}` : ''} min
          </span>
        </div>
        {isComplete ? (
          <span className="text-[10px] font-medium text-green-600 dark:text-green-500 flex items-center gap-1">
            <CheckCircleMiniIcon className="h-3 w-3" />
            Done
          </span>
        ) : (
          <button
            onClick={() => router.push('/practice/new')}
            className="text-[11px] font-medium text-burgundy-700 hover:underline"
          >
            Start practice →
          </button>
        )}
      </div>
    </div>
  )
}

function ClockIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function CheckCircleMiniIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function SidebarContent({ collapsed, onToggleCollapse, onNavClick }: SidebarContentProps) {
  const pathname = usePathname()
  const { data: summary } = trpc.dashboard.summary.useQuery()
  const dueCount = summary?.dueTodayCount ?? 0
  const streak = summary?.studyStreakDays ?? 0

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    if (href === '/practice/new') return pathname.startsWith('/practice')
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center space-x-2" onClick={onNavClick}>
            <div className="h-8 w-8 rounded-lg bg-burgundy-600 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-lg text-foreground">MCQ Master</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', collapsed && 'mx-auto')}
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <div className={cn('text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2', collapsed ? 'sr-only' : 'px-3')}>
          Study
        </div>
        <ul className="space-y-1" role="list">
          {primaryNav.slice(0, 5).map((item) => (
            <li key={item.name}>
              <Tooltip disableHoverableContent={!collapsed} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    onClick={onNavClick}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                      isActive(item.href)
                        ? 'bg-burgundy-100 text-burgundy-700 border-l-3 border-burgundy-600'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      collapsed && 'justify-center px-2'
                    )}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                  >
                    <item.icon className={cn('h-5 w-5 shrink-0', isActive(item.href) && 'text-burgundy-600')} aria-hidden="true" />
                    {!collapsed && <span>{item.name}</span>}
                    {!collapsed && item.name === 'Revision Planner' && dueCount > 0 && (
                      <span className="ml-auto bg-burgundy-600 text-white text-xs rounded-full px-2 py-0.5 font-bold">
                        {dueCount}
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" className="w-max">
                    <p>{item.name}{item.name === 'Revision Planner' && dueCount > 0 ? ` (${dueCount} due)` : ''}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </li>
          ))}
        </ul>

        <div className={cn('text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-2', collapsed ? 'sr-only' : 'px-3')}>
          Workspace
        </div>
        <ul className="space-y-1" role="list">
          {primaryNav.slice(5).map((item) => (
            <li key={item.name}>
              <Tooltip disableHoverableContent={!collapsed} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    onClick={onNavClick}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                      isActive(item.href)
                        ? 'bg-burgundy-100 text-burgundy-700 border-l-3 border-burgundy-600'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      collapsed && 'justify-center px-2'
                    )}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                  >
                    <item.icon className={cn('h-5 w-5 shrink-0', isActive(item.href) && 'text-burgundy-600')} aria-hidden="true" />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" className="w-max">
                    <p>{item.name}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t p-3 space-y-2">
        {/* Mini Daily Goal Card */}
        {!collapsed && <SidebarGoalCard />}

        {/* Streak */}
        {!collapsed && streak > 0 && (
          <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
            <Flame className="h-3 w-3 text-orange-500" />
            <span>{streak} day streak</span>
          </div>
        )}

        {/* Secondary Nav */}
        <ul className="space-y-1">
          {secondaryNav.map((item) => (
            <li key={item.name}>
              <Tooltip disableHoverableContent={!collapsed} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    onClick={onNavClick}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                      isActive(item.href) && 'bg-burgundy-100 text-burgundy-700',
                      collapsed && 'justify-center px-2'
                    )}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                  >
                    <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" className="w-max">
                    <p>{item.name}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

interface SidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({ collapsed = false, onToggleCollapse }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <>
      {/* Desktop Sidebar */}
      <TooltipProvider>
        <aside
          className={cn(
            'fixed left-0 top-0 z-40 h-screen border-r transition-all duration-200 hidden lg:block',
            collapsed ? 'w-16' : 'w-64'
          )}
          aria-label="Main navigation"
        >
          <SidebarContent collapsed={collapsed} onToggleCollapse={onToggleCollapse ?? (() => {})} />
        </aside>
      </TooltipProvider>

      {/* Mobile Menu Button */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden h-10 w-10 bg-card border rounded-lg flex items-center justify-center shadow-sm"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex items-center justify-between p-4 border-b">
            <Link href="/dashboard" className="flex items-center space-x-2" onClick={() => setMobileOpen(false)}>
              <div className="h-8 w-8 rounded-lg bg-burgundy-600 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-lg">MCQ Master</span>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="overflow-y-auto h-[calc(100vh-65px)]">
            <TooltipProvider>
              <SidebarContent collapsed={false} onToggleCollapse={() => {}} onNavClick={() => setMobileOpen(false)} />
            </TooltipProvider>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}