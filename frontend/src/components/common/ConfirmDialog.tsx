import Modal from '@/components/common/Modal'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmDialog = ({ title, message, confirmLabel = 'Delete', loading = false, onConfirm, onCancel }: ConfirmDialogProps) => (
  <Modal title={title} onClose={onCancel}>
    <p className="text-sm text-muted">{message}</p>
    <div className="mt-6 flex justify-end gap-3">
      <button type="button" onClick={onCancel} className="h-10 rounded-lg border border-border px-4 text-sm font-medium hover:bg-page">
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={loading}
        className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
      >
        {loading ? 'Please wait...' : confirmLabel}
      </button>
    </div>
  </Modal>
)

export default ConfirmDialog
