import { PlusIcon } from 'lucide-react'
import { Button } from '@shared/components/ui/button'

interface SubjectManagementHeroPanelProps {
  onAddSubject: () => void
}

export function SubjectManagementHeroPanel({
  onAddSubject,
}: Readonly<SubjectManagementHeroPanelProps>) {
  return (
    <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Administration
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Subject management
        </h1>
        <p className="text-sm leading-6 text-muted-foreground sm:text-base">
          Create and maintain the subjects available to students and lecturers.
          You can also disable subjects without removing their records.
        </p>
      </div>

      <Button onClick={onAddSubject} className="w-full sm:w-auto">
        <PlusIcon aria-hidden="true" />
        Add subject
      </Button>
    </section>
  )
}
