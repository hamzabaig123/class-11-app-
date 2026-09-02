'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Plus,
  FolderOpen,
  FileText,
  MoreHorizontal,
  Pencil,
  Archive,
  Trash2,
  RotateCcw,
  GripVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { trpc } from '@/lib/trpc'
import { useState } from 'react'

interface SyllabusNavigatorProps {
  collapsed: boolean
  onNavClick?: () => void
}

export function SyllabusNavigator({ collapsed, onNavClick }: SyllabusNavigatorProps) {
  const pathname = usePathname()
  const { data: subjects, isLoading } = trpc.subjects.list.useQuery({ includeArchived: false })
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())
  const [showCreateSubject, setShowCreateSubject] = useState(false)
  const [showCreateChapter, setShowCreateChapter] = useState<string | null>(null)
  const [editingSubject, setEditingSubject] = useState<{ id: string; name: string; description?: string } | null>(null)

  const toggleSubject = (id: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isSubjectActive = (id: string) => pathname === `/subjects/${id}`
  const isChapterActive = (id: string) => pathname.includes(`/chapters/${id}`)

  if (collapsed) {
    return (
      <div className="px-2 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="w-full"
          onClick={() => setShowCreateSubject(true)}
          aria-label="Create subject"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Syllabus</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setShowCreateSubject(true)}
          aria-label="Create subject"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Subject List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : subjects && subjects.length > 0 ? (
          <div className="space-y-1">
            {subjects.map(subject => (
              <SubjectItem
                key={subject.id}
                subject={subject}
                expanded={expandedSubjects.has(subject.id)}
                onToggle={() => toggleSubject(subject.id)}
                isSubjectActive={isSubjectActive(subject.id)}
                isChapterActive={isChapterActive}
                onEdit={() => setEditingSubject({ id: subject.id, name: subject.name, description: subject.description || undefined })}
                onAddChapter={() => setShowCreateChapter(subject.id)}
                onNavClick={onNavClick}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 px-4">
            <FolderOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No subjects yet</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setShowCreateSubject(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Create your first subject
            </Button>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="border-t p-2 space-y-1">
        <Link
          href="/questions"
          onClick={onNavClick}
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors',
            pathname === '/questions' ? 'bg-burgundy-100 text-burgundy-700' : 'text-muted-foreground hover:bg-accent'
          )}
        >
          <FileText className="h-4 w-4" />
          All Questions
        </Link>
        <Link
          href="/imports"
          onClick={onNavClick}
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors',
            pathname.startsWith('/imports') ? 'bg-burgundy-100 text-burgundy-700' : 'text-muted-foreground hover:bg-accent'
          )}
        >
          <BookOpen className="h-4 w-4" />
          Imports
        </Link>
      </div>

      {/* Create Subject Dialog */}
      <CreateSubjectDialog
        open={showCreateSubject}
        onOpenChange={setShowCreateSubject}
      />

      {/* Edit Subject Dialog */}
      <EditSubjectDialog
        subject={editingSubject}
        onClose={() => setEditingSubject(null)}
      />

      {/* Create Chapter Dialog */}
      <CreateChapterDialog
        subjectId={showCreateChapter}
        onClose={() => setShowCreateChapter(null)}
      />
    </div>
  )
}

interface SubjectItemProps {
  subject: {
    id: string
    name: string
    description?: string | null
    color?: string | null
    _count: { questions: number; chapters: number; sources: number }
    chapters: Array<{
      id: string
      name: string
      chapterNo?: string | null
      _count: { questions: number; sources: number }
    }>
  }
  expanded: boolean
  onToggle: () => void
  isSubjectActive: boolean
  isChapterActive: (id: string) => boolean
  onEdit: () => void
  onAddChapter: () => void
  onNavClick?: () => void
}

function SubjectItem({
  subject,
  expanded,
  onToggle,
  isSubjectActive,
  isChapterActive,
  onEdit,
  onAddChapter,
  onNavClick,
}: SubjectItemProps) {
  const [showMenu, setShowMenu] = useState(false)
  const archiveMutation = trpc.subjects.archive.useMutation({
    onSuccess: () => {
      // Invalidate and refetch
    },
  })

  return (
    <div className="relative group">
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
          isSubjectActive ? 'bg-burgundy-100 text-burgundy-700' : 'hover:bg-accent'
        )}
      >
        <button
          onClick={onToggle}
          className="p-0.5 hover:bg-muted rounded"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: subject.color || '#6b7280' }}
        />
        <Link
          href={`/subjects/${subject.id}`}
          onClick={onNavClick}
          className="flex-1 text-sm font-medium truncate"
        >
          {subject.name}
        </Link>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
          {subject._count.questions}
        </Badge>
        <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-3 w-3 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAddChapter}>
              <Plus className="h-3 w-3 mr-2" />
              Add Chapter
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => archiveMutation.mutate({ id: subject.id })}
              className="text-orange-600"
            >
              <Archive className="h-3 w-3 mr-2" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Chapters */}
      {expanded && (
        <div className="ml-4 mt-1 space-y-0.5">
          {subject.chapters.map(chapter => (
            <div
              key={chapter.id}
              className={cn(
                'flex items-center gap-2 px-2 py-1 rounded-md text-sm transition-colors group/chapter',
                isChapterActive(chapter.id) ? 'bg-burgundy-50 text-burgundy-700' : 'text-muted-foreground hover:bg-accent'
              )}
            >
              <GripVertical className="h-3 w-3 opacity-0 group-hover/chapter:opacity-50 cursor-grab" />
              <Link
                href={`/chapters/${chapter.id}`}
                onClick={onNavClick}
                className="flex-1 truncate"
              >
                {chapter.chapterNo && <span className="text-xs text-muted-foreground mr-1">{chapter.chapterNo}.</span>}
                {chapter.name}
              </Link>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                {chapter._count.questions}
              </Badge>
            </div>
          ))}
          <button
            onClick={onAddChapter}
            className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground hover:text-foreground w-full rounded-md hover:bg-accent"
          >
            <Plus className="h-3 w-3" />
            Add Chapter
          </button>
        </div>
      )}
    </div>
  )
}

interface CreateSubjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CreateSubjectDialog({ open, onOpenChange }: CreateSubjectDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#6b7280')
  const createMutation = trpc.subjects.create.useMutation({
    onSuccess: () => {
      onOpenChange(false)
      setName('')
      setDescription('')
      setColor('#6b7280')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    createMutation.mutate({ name: name.trim(), description: description.trim() || undefined, color })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Subject</DialogTitle>
          <DialogDescription>Add a new subject to your syllabus</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Biology"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-20 h-10"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !name.trim()}>
              {createMutation.isPending ? 'Creating...' : 'Create Subject'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface EditSubjectDialogProps {
  subject: { id: string; name: string; description?: string } | null
  onClose: () => void
}

function EditSubjectDialog({ subject, onClose }: EditSubjectDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  React.useEffect(() => {
    if (subject) {
      setName(subject.name)
      setDescription(subject.description || '')
    }
  }, [subject])

  const updateMutation = trpc.subjects.update.useMutation({
    onSuccess: onClose,
  })

  if (!subject) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({
      id: subject.id,
      name: name.trim(),
      description: description.trim() || undefined,
    })
  }

  return (
    <Dialog open={!!subject} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Subject</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending || !name.trim()}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface CreateChapterDialogProps {
  subjectId: string | null
  onClose: () => void
}

function CreateChapterDialog({ subjectId, onClose }: CreateChapterDialogProps) {
  const [name, setName] = useState('')
  const [chapterNo, setChapterNo] = useState('')
  const [description, setDescription] = useState('')

  const createMutation = trpc.chapters.create.useMutation({
    onSuccess: () => {
      onClose()
      setName('')
      setChapterNo('')
      setDescription('')
    },
  })

  if (!subjectId) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      subjectId,
      name: name.trim(),
      chapterNo: chapterNo.trim() || undefined,
      description: description.trim() || undefined,
    })
  }

  return (
    <Dialog open={!!subjectId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Chapter</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="chapter-name">Name *</Label>
              <Input id="chapter-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="chapter-no">Chapter Number</Label>
              <Input id="chapter-no" value={chapterNo} onChange={(e) => setChapterNo(e.target.value)} placeholder="e.g., 1" />
            </div>
            <div>
              <Label htmlFor="chapter-description">Description</Label>
              <Textarea id="chapter-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || !name.trim()}>
              {createMutation.isPending ? 'Creating...' : 'Create Chapter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
