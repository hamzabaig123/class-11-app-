'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, Pin, PinOff, Archive, Trash2, BookOpen, FileText, Tag, Clock, MoreHorizontal, ChevronRight, Eye, Edit3, Sparkles, Download, History, Link2, X, Check, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'

type NoteType = 'CONCEPT' | 'SUMMARY' | 'MISTAKE' | 'CHEAT_SHEET'

const NOTE_TYPES: { id: NoteType; label: string; color: string; template: string }[] = [
  { id: 'CONCEPT', label: 'Concept', color: 'bg-blue-100 text-blue-700', template: '# Concept\n\n## Key Points\n\n## Explanation\n\n## Examples\n' },
  { id: 'SUMMARY', label: 'Summary', color: 'bg-green-100 text-green-700', template: '# Summary\n\n## Main Ideas\n\n## Key Takeaways\n' },
  { id: 'MISTAKE', label: 'Mistake Note', color: 'bg-red-100 text-red-700', template: '# Mistake Note\n\n## What I Got Wrong\n\n## Correct Understanding\n\n## How to Avoid This Mistake\n' },
  { id: 'CHEAT_SHEET', label: 'Cheat Sheet', color: 'bg-purple-100 text-purple-700', template: '# Cheat Sheet\n\n## Formulas\n\n## Key Facts\n\n## Quick Reference\n' },
]

export default function NotesPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [noteType, setNoteType] = useState<NoteType>('CONCEPT')
  const [hasChanges, setHasChanges] = useState(false)
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split')
  const [showHistory, setShowHistory] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkSearch, setLinkSearch] = useState('')
  const [fontSize, setFontSize] = useState(14)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: notesData, isLoading, refetch } = trpc.notes.list.useQuery({
    query: search || undefined,
    page: 1, pageSize: 50,
  })

  const { data: noteDetail, refetch: refetchDetail } = trpc.notes.get.useQuery(
    { id: selectedNoteId! },
    { enabled: !!selectedNoteId }
  )

  const { data: questions } = trpc.questions.list.useQuery(
    { search: linkSearch || undefined, limit: 20 },
    { enabled: showLinkDialog }
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

  const linkQuestion = trpc.notes.linkQuestion.useMutation({
    onSuccess: () => { refetchDetail(); toast({ title: 'Question linked' }) },
  })

  const unlinkQuestion = trpc.notes.unlinkQuestion.useMutation({
    onSuccess: () => { refetchDetail(); toast({ title: 'Link removed' }) },
  })

  // Autosave
  useEffect(() => {
    if (!hasChanges || !noteTitle.trim()) return
    const timer = setTimeout(() => {
      autosaveNote.mutate({ id: selectedNoteId || undefined, title: noteTitle, body: noteBody })
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
    const template = NOTE_TYPES.find(t => t.id === noteType)?.template || ''
    createNote.mutate({ title: 'Untitled Note', body: template, bodyFormat: 'MARKDOWN' })
  }

  const handleSave = () => {
    if (!selectedNoteId) return
    updateNote.mutate({ id: selectedNoteId, title: noteTitle, body: noteBody })
  }

  const handleExport = () => {
    const blob = new Blob([`# ${noteTitle}\n\n${noteBody}`], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${noteTitle.replace(/\s+/g, '-').toLowerCase()}.md`
    a.click(); URL.revokeObjectURL(url)
  }

  const renderMarkdown = (md: string) => {
    // Simple markdown renderer
    return md
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-muted px-1 rounded text-sm">$1</code>')
      .replace(/^- (.+)$/gm, '<li class="ml-4">• $1</li>')
      .replace(/\n\n/g, '<br/><br/>')
  }

  const notesList = notesData?.notes ?? []
  const currentNote = noteDetail

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-4rem)] flex">
      {/* Note List Sidebar */}
      <div className="w-80 border-r bg-card shrink-0 flex flex-col">
        <div className="p-3 border-b space-y-2">
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={handleNewNote}>
              <Plus className="h-4 w-4 mr-2" />New Note
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search notes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Filter by type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {NOTE_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
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
                    <Badge variant="secondary" className="text-[10px]">{note.bodyFormat}</Badge>
                    <span className="text-[10px] text-muted-foreground">{new Date(note.updatedAt).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Note Editor / Preview */}
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
            <div className="border-b px-4 py-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <input
                  type="text"
                  value={noteTitle}
                  onChange={e => { setNoteTitle(e.target.value); setHasChanges(true) }}
                  className="text-xl font-semibold bg-transparent border-none outline-none flex-1 min-w-0"
                  placeholder="Untitled Note"
                />
                {hasChanges && <span className="text-xs text-orange-500 shrink-0">Unsaved</span>}
                {!hasChanges && noteDetail && <span className="text-xs text-green-600 shrink-0 flex items-center gap-1"><Check className="h-3 w-3" />Saved</span>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* View Mode Toggle */}
                <div className="flex border rounded-md p-0.5">
                  <Button variant={viewMode === 'edit' ? 'default' : 'ghost'} size="sm" className="h-7" onClick={() => setViewMode('edit')}>
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  <Button variant={viewMode === 'split' ? 'default' : 'ghost'} size="sm" className="h-7" onClick={() => setViewMode('split')}>
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button variant={viewMode === 'preview' ? 'default' : 'ghost'} size="sm" className="h-7" onClick={() => setViewMode('preview')}>
                    <BookOpen className="h-3 w-3" />
                  </Button>
                </div>
                <Button size="sm" variant="outline" onClick={() => togglePin.mutate({ id: selectedNoteId })}>
                  {currentNote?.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowLinkDialog(true)}>
                  <Link2 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowHistory(true)}>
                  <History className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={handleSave} disabled={!hasChanges}>
                  Save
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExport}>
                      <Download className="h-4 w-4 mr-2" />Export Markdown
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      const blob = new Blob([`<!DOCTYPE html><html><head><title>${noteTitle}</title><style>body{font-family:system-ui;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6}</style></head><body><h1>${noteTitle}</h1>${renderMarkdown(noteBody)}</body></html>`], { type: 'text/html' })
                      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${noteTitle}.html`; a.click()
                    }}>
                      <Download className="h-4 w-4 mr-2" />Export as HTML
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { if (confirm('Delete this note?')) deleteNote.mutate({ id: selectedNoteId }) }} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Editor Body */}
            <div className="flex-1 flex overflow-hidden">
              {/* Editor Pane */}
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div className={`flex-1 flex flex-col border-r ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
                  <textarea
                    ref={textareaRef}
                    value={noteBody}
                    onChange={e => { setNoteBody(e.target.value); setHasChanges(true) }}
                    className="flex-1 w-full p-4 bg-transparent border-none outline-none resize-none text-sm leading-relaxed font-mono"
                    placeholder="Start writing in Markdown..."
                    style={{ fontSize: `${fontSize}px` }}
                  />
                  <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{noteBody.split(/\s+/).filter(Boolean).length} words</span>
                    <div className="flex items-center gap-2">
                      <span>Font:</span>
                      <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setFontSize(Math.max(10, fontSize - 1))}>-</Button>
                      <span>{fontSize}</span>
                      <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setFontSize(Math.min(24, fontSize + 1))}>+</Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Pane */}
              {(viewMode === 'preview' || viewMode === 'split') && (
                <div className={`flex-1 overflow-y-auto p-6 ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
                  <div
                    className="prose prose-sm max-w-none"
                    style={{ fontSize: `${fontSize}px` }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(noteBody) }}
                  />
                </div>
              )}
            </div>

            {/* Linked Questions */}
            {currentNote?.linkedQuestions && currentNote.linkedQuestions.length > 0 && (
              <div className="border-t p-4">
                <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Link2 className="h-4 w-4" />Linked Questions ({currentNote.linkedQuestions.length})
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {currentNote.linkedQuestions.map((q: any) => (
                    <div key={q.id} className="shrink-0 p-2 border rounded-lg bg-muted/50 max-w-[200px] group relative">
                      <p className="text-xs line-clamp-2">{q.text}</p>
                      <button
                        onClick={() => unlinkQuestion.mutate({ noteId: selectedNoteId!, questionId: q.id })}
                        className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center"
                      >
                        <X className="h-2 w-2" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Link Question Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Link Question</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Search questions..." value={linkSearch} onChange={e => setLinkSearch(e.target.value)} />
            <div className="max-h-60 overflow-y-auto space-y-2">
              {questions?.questions?.map(q => (
                <button
                  key={q.id}
                  onClick={() => { linkQuestion.mutate({ noteId: selectedNoteId!, questionId: q.id }); }}
                  className="w-full text-left p-2 rounded border hover:bg-accent text-sm"
                >
                  {q.text.slice(0, 80)}...
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Version History</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <div className="p-3 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Version</span>
                <span className="text-xs text-muted-foreground">{new Date().toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{noteTitle}</p>
            </div>
            <div className="text-center text-sm text-muted-foreground py-4">
              <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Previous versions are saved automatically
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
