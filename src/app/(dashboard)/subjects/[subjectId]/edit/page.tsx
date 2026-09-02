'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Archive, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'
import Link from 'next/link'

export default function EditSubjectPage() {
  const params = useParams()
  const router = useRouter()
  const subjectId = params.subjectId as string

  const { data: subject, isLoading } = trpc.subjects.get.useQuery({ id: subjectId })
  const [name, setName] = useState(subject?.name || '')
  const [description, setDescription] = useState(subject?.description || '')
  const [color, setColor] = useState(subject?.color || '#6b7280')

  const updateMutation = trpc.subjects.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Subject updated' })
      router.push(`/subjects/${subjectId}`)
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const archiveMutation = trpc.subjects.archive.useMutation({
    onSuccess: () => {
      toast({ title: 'Subject archived' })
      router.push('/subjects')
    },
  })

  const deleteMutation = trpc.subjects.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Subject deleted' })
      router.push('/subjects')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    updateMutation.mutate({
      id: subjectId,
      name: name.trim(),
      description: description.trim() || undefined,
      color,
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  if (!subject) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Subject not found</h2>
        <Button asChild className="mt-4">
          <Link href="/subjects">Back to Subjects</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/subjects/${subjectId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Subject</h1>
          <p className="text-muted-foreground">Update subject details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Subject Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Biology"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-20 h-10"
                />
                <span className="text-sm text-muted-foreground">Choose a color for this subject</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between mt-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (confirm('Archive this subject?')) {
                  archiveMutation.mutate({ id: subjectId })
                }
              }}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (confirm(`Delete "${subject.name}"? This cannot be undone.`)) {
                  deleteMutation.mutate({ id: subjectId, permanent: true, confirmationName: subject.name })
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" asChild>
              <Link href={`/subjects/${subjectId}`}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={updateMutation.isPending || !name.trim()}>
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
