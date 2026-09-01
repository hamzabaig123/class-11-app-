'use client'

import { useState } from 'react'
import { Plus, Search, LayoutGrid, List, Filter, Pin, PinOff, Archive, Trash2, MoreHorizontal, Play, Edit2, Copy, FolderOpen } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'
import { formatPercentage } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CollectionsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('recent')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newColor, setNewColor] = useState('#8B1A2B')

  const { data, isLoading, refetch } = trpc.collections.list.useQuery({ sort: sort as any, page: 1, pageSize: 50, query: search || undefined })
  const createCollection = trpc.collections.create.useMutation({
    onSuccess: (c) => { refetch(); setShowCreateDialog(false); setNewName(''); setNewDesc(''); router.push(`/collections/${c.id}`); toast({ title: 'Collection created' }) },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })
  const togglePin = trpc.collections.togglePinned.useMutation({ onSuccess: () => refetch() })
  const archiveCollection = trpc.collections.archive.useMutation({ onSuccess: () => { refetch(); toast({ title: 'Collection archived' }) } })
  const deleteCollection = trpc.collections.delete.useMutation({ onSuccess: () => { refetch(); toast({ title: 'Collection deleted' }) } })
  const duplicateCollection = trpc.collections.duplicate.useMutation({ onSuccess: () => { refetch(); toast({ title: 'Collection duplicated' }) } })

  const COLORS = ['#8B1A2B', '#2563EB', '#16A34A', '#9333EA', '#EA580C', '#0891B2', '#DB2777', '#4F46E5']

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
          <p className="text-muted-foreground">Build focused question sets for the way you study</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />New Collection
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search collections..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently Updated</SelectItem>
            <SelectItem value="name">Name A-Z</SelectItem>
            <SelectItem value="questionCount">Most Questions</SelectItem>
            <SelectItem value="accuracy">Highest Accuracy</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1 border rounded-md p-1">
          <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('grid')}><LayoutGrid className="h-4 w-4" /></Button>
          <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('list')}><List className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className={`grid gap-4 ${viewMode === 'grid' ? 'sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><div className="h-32 bg-muted rounded animate-pulse" /></CardContent></Card>
          ))}
        </div>
      ) : !data?.collections || data.collections.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No collections yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Create your first collection to organize questions</p>
          <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />Create Collection
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.collections.map(col => (
            <Card key={col.id} className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/collections/${col.id}`)}>
              <CardContent className="p-0">
                <div className="h-2 rounded-t" style={{ backgroundColor: col.color || '#8B1A2B' }} />
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {col.isPinned && <Pin className="h-3 w-3 text-burgundy-600 shrink-0" />}
                        <h3 className="font-semibold truncate">{col.name}</h3>
                      </div>
                      {col.description && <p className="text-sm text-muted-foreground truncate mt-1">{col.description}</p>}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); togglePin.mutate({ id: col.id }) }}>
                          {col.isPinned ? <><PinOff className="h-4 w-4 mr-2" />Unpin</> : <><Pin className="h-4 w-4 mr-2" />Pin</>}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); duplicateCollection.mutate({ id: col.id, newName: `${col.name} (Copy)`, }) }}>
                          <Copy className="h-4 w-4 mr-2" />Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); archiveCollection.mutate({ id: col.id }) }} className="text-orange-600">
                          <Archive className="h-4 w-4 mr-2" />Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); if (confirm('Delete this collection?')) deleteCollection.mutate({ id: col.id }) }} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-lg font-bold">{col.questionCount}</p>
                      <p className="text-xs text-muted-foreground">Questions</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-lg font-bold">{col.attemptedCount}</p>
                      <p className="text-xs text-muted-foreground">Attempted</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-lg font-bold">{col.accuracy !== null ? `${Math.round(col.accuracy)}%` : '—'}</p>
                      <p className="text-xs text-muted-foreground">Accuracy</p>
                    </div>
                  </div>
                  <Button size="sm" className="w-full" onClick={e => e.stopPropagation()}>
                    <Play className="h-4 w-4 mr-2" />Practice
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {data.collections.map(col => (
            <Card key={col.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => router.push(`/collections/${col.id}`)}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-2 h-12 rounded" style={{ backgroundColor: col.color || '#8B1A2B' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {col.isPinned && <Pin className="h-3 w-3 text-burgundy-600" />}
                    <h3 className="font-semibold truncate">{col.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{col.questionCount} questions · {col.accuracy !== null ? `${Math.round(col.accuracy)}% accuracy` : 'No attempts'}</p>
                </div>
                <Button size="sm" variant="outline" onClick={e => e.stopPropagation()}>
                  <Play className="h-4 w-4 mr-1" />Practice
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="e.g. Algebra Revision" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea placeholder="What's this collection for?" value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button key={c} className={`w-8 h-8 rounded-full border-2 ${newColor === c ? 'border-black scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} onClick={() => setNewColor(c)} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={() => createCollection.mutate({ name: newName, description: newDesc || undefined, color: newColor })} disabled={!newName.trim() || createCollection.isPending}>
              {createCollection.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}