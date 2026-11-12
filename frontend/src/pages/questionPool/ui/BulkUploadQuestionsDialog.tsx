import type { ChangeEvent, FormEvent } from 'react'
import { AlertCircleIcon, DownloadIcon, LoaderCircleIcon } from 'lucide-react'
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@shared/components'
import { SAMPLE_BULK_JSON } from '../model'
import type { QuestionBulkItemInput } from '../model'

interface BulkUploadQuestionsDialogProps {
  open: boolean
  subjectName: string | undefined
  bulkJsonText: string
  bulkError: string | null
  isBulkSaving: boolean
  bulkPreview: {
    items: QuestionBulkItemInput[] | null
    error: string | null
  } | null
  onOpenChange: (open: boolean) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onJsonTextChange: (value: string) => void
  onDownloadSample: () => void
}

export function BulkUploadQuestionsDialog({
  open,
  subjectName,
  bulkJsonText,
  bulkError,
  isBulkSaving,
  bulkPreview,
  onOpenChange,
  onSubmit,
  onFileChange,
  onJsonTextChange,
  onDownloadSample,
}: BulkUploadQuestionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold text-plum">
            Bulk Upload Questions (JSON)
          </DialogTitle>
          <DialogDescription>
            Upload a JSON file or paste a JSON array of multiple-choice
            questions for{' '}
            <span className="font-medium text-foreground">
              {subjectName ?? 'the selected subject'}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="mt-2 flex flex-col gap-4">
          {bulkError && (
            <Alert variant="destructive">
              <AlertCircleIcon aria-hidden="true" />
              <AlertDescription>{bulkError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <label
                htmlFor="bulk-json-file"
                className="text-xs font-semibold text-navy"
              >
                JSON file
              </label>
              <Input
                id="bulk-json-file"
                type="file"
                accept=".json,application/json"
                onChange={onFileChange}
                className="cursor-pointer"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDownloadSample}
              className="sm:mt-5"
            >
              <DownloadIcon aria-hidden="true" />
              Download template
            </Button>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="bulk-json-textarea"
              className="text-xs font-semibold text-navy"
            >
              JSON content
            </label>
            <textarea
              id="bulk-json-textarea"
              rows={8}
              placeholder={SAMPLE_BULK_JSON}
              value={bulkJsonText}
              onChange={(event) => onJsonTextChange(event.target.value)}
              className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {bulkPreview?.items && (
              <p className="text-xs font-medium text-emerald-700">
                Ready to upload {bulkPreview.items.length}{' '}
                {bulkPreview.items.length === 1 ? 'question' : 'questions'}.
              </p>
            )}
            {bulkPreview?.error && !bulkError && (
              <p className="text-xs text-muted-foreground">
                {bulkPreview.error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isBulkSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isBulkSaving}>
              {isBulkSaving && (
                <LoaderCircleIcon
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              {isBulkSaving ? 'Uploading...' : 'Upload questions'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
