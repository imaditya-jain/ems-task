interface PaginationProps {
  page: number
  totalPages: number
  totalCount: number
  pageSize: number
  onPageChange: (page: number) => void
}

const Pagination = ({ page, totalPages, totalCount, pageSize, onPageChange }: PaginationProps) => {
  if (totalCount === 0) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)
  const buttonClass = 'h-9 rounded-lg border border-border px-3 text-sm font-medium hover:bg-page disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm sm:flex-row">
      <p className="text-muted">
        Showing {from}-{to} of {totalCount}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className={buttonClass} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </button>
        <span className="px-2">
          Page {page} of {totalPages}
        </span>
        <button type="button" className={buttonClass} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </button>
      </div>
    </div>
  )
}

export default Pagination
