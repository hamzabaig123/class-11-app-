'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, FileText, AlertTriangle, CheckCircle, XCircle, Clock, MoreHorizontal, Play, RotateCcw, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  uploaded: { label: 'Uploaded', color: 'bg-blue-100 text-blue-700', icon: FileText },
  extracting: { label: 'Extracting', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  needs_review: { label: 'Needs Review', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  published: { label: 'Published', color: 'bg-purple-100 text-purple-700', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700', icon: XCircle },
}

export default function ImportsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data, isLoading, refetch } = trpc.contentImports.list.useQuery({
    status: statusFilter === 'all' ? undefined : statusFilter,
    page: 1,
    pageSize: 50,
  })

  const cancelImport = trpc.contentImports.cancel.useMutation({
    onSuccess: () => { refetch(); toast({ title: 'Import cancelled' }) },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const retryImport = trpc.contentImports.retry.useMutation({
    onSuccess: () => { refetch(); toast({ title: 'Retrying...' }) },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const imports = data?.imports ?? []

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Imports</h1>
          <p className="text-muted-foreground">Import questions from PDFs and images</p>
        </div>
        <Button onClick={() => router.push('/dashboard/imports/new')}>
          <Plus className="h-4 w-4 mr-2" />New Import
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search imports..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 bg-muted rounded animate-pulse" />)}
        </div>
      ) : imports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No imports yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Upload a PDF or image to get started</p>
            <Button className="mt-4" onClick={() => router.push('/dashboard/imports/new')}>
              <Plus className="h-4 w-4 mr-2" />New Import
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {imports.map((imp: any) => {
            const statusConfig = STATUS_CONFIG[imp.status] || STATUS_CONFIG.uploaded
            const StatusIcon = statusConfig.icon
            return (
              <Card key={imp.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => router.push(`/dashboard/imports/${imp.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <StatusIcon className="h-5 w-5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{imp.originalFilename}</p>
                          <p className="text-sm text-muted-foreground">
                            {imp.subject?.name} {imp.chapter?.name && `→ ${imp.chapter.name}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="outline" className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                        {imp.detectedItems > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {imp.detectedItems} items detected
                          </span>
                        )}
                        {imp.approvedItems > 0 && (
                          <span className="text-xs text-green-600">
                            {imp.approvedItems} approved
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/imports/${imp.id}`)}>
                        View
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/imports/${imp.id}`)}>
                            View Details
                          </DropdownMenuItem>
                          {imp.status === 'failed' && (
                            <DropdownMenuItem onClick={() => retryImport.mutate({ id: imp.id })}>
                              <RotateCcw className="h-4 w-4 mr-2" />Retry
                            </DropdownMenuItem>
                          )}
                          {['uploaded', 'extracting', 'needs_review'].includes(imp.status) && (
                            <DropdownMenuItem onClick={() => cancelImport.mutate({ id: imp.id })}>
                              <XCircle className="h-4 w-4 mr-2" />Cancel
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
