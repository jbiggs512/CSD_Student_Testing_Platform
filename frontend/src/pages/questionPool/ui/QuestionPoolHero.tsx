import { PlusIcon, UploadIcon } from 'lucide-react'
import { Button } from '@shared/components'

interface QuestionPoolHeroProps {
  disabled: boolean
  onBulkUploadClick: () => void
  onAddQuestionClick: () => void
}

export function QuestionPoolHero({
  disabled,
  onBulkUploadClick,
  onAddQuestionClick,
}: QuestionPoolHeroProps) {
  return (
    <section className="flex flex-col gap-6 rounded-2xl bg-navy p-10 text-white shadow-md sm:flex-row sm:items-end sm:justify-between sm:p-14">
      <div className="max-w-2xl space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">
          Teaching and assessment
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Question Pool Management
        </h1>
        <p className="text-sm leading-6 text-white/80 sm:text-base">
          Organise questions by subject. Add new questions or keep your existing
          pool up to date.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="outline"
          onClick={onBulkUploadClick}
          disabled={disabled}
          className="w-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:w-auto"
        >
          <UploadIcon aria-hidden="true" />
          Bulk Upload JSON
        </Button>
        <Button
          type="button"
          onClick={onAddQuestionClick}
          disabled={disabled}
          className="w-full bg-white text-navy hover:bg-white/90 sm:w-auto"
        >
          <PlusIcon aria-hidden="true" />
          Add Question
        </Button>
      </div>
    </section>
  )
}
