import type { FormEvent } from 'react'
import { AlertCircleIcon, LoaderCircleIcon } from 'lucide-react'
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
import type { QuestionFormValues } from '../model'

interface QuestionFormDialogProps {
  open: boolean
  isEditing: boolean
  isSaving: boolean
  formError: string | null
  formValues: QuestionFormValues
  onOpenChange: (open: boolean) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onQuestionTextChange: (value: string) => void
  onOptionTextChange: (index: number, value: string) => void
  onCorrectIndexChange: (index: number) => void
}

export function QuestionFormDialog({
  open,
  isEditing,
  isSaving,
  formError,
  formValues,
  onOpenChange,
  onSubmit,
  onQuestionTextChange,
  onOptionTextChange,
  onCorrectIndexChange,
}: QuestionFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold text-plum">
            {isEditing ? 'Edit Question' : 'Add Question'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the multiple-choice question, its answer options, or the correct answer.'
              : 'Enter the question and four multiple-choice options, then select the correct answer.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="mt-2 flex flex-col gap-4">
          {formError && (
            <Alert variant="destructive">
              <AlertCircleIcon aria-hidden="true" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="question-text"
              className="text-xs font-semibold text-navy"
            >
              Question
            </label>
            <Input
              id="question-text"
              name="question_text"
              autoFocus
              required
              placeholder="Enter the question prompt..."
              value={formValues.question_text}
              onChange={(event) => onQuestionTextChange(event.target.value)}
            />
          </div>

          <fieldset className="space-y-2.5">
            <legend className="text-xs font-semibold text-navy">
              Multiple-choice options (select the correct answer)
            </legend>
            {formValues.options.map((optionText, index) => {
              const optionNumber = index + 1
              const isCorrect = formValues.correctIndex === index

              return (
                <div
                  key={optionNumber}
                  className={`flex items-center gap-3 rounded-lg border p-2.5 transition-colors ${
                    isCorrect
                      ? 'border-emerald-600/40 bg-emerald-50/40'
                      : 'border-border bg-background'
                  }`}
                >
                  <input
                    type="radio"
                    id={`correct-option-${optionNumber}`}
                    name="correct_option"
                    checked={isCorrect}
                    onChange={() => onCorrectIndexChange(index)}
                    aria-label={`Mark Option ${optionNumber} as correct`}
                    className="size-4 cursor-pointer accent-pink"
                  />
                  <div className="flex-1">
                    <Input
                      id={`option-text-${optionNumber}`}
                      aria-label={`Option ${optionNumber}`}
                      required
                      placeholder={`Option ${optionNumber}`}
                      value={optionText}
                      onChange={(event) =>
                        onOptionTextChange(index, event.target.value)
                      }
                    />
                  </div>
                  <label
                    htmlFor={`correct-option-${optionNumber}`}
                    className={`cursor-pointer text-xs font-medium ${
                      isCorrect ? 'text-emerald-700' : 'text-muted-foreground'
                    }`}
                  >
                    {isCorrect ? 'Correct' : 'Select'}
                  </label>
                </div>
              )
            })}
          </fieldset>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && (
                <LoaderCircleIcon
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              {isSaving
                ? 'Saving...'
                : isEditing
                  ? 'Save changes'
                  : 'Create question'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
