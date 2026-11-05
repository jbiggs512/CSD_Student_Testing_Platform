import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AlertCircleIcon,
  Edit2Icon,
  KeyRoundIcon,
  LoaderCircleIcon,
  PlusIcon,
  PowerIcon,
  SearchIcon,
  Trash2Icon,
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
import type { Lecturer } from '../model'
import {
  createLecturer,
  deleteLecturer,
  getLecturers,
  LecturerApiError,
  updateLecturer,
  updateLecturerPassword,
} from '../api'

interface LecturerFormValues {
  username: string
  first_name: string
  last_name: string
  email: string
  password: string
}

interface PasswordFormValues {
  password: string
  confirmation: string
}

const EMPTY_LECTURER_FORM: LecturerFormValues = {
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  password: '',
}

const EMPTY_PASSWORD_FORM: PasswordFormValues = {
  password: '',
  confirmation: '',
}

function getDisplayError(error: unknown): string {
  if (error instanceof LecturerApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

function StatusBadge({ status }: Readonly<{ status: Lecturer['account_status'] }>) {
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

export function LecturersPage() {
  const [lecturers, setLecturers] = useState<Lecturer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)
  const [editingLecturer, setEditingLecturer] = useState<Lecturer | null>(null)
  const [lecturerPendingDelete, setLecturerPendingDelete] = useState<Lecturer | null>(null)
  const [passwordLecturer, setPasswordLecturer] = useState<Lecturer | null>(null)
  const [formValues, setFormValues] = useState<LecturerFormValues>(EMPTY_LECTURER_FORM)
  const [passwordValues, setPasswordValues] = useState<PasswordFormValues>(EMPTY_PASSWORD_FORM)

  const loadLecturers = useCallback(async () => {
    setIsLoading(true)
    setPageError(null)
    try {
      setLecturers(await getLecturers())
    } catch (error) {
      setPageError(getDisplayError(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLecturers()
  }, [loadLecturers])

  const filteredLecturers = useMemo(() => {
    const search = searchTerm.trim().toLocaleLowerCase()
    return lecturers.filter((lecturer) => {
      const matchesStatus =
        statusFilter === 'all' || lecturer.account_status === statusFilter
      const matchesSearch =
        !search ||
        [lecturer.username, lecturer.first_name, lecturer.last_name, lecturer.email]
          .join(' ')
          .toLocaleLowerCase()
          .includes(search)
      return matchesStatus && matchesSearch
    })
  }, [lecturers, searchTerm, statusFilter])

  function openCreateForm() {
    setEditingLecturer(null)
    setFormValues(EMPTY_LECTURER_FORM)
    setFormError(null)
    setIsFormOpen(true)
  }

  function openEditForm(lecturer: Lecturer) {
    setEditingLecturer(lecturer)
    setFormValues({
      username: lecturer.username,
      first_name: lecturer.first_name,
      last_name: lecturer.last_name,
      email: lecturer.email,
      password: '',
    })
    setFormError(null)
    setIsFormOpen(true)
  }

  function closeForm(open: boolean) {
    setIsFormOpen(open)
    if (!open) {
      setEditingLecturer(null)
      setFormValues(EMPTY_LECTURER_FORM)
      setFormError(null)
    }
  }

  function openPasswordForm(lecturer: Lecturer) {
    setPasswordLecturer(lecturer)
    setPasswordValues(EMPTY_PASSWORD_FORM)
    setFormError(null)
    setIsPasswordOpen(true)
  }

  function closePasswordForm(open: boolean) {
    setIsPasswordOpen(open)
    if (!open) {
      setPasswordLecturer(null)
      setPasswordValues(EMPTY_PASSWORD_FORM)
      setFormError(null)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    if (!editingLecturer && !formValues.username.trim()) {
      setFormError('Enter a username.')
      return
    }

    setIsSaving(true)
    try {
      if (editingLecturer) {
        await updateLecturer(editingLecturer.username, {
          first_name: formValues.first_name.trim(),
          last_name: formValues.last_name.trim(),
          email: formValues.email.trim(),
        })
        setSuccessMessage('Lecturer updated successfully.')
      } else {
        await createLecturer({
          username: formValues.username.trim(),
          first_name: formValues.first_name.trim(),
          last_name: formValues.last_name.trim(),
          email: formValues.email.trim(),
          password: formValues.password,
        })
        setSuccessMessage('Lecturer created successfully.')
      }

      closeForm(false)
      await loadLecturers()
    } catch (error) {
      setFormError(getDisplayError(error))
    } finally {
      setIsSaving(false)
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    if (passwordValues.password.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }
    if (passwordValues.password !== passwordValues.confirmation) {
      setFormError('Passwords do not match.')
      return
    }
    if (!passwordLecturer) return

    setIsSaving(true)
    try {
      await updateLecturerPassword(passwordLecturer.username, {
        password: passwordValues.password,
      })
      setSuccessMessage('Lecturer password updated successfully.')
      closePasswordForm(false)
      await loadLecturers()
    } catch (error) {
      setFormError(getDisplayError(error))
    } finally {
      setIsSaving(false)
    }
  }

  async function confirmDelete() {
    if (!lecturerPendingDelete) return

    setPageError(null)
    setSuccessMessage(null)
    try {
      await deleteLecturer(lecturerPendingDelete.username)
      setSuccessMessage('Lecturer deleted successfully.')
      setLecturerPendingDelete(null)
      await loadLecturers()
    } catch (error) {
      setPageError(getDisplayError(error))
    }
  }

  async function toggleStatus(lecturer: Lecturer) {
    setPageError(null)
    setSuccessMessage(null)
    try {
      const nextStatus = lecturer.account_status === 'active' ? 'disabled' : 'active'
      await updateLecturer(lecturer.username, { account_status: nextStatus })
      setSuccessMessage(
        `Lecturer ${nextStatus === 'active' ? 'enabled' : 'disabled'} successfully.`,
      )
      await loadLecturers()
    } catch (error) {
      setPageError(getDisplayError(error))
    }
  }

  return (
    <main className="flex min-h-screen w-full flex-col gap-8 bg-[#f7f8fb] p-4">
      <section className="flex flex-col gap-6 rounded-2xl bg-navy p-10 text-white shadow-md sm:flex-row sm:items-end sm:justify-between sm:p-14">
        <div className="max-w-2xl space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">
            Administration
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Lecturer management
          </h1>
          <p className="text-sm leading-6 text-white/80 sm:text-base">
            Create and maintain lecturer accounts, reset passwords, and disable
            accounts without deleting their records.
          </p>
        </div>
        <Button onClick={openCreateForm} className="w-full bg-white text-navy hover:bg-white/90 sm:w-auto">
          <PlusIcon aria-hidden="true" />
          Add lecturer
        </Button>
      </section>

      {pageError && (
        <Alert variant="destructive">
          <AlertCircleIcon aria-hidden="true" />
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <section aria-label="Lecturer statistics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="gap-3 border-0 py-5 shadow-sm">
          <CardHeader className="gap-1 px-5">
            <CardDescription className="font-medium uppercase tracking-wide">Total lecturers</CardDescription>
            <CardTitle className="font-heading text-4xl tabular-nums text-plum">{lecturers.length}</CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <p className="text-xs text-muted-foreground">All lecturer accounts</p>
          </CardContent>
        </Card>
        <Card className="gap-3 border-0 py-5 shadow-sm">
          <CardHeader className="gap-1 px-5">
            <CardDescription className="font-medium uppercase tracking-wide">Disabled lecturers</CardDescription>
            <CardTitle className="font-heading text-4xl tabular-nums text-plum">
              {lecturers.filter(({ account_status }) => account_status === 'disabled').length}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <p className="text-xs text-muted-foreground">Accounts unavailable for sign in</p>
          </CardContent>
        </Card>
        <Card className="gap-3 border-0 py-5 shadow-sm">
          <CardHeader className="gap-1 px-5">
            <CardDescription className="font-medium uppercase tracking-wide">Active lecturers</CardDescription>
            <CardTitle className="font-heading text-4xl tabular-nums text-plum">
              {lecturers.filter(({ account_status }) => account_status === 'active').length}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <p className="text-xs text-muted-foreground">Available to manage the platform</p>
          </CardContent>
        </Card>
        <Card className="gap-3 border-0 py-5 shadow-sm">
          <CardHeader className="gap-1 px-5">
            <CardDescription className="font-medium uppercase tracking-wide">Search results</CardDescription>
            <CardTitle className="font-heading text-4xl tabular-nums text-plum">{filteredLecturers.length}</CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <p className="text-xs text-muted-foreground">Lecturers matching your search</p>
          </CardContent>
        </Card>
      </section>

      <Card className="gap-0 border-0 py-0 shadow-md">
        <CardHeader className="gap-4 border-b py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="font-heading text-2xl font-bold text-plum">Lecturers</CardTitle>
            <CardDescription>Search, edit and manage lecturer accounts.</CardDescription>
          </div>
          <div className="relative min-w-0 sm:w-72">
            <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search lecturers"
              placeholder="Search lecturers..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex rounded-md border p-1" aria-label="Filter lecturers by status">
            {(['all', 'active', 'disabled'] as const).map((filter) => (
              <Button
                key={filter}
                type="button"
                size="sm"
                variant={statusFilter === filter ? 'secondary' : 'ghost'}
                aria-pressed={statusFilter === filter}
                onClick={() => setStatusFilter(filter)}
                className="capitalize"
              >
                {filter}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
              Loading lecturers...
            </div>
          ) : filteredLecturers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <div className="rounded-full bg-muted p-3">
                <UsersIcon className="size-6 text-muted-foreground" aria-hidden="true" />
              </div>
              <h2 className="font-medium">{lecturers.length === 0 ? 'No lecturers yet' : 'No matching lecturers'}</h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                {lecturers.length === 0
                  ? 'Create the first lecturer account to get started.'
                  : 'Try changing your search term.'}
              </p>
              {lecturers.length === 0 && <Button onClick={openCreateForm}>Add your first lecturer</Button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-navy text-xs uppercase tracking-wide text-white/80">
                  <tr>
                    <th scope="col" className="px-6 py-3 font-medium">Lecturer</th>
                    <th scope="col" className="px-6 py-3 font-medium">Email</th>
                    <th scope="col" className="px-6 py-3 font-medium">Status</th>
                    <th scope="col" className="px-6 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLecturers.map((lecturer) => (
                    <tr key={lecturer.user_id} className="transition-colors hover:bg-pink/5">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">
                          {lecturer.first_name} {lecturer.last_name}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{lecturer.username}</div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{lecturer.email}</td>
                      <td className="px-6 py-4"><StatusBadge status={lecturer.account_status} /></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button type="button" variant="ghost" size="sm" onClick={() => openEditForm(lecturer)} aria-label={`Edit ${lecturer.username}`}>
                            <Edit2Icon aria-hidden="true" /><span className="hidden lg:inline">Edit</span>
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => openPasswordForm(lecturer)} aria-label={`Reset password for ${lecturer.username}`}>
                            <KeyRoundIcon aria-hidden="true" /><span className="hidden lg:inline">Password</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void toggleStatus(lecturer)}
                            aria-label={`${lecturer.account_status === 'active' ? 'Disable' : 'Enable'} ${lecturer.username}`}
                          >
                            <PowerIcon aria-hidden="true" />
                            <span className="hidden lg:inline">
                              {lecturer.account_status === 'active' ? 'Disable' : 'Enable'}
                            </span>
                          </Button>
                          <Button type="button" variant="ghost" size="icon-sm" onClick={() => setLecturerPendingDelete(lecturer)} aria-label={`Delete ${lecturer.username}`} className="text-destructive hover:text-destructive">
                            <Trash2Icon aria-hidden="true" />
                          </Button>
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
          <SheetHeader className="border-b">
            <SheetTitle>{editingLecturer ? 'Edit lecturer' : 'Create lecturer'}</SheetTitle>
            <SheetDescription>
              {editingLecturer ? 'Update lecturer account details.' : 'Create an active lecturer account.'}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 px-4">
            {formError && <Alert variant="destructive"><AlertCircleIcon aria-hidden="true" /><AlertDescription>{formError}</AlertDescription></Alert>}
            {!editingLecturer && (
              <div className="space-y-2">
                <label htmlFor="lecturer-username" className="text-sm font-medium">Username</label>
                <Input id="lecturer-username" required value={formValues.username} onChange={(event) => setFormValues((current) => ({ ...current, username: event.target.value }))} />
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="lecturer-first-name" className="text-sm font-medium">First name</label>
              <Input id="lecturer-first-name" required value={formValues.first_name} onChange={(event) => setFormValues((current) => ({ ...current, first_name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <label htmlFor="lecturer-last-name" className="text-sm font-medium">Last name</label>
              <Input id="lecturer-last-name" required value={formValues.last_name} onChange={(event) => setFormValues((current) => ({ ...current, last_name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <label htmlFor="lecturer-email" className="text-sm font-medium">Email</label>
              <Input id="lecturer-email" type="email" required value={formValues.email} onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))} />
            </div>
            {!editingLecturer && (
              <div className="space-y-2">
                <label htmlFor="lecturer-password" className="text-sm font-medium">Initial password</label>
                <Input id="lecturer-password" type="password" required minLength={8} value={formValues.password} onChange={(event) => setFormValues((current) => ({ ...current, password: event.target.value }))} />
              </div>
            )}
            <SheetFooter className="mt-auto flex-col-reverse border-t px-0 pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => closeForm(false)} disabled={isSaving}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />}
                {isSaving ? 'Saving...' : editingLecturer ? 'Save changes' : 'Create lecturer'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={isPasswordOpen} onOpenChange={closePasswordForm}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="border-b">
            <SheetTitle>Reset lecturer password</SheetTitle>
            <SheetDescription>Set a new password for {passwordLecturer?.username}.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handlePasswordSubmit} className="flex flex-1 flex-col gap-5 px-4">
            {formError && <Alert variant="destructive"><AlertCircleIcon aria-hidden="true" /><AlertDescription>{formError}</AlertDescription></Alert>}
            <div className="space-y-2">
              <label htmlFor="new-lecturer-password" className="text-sm font-medium">New password</label>
              <Input id="new-lecturer-password" type="password" required minLength={8} value={passwordValues.password} onChange={(event) => setPasswordValues((current) => ({ ...current, password: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm-lecturer-password" className="text-sm font-medium">Confirm new password</label>
              <Input id="confirm-lecturer-password" type="password" required minLength={8} value={passwordValues.confirmation} onChange={(event) => setPasswordValues((current) => ({ ...current, confirmation: event.target.value }))} />
            </div>
            <SheetFooter className="mt-auto flex-col-reverse border-t px-0 pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => closePasswordForm(false)} disabled={isSaving}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />}
                {isSaving ? 'Saving...' : 'Update password'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={lecturerPendingDelete !== null}
        onOpenChange={(open) => { if (!open) setLecturerPendingDelete(null) }}
        title="Delete lecturer?"
        description={lecturerPendingDelete ? `Delete "${lecturerPendingDelete.username}"? This action cannot be undone.` : ''}
        confirmLabel="Delete"
        onConfirm={() => void confirmDelete()}
      />
    </main>
  )
}
