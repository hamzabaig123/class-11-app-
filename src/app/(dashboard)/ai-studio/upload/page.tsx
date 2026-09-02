'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Upload, FileText, Image, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc'

const ACCEPTED_TYPES = {
  document: ['.pdf', '.docx', '.txt'],
  image: ['.png', '.jpg', '.jpeg', '.gif', '.bmp'],
  all: ['.pdf', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.csv', '.json'],
}

const ACCEPTED_MIME = {
  document: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
  image: ['image/png', 'image/jpeg', 'image/gif', 'image/bmp'],
  all: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/bmp',
    'text/csv',
    'application/json',
  ],
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

interface UploadedFile {
  file: File
  preview?: string
  error?: string
}

export default function UploadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = (searchParams.get('type') as 'document' | 'image' | 'all') || 'all'

  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createImport = trpc.imports.create.useMutation({
    onSuccess: (data) => {
      router.push(`/ai-studio/review/${data.id}`)
    },
    onError: (err) => {
      setError(err.message)
      setUploading(false)
    },
  })

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    const acceptedExts = ACCEPTED_TYPES[type] || ACCEPTED_TYPES.all
    const acceptedMimes = ACCEPTED_MIME[type] || ACCEPTED_MIME.all

    if (!acceptedExts.includes(ext) && !acceptedMimes.includes(file.type)) {
      return `File type ${ext} is not supported`
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 50MB limit`
    }

    return null
  }

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    setError(null)
    const fileArray = Array.from(newFiles)
    const validatedFiles: UploadedFile[] = []

    for (const file of fileArray) {
      const validationError = validateFile(file)
      validatedFiles.push({
        file,
        error: validationError || undefined,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      })
    }

    setFiles((prev) => [...prev, ...validatedFiles])
  }, [type])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev]
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!)
      }
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const extractTextFromFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        resolve(text || '')
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        reader.readAsText(file)
      } else {
        // For PDF/DOCX, we'd need client-side libraries
        // For now, show a message
        reject(new Error('Only .txt files supported in browser upload. Use API for PDF/DOCX.'))
      }
    })
  }

  const handleUpload = async () => {
    const validFiles = files.filter((f) => !f.error)
    if (validFiles.length === 0) {
      setError('Please select at least one valid file')
      return
    }

    setUploading(true)
    setError(null)

    try {
      for (const uploadedFile of validFiles) {
        const file = uploadedFile.file
        
        // Extract text for TXT files client-side
        if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          const text = await extractTextFromFile(file)
          await createImport.mutateAsync({
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type || 'text/plain',
            sourceType: 'txt',
            text,
          })
        } else {
          // For PDF/DOCX - in production would upload to S3 then process
          // For now, register the import and process server-side
          await createImport.mutateAsync({
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type || file.name.split('.').pop() || 'unknown',
            sourceType: file.name.endsWith('.pdf') ? 'pdf' : 
                       file.name.endsWith('.docx') ? 'docx' : 'txt',
          })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setUploading(false)
    }
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp'].includes(ext || '')) {
      return <Image className="h-5 w-5 text-blue-500" />
    }
    return <FileText className="h-5 w-5 text-orange-500" />
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Files</h1>
        <p className="text-muted-foreground">
          {type === 'document' && 'Upload PDF, DOCX, or TXT files to import questions'}
          {type === 'image' && 'Upload images to extract questions using OCR'}
          {type === 'all' && 'Upload any supported file type to import questions'}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium">Drag & drop files here</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              or click to browse
            </p>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              multiple
              accept={(ACCEPTED_TYPES[type] || ACCEPTED_TYPES.all).join(',')}
              onChange={handleFileInput}
            />
            <Button asChild variant="outline">
              <label htmlFor="file-upload" className="cursor-pointer">
                Select Files
              </label>
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Max file size: 50MB •{' '}
              {(ACCEPTED_TYPES[type] || ACCEPTED_TYPES.all).join(', ')}
            </p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Files ({files.length})</CardTitle>
            <CardDescription>
              Review your files before uploading
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {files.map((uploadedFile, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    uploadedFile.error ? 'border-destructive bg-destructive/5' : 'border-muted'
                  }`}
                >
                  {uploadedFile.preview ? (
                    <img
                      src={uploadedFile.preview}
                      alt={uploadedFile.file.name}
                      className="h-10 w-10 object-cover rounded"
                    />
                  ) : (
                    getFileIcon(uploadedFile.file.name)
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{uploadedFile.file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {uploadedFile.error && (
                      <p className="text-sm text-destructive">{uploadedFile.error}</p>
                    )}
                  </div>
                  {uploadedFile.error ? (
                    <Badge variant="destructive">Error</Badge>
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                onClick={handleUpload}
                disabled={uploading || files.filter((f) => !f.error).length === 0}
                className="flex-1"
              >
                {uploading ? 'Uploading...' : `Upload ${files.filter((f) => !f.error).length} file(s)`}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  files.forEach((f) => {
                    if (f.preview) URL.revokeObjectURL(f.preview)
                  })
                  setFiles([])
                }}
              >
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => router.push('/ai-studio')}>
          Back to AI Studio
        </Button>
      </div>
    </div>
  )
}