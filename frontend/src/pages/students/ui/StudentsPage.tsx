import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
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

export function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | Student['account_status']>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [passwordStudent, setPasswordStudent] = useState<Student | null>(null)
  const [passwordValues, setPasswordValues] = useState<PasswordValues>(EMPTY_PASSWORD)
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)
  const [studentPendingDelete, setStudentPendingDelete] = useState<Student | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(EMPTY_FORM)

  const loadStudents = useCallback(async () => {
    setIsLoading(true)
    setPageError(null)
    try {
      setStudents(await getStudents())
    } catch (error) {
      setPageError(getDisplayError(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStudents()
  }, [loadStudents])

  const filteredStudents = useMemo(() => {
    const search = searchTerm.trim().toLocaleLowerCase()
    return students.filter((student) => {
      const matchesStatus = statusFilter === 'all' || student.account_status === statusFilter
      const matchesSearch = !search ||
        [student.username, student.first_name, student.last_name, student.email]
          .join(' ')
          .toLocaleLowerCase()
          .includes(search)
      return matchesStatus && matchesSearch
    })
  }, [searchTerm, statusFilter, students])

  function openCreateForm() {
    setEditingStudent(null)
    setFormValues(EMPTY_FORM)
    setFormError(null)
    setIsFormOpen(true)
  }

  function openEditForm(student: Student) {
    setEditingStudent(student)
    setFormValues({
      username: student.username,
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email,
      password: '',
    })
    setFormError(null)
    setIsFormOpen(true)
  }

  function closeForm(open: boolean) {
    setIsFormOpen(open)
    if (!open) {
      setEditingStudent(null)
      setFormValues(EMPTY_FORM)
      setFormError(null)
    }
  }

  function openPasswordForm(student: Student) {
    setPasswordStudent(student)
    setPasswordValues(EMPTY_PASSWORD)
    setFormError(null)
    setIsPasswordOpen(true)
  }

  function closePasswordForm(open: boolean) {
    setIsPasswordOpen(open)
    if (!open) {
      setPasswordStudent(null)
      setPasswordValues(EMPTY_PASSWORD)
      setFormError(null)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setSuccessMessage(null)
    setIsSaving(true)

    try {
      if (editingStudent) {
        await updateStudent(editingStudent.username, {
          first_name: formValues.first_name.trim(),
          last_name: formValues.last_name.trim(),
          email: formValues.email.trim(),
        })
        setSuccessMessage('Student updated successfully.')
      } else {
        await createStudent({
          username: formValues.username.trim(),
          first_name: formValues.first_name.trim(),
          last_name: formValues.last_name.trim(),
          email: formValues.email.trim(),
          password: formValues.password,
        })
        setSuccessMessage('Student created successfully.')
      }
      closeForm(false)
      await loadStudents()
    } catch (error) {
      setFormError(getDisplayError(error))
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleStatus(student: Student) {
    setPageError(null)
    setSuccessMessage(null)
    try {
      const nextStatus = student.account_status === 'active' ? 'disabled' : 'active'
      await updateStudent(student.username, { account_status: nextStatus })
      setSuccessMessage(`Student ${nextStatus === 'active' ? 'enabled' : 'disabled'} successfully.`)
      await loadStudents()
    } catch (error) {
      setPageError(getDisplayError(error))
    }

  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    if (passwordValues.password.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }
    if (passwordValues.password !== passwordValues.confirmation) {
      setFormError('Passwords do not match.')
      return
    }
    if (!passwordStudent) return

    setIsSaving(true)
    try {
      await updateStudent(passwordStudent.username, { password: passwordValues.password })
      setSuccessMessage('Student password updated successfully.')
      closePasswordForm(false)
      await loadStudents()
    } catch (error) {
      setFormError(getDisplayError(error))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleApprove(student: Student) {
    setPageError(null)
    setSuccessMessage(null)
    try {
      await approveStudent(student.username)
      setSuccessMessage('Student approved successfully.')
      await loadStudents()
    } catch (error) {
      setPageError(getDisplayError(error))
    }
  }

  async function confirmDelete() {
    if (!studentPendingDelete) return
    setPageError(null)
    setSuccessMessage(null)
    try {
      await deleteStudent(studentPendingDelete.username)
      setStudentPendingDelete(null)
      setSuccessMessage('Student deleted successfully.')
      await loadStudents()
    } catch (error) {
      setPageError(getDisplayError(error))
    }
  }

  const activeCount = students.filter(({ account_status }) => account_status === 'active').length
  const pendingCount = students.filter(({ account_status }) => account_status === 'pending').length
  const disabledCount = students.filter(({ account_status }) => account_status === 'disabled').length

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

      {pageError && <Alert variant="destructive"><AlertCircleIcon aria-hidden="true" /><AlertDescription>{pageError}</AlertDescription></Alert>}
      {successMessage && <Alert><CheckCircle2Icon aria-hidden="true" /><AlertDescription>{successMessage}</AlertDescription></Alert>}

      <section aria-label="Student statistics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Total students', students.length, 'All student accounts'],
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
              <Input aria-label="Search students" placeholder="Search students..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="pl-9" />
            </div>
            <div className="flex rounded-md border p-1" aria-label="Filter students by status">
              {(['all', 'active', 'pending', 'disabled'] as const).map((filter) => (
                <Button key={filter} type="button" size="sm" variant={statusFilter === filter ? 'secondary' : 'ghost'} aria-pressed={statusFilter === filter} onClick={() => setStatusFilter(filter)} className="capitalize">{filter}</Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground"><LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />Loading students...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <div className="rounded-full bg-muted p-3"><UsersIcon className="size-6 text-muted-foreground" aria-hidden="true" /></div>
              <h2 className="font-medium">{students.length === 0 ? 'No students yet' : 'No matching students'}</h2>
              <p className="max-w-sm text-sm text-muted-foreground">{students.length === 0 ? 'Create the first student account to get started.' : 'Try changing your search or status filter.'}</p>
              {students.length === 0 && <Button onClick={openCreateForm}>Add your first student</Button>}
            </div>
          ) : (
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
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {student.account_status === 'pending' && <Button type="button" variant="ghost" size="sm" onClick={() => void handleApprove(student)} aria-label={`Approve ${student.username}`}><UserCheckIcon aria-hidden="true" /><span className="hidden lg:inline">Approve</span></Button>}
                          {student.account_status !== 'pending' && <Button type="button" variant="ghost" size="sm" onClick={() => void toggleStatus(student)} aria-label={`${student.account_status === 'active' ? 'Disable' : 'Enable'} ${student.username}`}><PowerIcon aria-hidden="true" /><span className="hidden lg:inline">{student.account_status === 'active' ? 'Disable' : 'Enable'}</span></Button>}
                          <Button type="button" variant="ghost" size="sm" onClick={() => openPasswordForm(student)} aria-label={`Reset password for ${student.username}`}><KeyRoundIcon aria-hidden="true" /><span className="hidden lg:inline">Password</span></Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => openEditForm(student)} aria-label={`Edit ${student.username}`}><Edit2Icon aria-hidden="true" /><span className="hidden lg:inline">Edit</span></Button>
                          <Button type="button" variant="ghost" size="icon-sm" onClick={() => setStudentPendingDelete(student)} aria-label={`Delete ${student.username}`} className="text-destructive hover:text-destructive"><Trash2Icon aria-hidden="true" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={isFormOpen} onOpenChange={closeForm}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="border-b"><SheetTitle>{editingStudent ? 'Edit student' : 'Create student'}</SheetTitle><SheetDescription>{editingStudent ? 'Update student account details.' : 'Create a pending student account.'}</SheetDescription></SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 px-4">
            {formError && <Alert variant="destructive"><AlertCircleIcon aria-hidden="true" /><AlertDescription>{formError}</AlertDescription></Alert>}
            {!editingStudent && <div className="space-y-2"><label htmlFor="student-username" className="text-sm font-medium">Username</label><Input id="student-username" required value={formValues.username} onChange={(event) => setFormValues((current) => ({ ...current, username: event.target.value }))} /></div>}
            <div className="space-y-2"><label htmlFor="student-first-name" className="text-sm font-medium">First name</label><Input id="student-first-name" required value={formValues.first_name} onChange={(event) => setFormValues((current) => ({ ...current, first_name: event.target.value }))} /></div>
            <div className="space-y-2"><label htmlFor="student-last-name" className="text-sm font-medium">Last name</label><Input id="student-last-name" required value={formValues.last_name} onChange={(event) => setFormValues((current) => ({ ...current, last_name: event.target.value }))} /></div>
            <div className="space-y-2"><label htmlFor="student-email" className="text-sm font-medium">Email</label><Input id="student-email" type="email" required value={formValues.email} onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))} /></div>
            {!editingStudent && <div className="space-y-2"><label htmlFor="student-password" className="text-sm font-medium">Initial password</label><Input id="student-password" type="password" minLength={8} required value={formValues.password} onChange={(event) => setFormValues((current) => ({ ...current, password: event.target.value }))} /></div>}
            <SheetFooter className="mt-auto flex-col-reverse border-t px-0 pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => closeForm(false)} disabled={isSaving}>Cancel</Button><Button type="submit" disabled={isSaving}>{isSaving && <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />}{isSaving ? 'Saving...' : editingStudent ? 'Save changes' : 'Create student'}</Button></SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={isPasswordOpen} onOpenChange={closePasswordForm}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="border-b">
            <SheetTitle>Reset student password</SheetTitle>
            <SheetDescription>Set a new password for {passwordStudent?.username}.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handlePasswordSubmit} className="flex flex-1 flex-col gap-5 px-4">
            {formError && <Alert variant="destructive"><AlertCircleIcon aria-hidden="true" /><AlertDescription>{formError}</AlertDescription></Alert>}
            <div className="space-y-2"><label htmlFor="new-student-password" className="text-sm font-medium">New password</label><Input id="new-student-password" type="password" required minLength={8} value={passwordValues.password} onChange={(event) => setPasswordValues((current) => ({ ...current, password: event.target.value }))} /></div>
            <div className="space-y-2"><label htmlFor="confirm-student-password" className="text-sm font-medium">Confirm new password</label><Input id="confirm-student-password" type="password" required minLength={8} value={passwordValues.confirmation} onChange={(event) => setPasswordValues((current) => ({ ...current, confirmation: event.target.value }))} /></div>
            <SheetFooter className="mt-auto flex-col-reverse border-t px-0 pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => closePasswordForm(false)} disabled={isSaving}>Cancel</Button><Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Update password'}</Button></SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog open={studentPendingDelete !== null} onOpenChange={(open) => { if (!open) setStudentPendingDelete(null) }} title="Delete student?" description={studentPendingDelete ? `Delete "${studentPendingDelete.username}"? This action cannot be undone.` : ''} confirmLabel="Delete" onConfirm={() => void confirmDelete()} />
    </main>
  )
}
