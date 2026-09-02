'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
      <TopBar />
      <div className={`transition-all duration-200 ${collapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        <main className="p-4 lg:p-6 pt-20 lg:p-6" id="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}
