'use client'

import { AlertCircle, CheckCircle, SkipForward } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface CompletionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unansweredCount: number
  skippedCount: number
  onComplete: () => void
  onGoBack: () => void
  isCompleting: boolean
}

export function CompletionDialog({
  open,
  onOpenChange,
  unansweredCount,
  skippedCount,
  onComplete,
  onGoBack,
  isCompleting,
}: CompletionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Complete Session?
          </DialogTitle>
          <DialogDescription>
            {unansweredCount > 0 && (
              <span className="block mb-1">
                You have <strong>{unansweredCount}</strong> unanswered question{unansweredCount !== 1 ? 's' : ''}.
              </span>
            )}
            {skippedCount > 0 && (
              <span className="block mb-1">
                You have <strong>{skippedCount}</strong> skipped question{skippedCount !== 1 ? 's' : ''}.
              </span>
            )}
            You can still go back and answer them, or complete the session now.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={onGoBack}>
            Go Back
          </Button>
          <Button onClick={onComplete} loading={isCompleting}>
            <CheckCircle className="h-4 w-4 mr-1.5" />
            Complete Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
