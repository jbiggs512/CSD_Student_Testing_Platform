import { AlertCircleIcon, CheckCircle2Icon } from 'lucide-react'
import {
  Alert,
  AlertDescription,
  ConfirmDialog,
} from '@shared/components'
import { useQuestionPool } from '../model'
import { BulkUploadQuestionsDialog } from './BulkUploadQuestionsDialog'
import { QuestionFormDialog } from './QuestionFormDialog'
import { QuestionPoolHero } from './QuestionPoolHero'
import { QuestionPoolTableCard } from './QuestionPoolTableCard'
import { SubjectSelectorCard } from './SubjectSelectorCard'

export function QuestionPoolPage() {
  const pool = useQuestionPool()

  return (
    <main className="flex min-h-screen w-full flex-col gap-8 bg-[#f7f8fb] p-4">
      <QuestionPoolHero
        disabled={pool.selectedSubjectId === null}
        onBulkUploadClick={() => pool.closeBulkModal(true)}
        onAddQuestionClick={pool.openCreateModal}
      />

      {pool.pageError && (
        <Alert variant="destructive">
          <AlertCircleIcon aria-hidden="true" />
          <AlertDescription>{pool.pageError}</AlertDescription>
        </Alert>
      )}

      {pool.successMessage && (
        <Alert>
          <CheckCircle2Icon aria-hidden="true" />
          <AlertDescription>{pool.successMessage}</AlertDescription>
        </Alert>
      )}

      <SubjectSelectorCard
        subjects={pool.subjects}
        selectedSubjectId={pool.selectedSubjectId}
        isLoadingSubjects={pool.isLoadingSubjects}
        onSelectSubject={pool.setSelectedSubjectId}
      />

      <QuestionPoolTableCard
        totalQuestions={pool.questions.length}
        filteredQuestions={pool.filteredQuestions}
        searchTerm={pool.searchTerm}
        isLoading={pool.isLoading}
        hasSelectedSubject={pool.selectedSubjectId !== null}
        onSearchChange={pool.setSearchTerm}
        onDownloadPool={pool.handleDownloadPool}
        onCreateFirst={pool.openCreateModal}
        onEditQuestion={pool.openEditModal}
        onDeleteQuestion={pool.setQuestionPendingDelete}
      />

      <QuestionFormDialog
        open={pool.isModalOpen}
        isEditing={pool.editingQuestion !== null}
        isSaving={pool.isSaving}
        formError={pool.formError}
        formValues={pool.formValues}
        onOpenChange={pool.closeModal}
        onSubmit={pool.handleSubmit}
        onQuestionTextChange={(value) =>
          pool.setFormValues((current) => ({ ...current, question_text: value }))
        }
        onOptionTextChange={pool.handleOptionTextChange}
        onCorrectIndexChange={(index) =>
          pool.setFormValues((current) => ({ ...current, correctIndex: index }))
        }
      />

      <BulkUploadQuestionsDialog
        open={pool.isBulkModalOpen}
        subjectName={pool.selectedSubject?.subject_name}
        bulkJsonText={pool.bulkJsonText}
        bulkError={pool.bulkError}
        isBulkSaving={pool.isBulkSaving}
        bulkPreview={pool.bulkPreview}
        onOpenChange={pool.closeBulkModal}
        onSubmit={pool.handleBulkSubmit}
        onFileChange={(event) => void pool.handleBulkFileChange(event)}
        onJsonTextChange={(value) => {
          pool.setBulkJsonText(value)
          pool.setBulkError(null)
        }}
        onDownloadSample={pool.handleDownloadSample}
      />

      <ConfirmDialog
        open={pool.questionPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) pool.setQuestionPendingDelete(null)
        }}
        title="Delete question?"
        description={
          pool.questionPendingDelete
            ? `Delete "${pool.questionPendingDelete.question_text}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={() => void pool.confirmDelete()}
      />
    </main>
  )
}
