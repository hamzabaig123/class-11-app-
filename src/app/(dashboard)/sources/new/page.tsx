'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'
import Link from 'next/link'

const SOURCE_TYPES = ['TEXTBOOK', 'PDF', 'DOCX', 'IMAGE', 'WEB', 'PAST_PAPER', 'NOTE'] as const

export default function NewSourcePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [sourceType, setSourceType] = useState<string>('TEXTBOOK')
  const [author, setAuthor] = useState('')
  const [edition, setEdition] = useState('')
  const [publisher, setPublisher] = useState('')
  const [year, setYear] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [extractedText, setExtractedText] = useState('')

  const createMutation = trpc.sources.create.useMutation({
    onSuccess: (source) => {
      toast({ title: 'Source created', description: `"${source.title}" has been added.` })
      router.push(`/sources/${source.id}`)
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    createMutation.mutate({
      title: title.trim(),
      sourceType,
      author: author.trim() || undefined,
      edition: edition.trim() || undefined,
      publisher: publisher.trim() || undefined,
      year: year ? parseInt(year) : undefined,
      externalUrl: externalUrl.trim() || undefined,
      extractedText: extractedText.trim() || undefined,
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/sources">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Source</h1>
          <p className="text-muted-foreground">Add a new source document</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Source Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Biology Textbook Grade 11"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sourceType">Type</Label>
                <Select value={sourceType} onValueChange={setSourceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g., 2024"
                  type="number"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g., John Smith"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edition">Edition</Label>
                <Input
                  id="edition"
                  value={edition}
                  onChange={(e) => setEdition(e.target.value)}
                  placeholder="e.g., 3rd Edition"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publisher">Publisher</Label>
                <Input
                  id="publisher"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  placeholder="e.g., Oxford University Press"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="externalUrl">External URL</Label>
              <Input
                id="externalUrl"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extractedText">Extracted Text</Label>
              <Textarea
                id="extractedText"
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                placeholder="Paste or enter extracted text from this source..."
                rows={6}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/sources">Cancel</Link>
          </Button>
          <Button type="submit" disabled={createMutation.isPending || !title.trim()}>
            {createMutation.isPending ? 'Creating...' : 'Create Source'}
          </Button>
        </div>
      </form>
    </div>
  )
}
