'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Pin, PinOff, Archive, Trash2, BookOpen, FileText, Tag, Clock, MoreHorizontal, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  { id: 'all', name: 'All Notes', icon: BookOpen },
  { id: 'math', name: 'Mathematics', icon: FileText },
  { id: 'physics', name: 'Physics', icon: FileText },
  { id: 'english', name: 'English', icon: FileText },
  { id: 'exam', name: 'Exam Strategy', icon: FileText },
]

export default function NotesPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  const { data: notesData, isLoading, refetch } = trpc.notes.list.useQuery({
    query: search || undefined,
    categoryId: category === 'all' ? undefined : category,
    page: 1,
    pageSize: 50,
  })

  const { data: noteDetail, refetch: refetchDetail } = trpc.notes.get.useQuery(
    { id: selectedNoteId! },
    { enabled: !!selectedNoteId }
  )

  const createNote = trpc.notes.create.useMutation({
    onSuccess: (n) => { refetch(); setSelectedNoteId(n.id); setNoteTitle(n.title); setNoteBody(''); toast({ title: 'Note created' }) },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const updateNote = trpc.notes.update.useMutation({
    onSuccess: () => { refetch(); refetchDetail(); setHasChanges(false); toast({ title: 'Saved' }) },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const autosaveNote = trpc.notes.autosave.useMutation({
    onSuccess: (n) => { if (!selectedNoteId) setSelectedNoteId(n.id); setHasChanges(false) },
  })

  const deleteNote = trpc.notes.delete.useMutation({
    onSuccess: () => { refetch(); setSelectedNoteId(null); toast({ title: 'Note deleted' }) },
  })

  const togglePin = trpc.notes.togglePinned.useMutation({ onSuccess: () => { refetch(); refetchDetail() } })

  // Autosave
  useEffect(() => {
    if (!hasChanges || !selectedNoteId || !noteTitle.trim()) return
    const timer = setTimeout(() => {
      autosaveNote.mutate({ id: selectedNoteId, title: noteTitle, body: noteBody })
    }, 2000)
    return () => clearTimeout(timer)
  }, [hasChanges, selectedNoteId, noteTitle, noteBody])

  // Load note detail
  useEffect(() => {
    if (noteDetail) {
      setNoteTitle(noteDetail.title)
      setNoteBody(noteDetail.body)
      setHasChanges(false)
    }
  }, [noteDetail?.id])

  const handleNewNote = () => {
    createNote.mutate({ title: 'Untitled Note', body: '' })
  }

  const handleSave = () => {
    if (!selectedNoteId) return
    updateNote.mutate({ id: selectedNoteId, title: noteTitle, body: noteBody })
  }

  const notesList = notesData?.notes ?? []
  const currentNote = noteDetail

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-4rem)] flex">
      {/* Category Sidebar */}
      <div className="w-56 border-r bg-card shrink-0 flex flex-col">
        <div className="p-3 border-b">
          <Button size="sm" className="w-full" onClick={handleNewNote}>
            <Plus className="h-4 w-4 mr-2" />New Note
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                category === cat.id ? 'bg-burgundy-100 text-burgundy-700' : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <cat.icon className="h-4 w-4" />
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Note List */}
      <div className="w-80 border-r bg-card shrink-0 flex flex-col">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search notes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}
            </div>
          ) : notesList.length === 0 ? (
            <div className="text-center py-12 px-4">
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No notes yet</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={handleNewNote}>Create Note</Button>
            </div>
          ) : (
            <div className="divide-y">
              {notesList.map(note => (
                <button
                  key={note.id}
                  onClick={() => { setSelectedNoteId(note.id); setNoteTitle(note.title); setNoteBody(note.body); setHasChanges(false) }}
                  className={`w-full text-left p-3 hover:bg-accent/50 transition-colors ${selectedNoteId === note.id ? 'bg-burgundy-50 border-l-2 border-burgundy-600' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{note.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{note.body?.slice(0, 100) || 'Empty note'}</p>
                    </div>
                    {note.isPinned && <Pin className="h-3 w-3 text-burgundy-600 shrink-0 mt-1" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {note.category && <Badge variant="secondary" className="text-[10px]">{note.category.name}</Badge>}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Note Editor */}
      <div className="flex-1 flex flex-col bg-card">
        {!selectedNoteId ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <FileText className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">Select a note or create a new one</p>
              <Button className="mt-3" onClick={handleNewNote}>
                <Plus className="h-4 w-4 mr-2" />New Note
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Editor Header */}
            <div className="border-b px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={noteTitle}
                  onChange={e => { setNoteTitle(e.target.value); setHasChanges(true) }}
                  className="text-xl font-semibold bg-transparent border-none outline-none flex-1"
                  placeholder="Untitled Note"
                />
                {hasChanges && <span className="text-xs text-orange-500">Unsaved changes</span>}
                {!hasChanges && noteDetail && <span className="text-xs text-green-600">Saved</span>}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => togglePin.mutate({ id: selectedNoteId })}>
                  {currentNote?.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                </Button>
                <Button size="sm" onClick={handleSave} disabled={!hasChanges}>
                  Save
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { if (confirm('Delete this note?')) deleteNote.mutate({ id: selectedNoteId }) }} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Editor Body */}
            <div className="flex-1 p-4 overflow-y-auto">
              <textarea
                value={noteBody}
                onChange={e => { setNoteBody(e.target.value); setHasChanges(true) }}
                className="w-full h-full min-h-[400px] bg-transparent border-none outline-none resize-none text-sm leading-relaxed"
                placeholder="Start writing your note..."
              />
            </div>

            {/* Related Questions */}
            {currentNote?.linkedQuestions && currentNote.linkedQuestions.length > 0 && (
              <div className="border-t p-4">
                <h3 className="font-medium text-sm mb-2">Linked Questions ({currentNote.linkedQuestions.length})</h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {currentNote.linkedQuestions.map((q: any) => (
                    <div key={q.id} className="shrink-0 p-2 border rounded-lg bg-muted/50 max-w-[200px]">
                      <p className="text-xs line-clamp-2">{q.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}