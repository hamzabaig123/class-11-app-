'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, AlertTriangle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'

export default function NewImportPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [subjectId, setSubjectId] = useState('')
  const [chapterId, setChapterId] = useState('')
  const [uploading, setUploading] = useState(false)

  const { data: subjects } = trpc.subjects.list.useQuery()
  const { data: chapters } = trpc.chapters.list.useQuery({ subjectId }, { enabled: !!subjectId })

  const createImport = trpc.contentImports.create.useMutation({
    onSuccess: (imp) => {
      toast({ title: 'Import created', description: 'Processing will begin shortly.' })
      router.push(`/dashboard/imports/${imp.id}`)
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      if (selected.size > 50 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Maximum file size is 50MB', variant: 'destructive' })
        return
      }
      setFile(selected)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast({ title: 'Please select a file', variant: 'destructive' })
      return
    }

    setUploading(true)
    try {
      // In a real implementation, upload to private storage first
      // For now, create the import record with a placeholder storage key
      await createImport.mutateAsync({
        originalFilename: file.name,
        storageKey: `imports/${Date.now()}-${file.name}`,
        fileMimeType: file.type,
        fileSizeBytes: file.size,
        subjectId: subjectId || undefined,
        chapterId: chapterId || undefined,
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Import</h1>
        <p className="text-muted-foreground">Upload a PDF or image to extract questions</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Upload File</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center hover:border-burgundy-300 transition-colors">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">
                  {file ? file.name : 'Click to select a file'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, JPG, PNG, or WEBP • Max 50MB
                </p>
              </label>
            </div>

            {file && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <FileText className="h-5 w-5 text-burgundy-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Classification</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Chapter</Label>
              <Select value={chapterId} onValueChange={setChapterId}>
                <SelectTrigger><SelectValue placeholder="Select chapter" /></SelectTrigger>
                <SelectContent>
                  {chapters?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-700">
            AI will attempt to extract questions from your file. All extracted content requires review before publishing.
          </p>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={!file || uploading}>
          {uploading ? 'Creating...' : 'Start Import'}
        </Button>
      </form>
    </div>
  )
}
