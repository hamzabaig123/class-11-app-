'use client'

import { Upload, FileText, Image, Brain, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function AIStudioPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Studio</h1>
        <p className="text-muted-foreground">
          Import questions from documents, images, or generate them with AI
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-burgundy-200 bg-burgundy-50">
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-burgundy-600 flex items-center justify-center mb-3">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <CardTitle>Document Import</CardTitle>
            <CardDescription>Upload PDF, DOCX, or TXT files</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Badge variant="secondary" className="text-xs">PDF</Badge> Text extraction</li>
              <li className="flex items-center gap-2"><Badge variant="secondary" className="text-xs">DOCX</Badge> Word documents</li>
              <li className="flex items-center gap-2"><Badge variant="secondary" className="text-xs">TXT</Badge> Plain text</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/ai-studio/upload?type=document">
                <ArrowRight className="h-4 w-4 ml-2" />
                Upload Document
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-burgundy-100 flex items-center justify-center mb-3">
              <Image className="h-6 w-6 text-burgundy-600" />
            </div>
            <CardTitle>Image Import</CardTitle>
            <CardDescription>Extract MCQs from photos or scans</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">OCR text recognition</li>
              <li className="flex items-center gap-2">Handwriting support</li>
              <li className="flex items-center gap-2">Multiple images</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full" variant="outline">
              <Link href="/ai-studio/upload?type=image">
                <ArrowRight className="h-4 w-4 ml-2" />
                Upload Images
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center mb-3">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <CardTitle>AI Generation</CardTitle>
            <CardDescription>Generate questions from topics</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">Topic-based generation</li>
              <li className="flex items-center gap-2">Difficulty control</li>
              <li className="flex items-center gap-2">Bulk creation</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full" variant="outline">
              <Link href="/ai-studio/generate">
                <ArrowRight className="h-4 w-4 ml-2" />
                Generate Questions
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Imports</CardTitle>
          <CardDescription>Review and approve imported questions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Upload className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-medium">No imports yet</h3>
            <p className="text-muted-foreground mt-1">Your imported questions will appear here for review</p>
            <Button asChild className="mt-4">
              <Link href="/ai-studio/upload">Start your first import</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}