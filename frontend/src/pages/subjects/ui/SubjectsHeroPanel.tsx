import { PlusIcon } from 'lucide-react'
import { Button } from '@shared/components/ui/button'

interface SubjectsHeroPanelProps {
  onAddSubject: () => void
}

export function SubjectsHeroPanel({
  onAddSubject,
}: Readonly<SubjectsHeroPanelProps>) {
  return (
    <section className="flex flex-col gap-6 rounded-2xl bg-navy p-8 text-white shadow-md sm:flex-row sm:items-end sm:justify-between sm:p-10">
      <div className="max-w-2xl space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">
          Administration
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Subject management
        </h1>
        <p className="text-sm leading-6 text-white/80 sm:text-base">
          Create and maintain the subjects available to students and lecturers.
          You can also disable subjects without removing their records.
        </p>
      </div>

      <Button
        onClick={onAddSubject}
        className="w-full bg-white text-navy hover:bg-white/90 sm:w-auto"
      >
        <PlusIcon aria-hidden="true" />
        Add subject
      </Button>
    </section>
  )
}
