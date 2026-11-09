import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SubmitEvent } from 'react'
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  Edit2Icon,
  KeyRoundIcon,
  LoaderCircleIcon,
  PlusIcon,
  PowerIcon,
  SearchIcon,
  Trash2Icon,
  UserCheckIcon,
  UsersIcon,
} from 'lucide-react'
import { Alert, AlertDescription } from '@shared/components/ui/alert'
import { Button } from '@shared/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/components/ui/card'
import { Input } from '@shared/components/ui/input'
import { Label } from '@shared/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@shared/components/ui/sheet'
import { ConfirmDialog } from '@shared/components/ui/confirm-dialog'
import type { Student } from '../model'
import {
  approveStudent,
  createStudent,
  deleteStudent,
  getStudents,
  StudentApiError,
  updateStudent,
} from '../api'

interface FormValues {
  username: string
  first_name: string
  last_name: string
  email: string
  password: string
}

interface PasswordValues {
  password: string
  confirmation: string
}

const EMPTY_FORM: FormValues = {
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  password: '',
}

const EMPTY_PASSWORD: PasswordValues = {
  password: '',
  confirmation: '',
}

interface StudentsPageState {
  students: Student[]
  isLoading: boolean
  isSaving: boolean
  pageError: string | null
  formError: string | null
  successMessage: string | null
  searchTerm: string
  statusFilter: 'all' | Student['account_status']
  isFormOpen: boolean
  editingStudent: Student | null
  passwordStudent: Student | null
  passwordValues: PasswordValues
  isPasswordOpen: boolean
  studentPendingDelete: Student | null
  formValues: FormValues
}

const INITIAL_STATE: StudentsPageState = {
  students: [],
  isLoading: true,
  isSaving: false,
  pageError: null,
  formError: null,
  successMessage: null,
  searchTerm: '',
  statusFilter: 'all',
  isFormOpen: false,
  editingStudent: null,
  passwordStudent: null,
  passwordValues: EMPTY_PASSWORD,
  isPasswordOpen: false,
  studentPendingDelete: null,
  formValues: EMPTY_FORM,
}

function getDisplayError(error: unknown): string {
  if (error instanceof StudentApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

function StatusBadge({ status }: Readonly<{ status: Student['account_status'] }>) {
  const styles = {
    active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    disabled: 'bg-muted text-muted-foreground ring-border',
    pending: 'bg-yellow/20 text-navy ring-yellow/40',
  } as const

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${styles[status]}`}>
      {status}
    </span>
  )
}

interface StudentActionsProps {
  student: Student
  onApprove: (student: Student) => void
  onToggleStatus: (student: Student) => void
  onPassword: (student: Student) => void
  onEdit: (student: Student) => void
  onDelete: (student: Student) => void
}

function StudentActions({
  student,
  onApprove,
  onToggleStatus,
  onPassword,
  onEdit,
  onDelete,
}: Readonly<StudentActionsProps>) {
  const statusActionLabel = student.account_status === 'active' ? 'Disable' : 'Enable'

  return (
    <div className="flex items-center justify-end gap-1">
      {student.account_status === 'pending' && <Button type="button" variant="ghost" size="sm" onClick={() => onApprove(student)} aria-label={`Approve ${student.username}`}><UserCheckIcon aria-hidden="true" /><span className="hidden lg:inline">Approve</span></Button>}
      {student.account_status !== 'pending' && <Button type="button" variant="ghost" size="sm" onClick={() => onToggleStatus(student)} aria-label={`${statusActionLabel} ${student.username}`}><PowerIcon aria-hidden="true" /><span className="hidden lg:inline">{statusActionLabel}</span></Button>}
      <Button type="button" variant="ghost" size="sm" onClick={() => onPassword(student)} aria-label={`Reset password for ${student.username}`}><KeyRoundIcon aria-hidden="true" /><span className="hidden lg:inline">Password</span></Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(student)} aria-label={`Edit ${student.username}`}><Edit2Icon aria-hidden="true" /><span className="hidden lg:inline">Edit</span></Button>
      <Button type="button" variant="ghost" size="icon-sm" onClick={() => onDelete(student)} aria-label={`Delete ${student.username}`} className="text-destructive hover:text-destructive"><Trash2Icon aria-hidden="true" /></Button>
    </div>
  )
}

export function StudentsPage() {
  const [state, setState] = useState<StudentsPageState>(INITIAL_STATE)
  const updateState = useCallback((updates: Partial<StudentsPageState>) => {
    setState((current) => ({ ...current, ...updates }))
  }, [])

  const loadStudents = useCallback(async () => {
    updateState({ isLoading: true, pageError: null })
    try {
      updateState({ students: await getStudents() })
    } catch (error) {
      updateState({ pageError: getDisplayError(error) })
    } finally {
      updateState({ isLoading: false })
    }
  }, [updateState])

  useEffect(() => {
    void loadStudents()
  }, [loadStudents])

  const filteredStudents = useMemo(() => {
    const search = state.searchTerm.trim().toLocaleLowerCase()
    return state.students.filter((student) => {
      const matchesStatus = state.statusFilter === 'all' || student.account_status === state.statusFilter
      const matchesSearch = !search ||
        [student.username, student.first_name, student.last_name, student.email]
          .join(' ')
          .toLocaleLowerCase()
          .includes(search)
      return matchesStatus && matchesSearch
    })
  }, [state.searchTerm, state.statusFilter, state.students])

  function openCreateForm() {
    updateState({
      editingStudent: null,
      formValues: EMPTY_FORM,
      formError: null,
      isFormOpen: true,
    })
  }

  function openEditForm(student: Student) {
    updateState({
      editingStudent: student,
      formValues: {
        username: student.username,
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        password: '',
      },
      formError: null,
      isFormOpen: true,
    })
  }

  function closeForm() {
    updateState({
      isFormOpen: false,
      editingStudent: null,
      formValues: EMPTY_FORM,
      formError: null,
    })
  }

  function openPasswordForm(student: Student) {
    updateState({
      passwordStudent: student,
      passwordValues: EMPTY_PASSWORD,
      formError: null,
      isPasswordOpen: true,
    })
  }

  function closePasswordForm() {
    updateState({
      isPasswordOpen: false,
      passwordStudent: null,
      passwordValues: EMPTY_PASSWORD,
      formError: null,
    })
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    updateState({ formError: null, successMessage: null, isSaving: true })

    try {
      if (state.editingStudent) {
        await updateStudent(state.editingStudent.username, {
          first_name: state.formValues.first_name.trim(),
          last_name: state.formValues.last_name.trim(),
          email: state.formValues.email.trim(),
        })
        updateState({ successMessage: 'Student updated successfully.' })
      } else {
        await createStudent({
          username: state.formValues.username.trim(),
          first_name: state.formValues.first_name.trim(),
          last_name: state.formValues.last_name.trim(),
          email: state.formValues.email.trim(),
          password: state.formValues.password,
        })
        updateState({ successMessage: 'Student created successfully.' })
      }
      closeForm()
      await loadStudents()
    } catch (error) {
      updateState({ formError: getDisplayError(error) })
    } finally {
      updateState({ isSaving: false })
    }
  }

  async function toggleStatus(student: Student) {
    updateState({ pageError: null, successMessage: null })
    try {
      const nextStatus = student.account_status === 'active' ? 'disabled' : 'active'
      await updateStudent(student.username, { account_status: nextStatus })
      const actionLabel = nextStatus === 'active' ? 'enabled' : 'disabled'
      updateState({ successMessage: `Student ${actionLabel} successfully.` })
      await loadStudents()
    } catch (error) {
      updateState({ pageError: getDisplayError(error) })
    }
  }

  async function handlePasswordSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    updateState({ formError: null })
    if (state.passwordValues.password.length < 8) {
      updateState({ formError: 'Password must be at least 8 characters.' })
      return
    }
    if (state.passwordValues.password !== state.passwordValues.confirmation) {
      updateState({ formError: 'Passwords do not match.' })
      return
    }
    if (!state.passwordStudent) return

    updateState({ isSaving: true })
    try {
      await updateStudent(state.passwordStudent.username, { password: state.passwordValues.password })
      updateState({ successMessage: 'Student password updated successfully.' })
      closePasswordForm()
      await loadStudents()
    } catch (error) {
      updateState({ formError: getDisplayError(error) })
    } finally {
      updateState({ isSaving: false })
    }
  }

  async function handleApprove(student: Student) {
    updateState({ pageError: null, successMessage: null })
    try {
      await approveStudent(student.username)
      updateState({ successMessage: 'Student approved successfully.' })
      await loadStudents()
    } catch (error) {
      updateState({ pageError: getDisplayError(error) })
    }
  }

  async function confirmDelete() {
    if (!state.studentPendingDelete) return
    updateState({ pageError: null, successMessage: null })
    try {
      await deleteStudent(state.studentPendingDelete.username)
      updateState({
        studentPendingDelete: null,
        successMessage: 'Student deleted successfully.',
      })
      await loadStudents()
    } catch (error) {
      updateState({ pageError: getDisplayError(error) })
    }
  }

  const activeCount = state.students.filter(({ account_status }) => account_status === 'active').length
  const pendingCount = state.students.filter(({ account_status }) => account_status === 'pending').length
  const disabledCount = state.students.filter(({ account_status }) => account_status === 'disabled').length
  const showEmptyState = !state.isLoading && filteredStudents.length === 0
  const showStudentTable = !state.isLoading && filteredStudents.length > 0
  let formSubmitLabel = 'Create student'
  if (state.editingStudent) formSubmitLabel = 'Save changes'
  if (state.isSaving) formSubmitLabel = 'Saving...'

  return (
    <main className="flex min-h-screen w-full flex-col gap-8 bg-[#f7f8fb] p-4">
      <section className="flex flex-col gap-6 rounded-2xl bg-navy p-10 text-white shadow-md sm:flex-row sm:items-end sm:justify-between sm:p-14">
        <div className="max-w-2xl space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">Teaching and assessment</p>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">Student management</h1>
          <p className="text-sm leading-6 text-white/80 sm:text-base">
            Review student accounts, approve pending registrations, and manage access without losing their records.
          </p>
        </div>
        <Button onClick={openCreateForm} className="w-full bg-white text-navy hover:bg-white/90 sm:w-auto">
          <PlusIcon aria-hidden="true" />
          Add student
        </Button>
      </section>

      {state.pageError && <Alert variant="destructive"><AlertCircleIcon aria-hidden="true" /><AlertDescription>{state.pageError}</AlertDescription></Alert>}
      {state.successMessage && <Alert><CheckCircle2Icon aria-hidden="true" /><AlertDescription>{state.successMessage}</AlertDescription></Alert>}

      <section aria-label="Student statistics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Total students', state.students.length, 'All student accounts'],
          ['Active students', activeCount, 'Approved and available'],
          ['Pending students', pendingCount, 'Awaiting approval'],
          ['Disabled students', disabledCount, 'Accounts unavailable for sign in'],
        ].map(([title, value, description]) => (
          <Card key={title as string} className="gap-3 border-0 py-5 shadow-sm">
            <CardHeader className="gap-1 px-5">
              <CardDescription className="font-medium uppercase tracking-wide">{title}</CardDescription>
              <CardTitle className="font-heading text-4xl tabular-nums text-plum">{value}</CardTitle>
            </CardHeader>
            <CardContent className="px-5"><p className="text-xs text-muted-foreground">{description}</p></CardContent>
          </Card>
        ))}
      </section>

      <Card className="gap-0 border-0 py-0 shadow-md">
        <CardHeader className="gap-4 border-b py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="font-heading text-2xl font-bold text-plum">Students</CardTitle>
            <CardDescription>Search, approve, edit and manage student accounts.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 sm:w-72">
              <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Search students" placeholder="Search students..." value={state.searchTerm} onChange={(event) => updateState({ searchTerm: event.target.value })} className="pl-9" />
            </div>
            <div className="flex rounded-md border p-1" aria-label="Filter students by status">
              {(['all', 'active', 'pending', 'disabled'] as const).map((filter) => (
                <Button key={filter} type="button" size="sm" variant={state.statusFilter === filter ? 'secondary' : 'ghost'} aria-pressed={state.statusFilter === filter} onClick={() => updateState({ statusFilter: filter })} className="capitalize">{filter}</Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {state.isLoading && (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground"><LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />Loading students...</div>
          )}
          {showEmptyState && (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <div className="rounded-full bg-muted p-3"><UsersIcon className="size-6 text-muted-foreground" aria-hidden="true" /></div>
              <h2 className="font-medium">{state.students.length === 0 ? 'No students yet' : 'No matching students'}</h2>
              <p className="max-w-sm text-sm text-muted-foreground">{state.students.length === 0 ? 'Create the first student account to get started.' : 'Try changing your search or status filter.'}</p>
              {state.students.length === 0 && <Button onClick={openCreateForm}>Add your first student</Button>}
            </div>
          )}
          {showStudentTable && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-navy text-xs uppercase tracking-wide text-white/80">
                  <tr><th scope="col" className="px-6 py-3 font-medium">Student</th><th scope="col" className="px-6 py-3 font-medium">Email</th><th scope="col" className="px-6 py-3 font-medium">Status</th><th scope="col" className="px-6 py-3 text-right font-medium">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.map((student) => (
                    <tr key={student.user_id} className="transition-colors hover:bg-pink/5">
                      <td className="px-6 py-4"><div className="font-medium text-foreground">{student.first_name} {student.last_name}</div><div className="mt-1 text-xs text-muted-foreground">{student.username}</div></td>
                      <td className="px-6 py-4 text-muted-foreground">{student.email}</td>
                      <td className="px-6 py-4"><StatusBadge status={student.account_status} /></td>
                      <td className="px-6 py-4"><StudentActions student={student} onApprove={handleApprove} onToggleStatus={toggleStatus} onPassword={openPasswordForm} onEdit={openEditForm} onDelete={(studentToDelete) => updateState({ studentPendingDelete: studentToDelete })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={state.isFormOpen} onOpenChange={closeForm}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="border-b"><SheetTitle>{state.editingStudent ? 'Edit student' : 'Create student'}</SheetTitle><SheetDescription>{state.editingStudent ? 'Update student account details.' : 'Create a pending student account.'}</SheetDescription></SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 px-4">
            {state.formError && <Alert variant="destructive"><AlertCircleIcon aria-hidden="true" /><AlertDescription>{state.formError}</AlertDescription></Alert>}
            {!state.editingStudent && <div className="space-y-2"><Label htmlFor="student-username">Username</Label><Input id="student-username" required value={state.formValues.username} onChange={(event) => updateState({ formValues: { ...state.formValues, username: event.target.value } })} /></div>}
            <div className="space-y-2"><Label htmlFor="student-first-name">First name</Label><Input id="student-first-name" required value={state.formValues.first_name} onChange={(event) => updateState({ formValues: { ...state.formValues, first_name: event.target.value } })} /></div>
            <div className="space-y-2"><Label htmlFor="student-last-name">Last name</Label><Input id="student-last-name" required value={state.formValues.last_name} onChange={(event) => updateState({ formValues: { ...state.formValues, last_name: event.target.value } })} /></div>
            <div className="space-y-2"><Label htmlFor="student-email">Email</Label><Input id="student-email" type="email" required value={state.formValues.email} onChange={(event) => updateState({ formValues: { ...state.formValues, email: event.target.value } })} /></div>
            {!state.editingStudent && <div className="space-y-2"><Label htmlFor="student-password">Initial password</Label><Input id="student-password" type="password" minLength={8} required value={state.formValues.password} onChange={(event) => updateState({ formValues: { ...state.formValues, password: event.target.value } })} /></div>}
            <SheetFooter className="mt-auto flex-col-reverse border-t px-0 pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={closeForm} disabled={state.isSaving}>Cancel</Button><Button type="submit" disabled={state.isSaving}>{state.isSaving && <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />}{formSubmitLabel}</Button></SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={state.isPasswordOpen} onOpenChange={closePasswordForm}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="border-b">
            <SheetTitle>Reset student password</SheetTitle>
            <SheetDescription>Set a new password for {state.passwordStudent?.username}.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handlePasswordSubmit} className="flex flex-1 flex-col gap-5 px-4">
            {state.formError && <Alert variant="destructive"><AlertCircleIcon aria-hidden="true" /><AlertDescription>{state.formError}</AlertDescription></Alert>}
            <div className="space-y-2"><Label htmlFor="new-student-password">New password</Label><Input id="new-student-password" type="password" required minLength={8} value={state.passwordValues.password} onChange={(event) => updateState({ passwordValues: { ...state.passwordValues, password: event.target.value } })} /></div>
            <div className="space-y-2"><Label htmlFor="confirm-student-password">Confirm new password</Label><Input id="confirm-student-password" type="password" required minLength={8} value={state.passwordValues.confirmation} onChange={(event) => updateState({ passwordValues: { ...state.passwordValues, confirmation: event.target.value } })} /></div>
            <SheetFooter className="mt-auto flex-col-reverse border-t px-0 pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={closePasswordForm} disabled={state.isSaving}>Cancel</Button><Button type="submit" disabled={state.isSaving}>{state.isSaving ? 'Saving...' : 'Update password'}</Button></SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog open={state.studentPendingDelete !== null} onOpenChange={(open) => { if (!open) updateState({ studentPendingDelete: null }) }} title="Delete student?" description={state.studentPendingDelete ? `Delete "${state.studentPendingDelete.username}"? This action cannot be undone.` : ''} confirmLabel="Delete" onConfirm={confirmDelete} />
    </main>
  )
}
