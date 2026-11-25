import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { IoAdd, IoCreateOutline, IoTrashOutline } from 'react-icons/io5'
import { useDebounce } from '@/utils/useDebounce'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import Modal from '@/components/common/Modal'
import Spinner from '@/components/common/Spinner'
import DepartmentForm from '@/components/forms/DepartmentForm'
import {
  createDepartmentHandler,
  deleteDepartmentHandler,
  fetchDepartmentsHandler,
  updateDepartmentHandler,
  type DepartmentPayload,
} from '@/lib/features/department.feature'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import type { Department } from '@/types'

const DepartmentsPage = () => {
  const dispatch = useAppDispatch()
  const { items, loading, saving, error } = useAppSelector((state) => state.department)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [deleting, setDeleting] = useState<Department | null>(null)

  useEffect(() => {
    dispatch(fetchDepartmentsHandler(debouncedSearch.trim() || undefined))
  }, [dispatch, debouncedSearch])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (department: Department) => {
    setEditing(department)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  const handleSubmit = async (data: DepartmentPayload) => {
    try {
      const response = editing
        ? await dispatch(updateDepartmentHandler({ id: editing.id, data })).unwrap()
        : await dispatch(createDepartmentHandler(data)).unwrap()

      toast.success(response.message)
      closeForm()
    } catch (err) {
      toast.error((err as { error?: string }).error ?? 'Something went wrong.')
    }
  }

  const handleDelete = async () => {
    if (!deleting) return

    try {
      await dispatch(deleteDepartmentHandler(deleting.id)).unwrap()
      toast.success('Department deleted successfully.')
    } catch (err) {
      toast.error((err as { error?: string }).error ?? 'Something went wrong.')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Departments</h1>
          <p className="mt-1 text-sm text-muted">Organize employees into departments.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-dark"
        >
          <IoAdd className="text-lg" />
          Add Department
        </button>
      </div>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search departments..."
        aria-label="Search departments"
        className="mb-4 h-11 w-full max-w-sm rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        {loading && items.length === 0 ? (
          <Spinner />
        ) : error ? (
          <p className="p-6 text-sm text-red-500">{error}</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-muted">No departments found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-page text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((department) => (
                <tr key={department.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{department.name}</td>
                  <td className="px-4 py-3 text-muted">{department.description || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => openEdit(department)} aria-label={`Edit ${department.name}`} className="rounded-lg p-2 text-muted hover:bg-page hover:text-primary">
                        <IoCreateOutline className="text-lg" />
                      </button>
                      <button type="button" onClick={() => setDeleting(department)} aria-label={`Delete ${department.name}`} className="rounded-lg p-2 text-muted hover:bg-page hover:text-red-600">
                        <IoTrashOutline className="text-lg" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && (
        <Modal title={editing ? 'Edit Department' : 'Add Department'} onClose={closeForm}>
          <DepartmentForm department={editing} saving={saving} onSubmit={handleSubmit} onCancel={closeForm} />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete department"
          message={`Are you sure you want to delete "${deleting.name}"? This cannot be undone.`}
          loading={saving}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </section>
  )
}

export default DepartmentsPage
