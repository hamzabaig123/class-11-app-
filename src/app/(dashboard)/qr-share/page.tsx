'use client'

import { useState, useRef } from 'react'
import { QrCode, Download, Copy, Link2, Smartphone, Share2, Check, RefreshCw, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'

type QRType = 'practice' | 'collection' | 'question' | 'custom'

export default function QRSharePage() {
  const [qrType, setQrType] = useState<QRType>('practice')
  const [qrValue, setQrValue] = useState('')
  const [qrSize, setQrSize] = useState(256)
  const [qrColor, setQrColor] = useState('#8B1A2B')
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { data: collections } = trpc.collections.list.useQuery({ page: 1, pageSize: 50 })
  const { data: subjects } = trpc.subjects.list.useQuery()

  const generateQR = () => {
    if (!qrValue) {
      toast({ title: 'Please enter a URL or select an item', variant: 'destructive' })
      return
    }
    
    // Use Google Charts API for QR generation
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(qrValue)}&color=${qrColor.replace('#', '')}`
    
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const img = new Image()
        img.onload = () => {
          canvas.width = qrSize
          canvas.height = qrSize
          ctx.fillStyle = 'white'
          ctx.fillRect(0, 0, qrSize, qrSize)
          ctx.drawImage(img, 0, 0)
        }
        img.src = qrUrl
      }
    }
  }

  const downloadQR = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const link = document.createElement('a')
      link.download = `qr-code-${Date.now()}.png`
      link.href = canvas.toDataURL()
      link.click()
      toast({ title: 'QR code downloaded' })
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(qrValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({ title: 'Link copied to clipboard' })
  }

  const getShareUrl = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    switch (qrType) {
      case 'practice':
        return `${baseUrl}/practice/new`
      case 'collection':
        return qrValue
      case 'question':
        return qrValue
      case 'custom':
        return qrValue
      default:
        return qrValue
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">QR Share</h1>
        <p className="text-muted-foreground">Generate QR codes to share practice links instantly</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* QR Generator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" />Generate QR Code</CardTitle>
            <CardDescription>Create a scannable QR code for any link</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Type Selector */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={qrType} onValueChange={(v: QRType) => {
                setQrType(v)
                if (v === 'practice') setQrValue(`${typeof window !== 'undefined' ? window.location.origin : ''}/practice/new`)
                else setQrValue('')
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="practice">Practice Session</SelectItem>
                  <SelectItem value="collection">Collection</SelectItem>
                  <SelectItem value="question">Question</SelectItem>
                  <SelectItem value="custom">Custom URL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* URL Input */}
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                placeholder="Enter URL or select an item below"
                value={qrValue}
                onChange={e => setQrValue(e.target.value)}
              />
            </div>

            {/* Quick Select */}
            {qrType === 'collection' && collections?.collections && (
              <div className="space-y-2">
                <Label>Select Collection</Label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {collections.collections.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => setQrValue(`${typeof window !== 'undefined' ? window.location.origin : ''}/collections/${c.id}`)}
                      className="w-full text-left p-2 rounded border hover:bg-accent text-sm"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Customization */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Size</Label>
                <Select value={qrSize.toString()} onValueChange={v => setQrSize(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="128">Small (128px)</SelectItem>
                    <SelectItem value="256">Medium (256px)</SelectItem>
                    <SelectItem value="512">Large (512px)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  <Input type="color" value={qrColor} onChange={e => setQrColor(e.target.value)} className="w-12 h-10 p-1" />
                  <Input value={qrColor} onChange={e => setQrColor(e.target.value)} className="flex-1" />
                </div>
              </div>
            </div>

            <Button onClick={generateQR} className="w-full">
              <QrCode className="h-4 w-4 mr-2" />Generate QR Code
            </Button>
          </CardContent>
        </Card>

        {/* QR Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Your generated QR code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg min-h-[300px]">
              <canvas ref={canvasRef} className="border rounded bg-white" style={{ maxWidth: '100%', height: 'auto' }} />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={downloadQR}>
                <Download className="h-4 w-4 mr-2" />Download
              </Button>
              <Button variant="outline" className="flex-1" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>

            {/* Share Options */}
            <div className="space-y-2">
              <Label>Share via</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(qrValue)}`, '_blank')}>
                  <Smartphone className="h-4 w-4 mr-1" />WhatsApp
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open(`mailto:?body=${encodeURIComponent(qrValue)}`, '_blank')}>
                  <Share2 className="h-4 w-4 mr-1" />Email
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(qrValue)}`, '_blank')}>
                  <Share2 className="h-4 w-4 mr-1" />Telegram
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><span className="text-burgundy-600">•</span>Scan the QR code with any smartphone camera to open the link instantly</li>
            <li className="flex items-start gap-2"><span className="text-burgundy-600">•</span>Use the Practice Session type to share a quick practice link</li>
            <li className="flex items-start gap-2"><span className="text-burgundy-600">•</span>Download the QR code to print or share in presentations</li>
            <li className="flex items-start gap-2"><span className="text-burgundy-600">•</span>Custom colors help match your branding or presentation theme</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
