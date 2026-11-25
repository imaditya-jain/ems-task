import type { ReactNode } from 'react'
import { IoDocumentTextOutline, IoGridOutline } from 'react-icons/io5'
import type { ReportFormat, ReportType } from '@/lib/features/report.feature'
import { useAppSelector } from '@/lib/hooks'

interface ReportCardProps {
  report: ReportType
  title: string
  description: string
  onDownload: (format: ReportFormat) => void
  children?: ReactNode
}

const ReportCard = ({ report, title, description, onDownload, children }: ReportCardProps) => {
  const downloading = useAppSelector((state) => state.report.downloading)
  const busy = downloading !== null

  const button = (format: ReportFormat, label: string, icon: ReactNode) => (
    <button
      type="button"
      onClick={() => onDownload(format)}
      disabled={busy}
      className="flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium transition hover:bg-page disabled:cursor-not-allowed disabled:opacity-60"
    >
      {icon}
      {downloading === `${report}-${format}` ? 'Preparing...' : label}
    </button>
  )

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>

      {children && <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>}

      <div className="mt-auto flex flex-wrap gap-3 pt-5">
        {button('pdf', 'Download PDF', <IoDocumentTextOutline className="text-lg text-red-500" />)}
        {button('excel', 'Download Excel', <IoGridOutline className="text-lg text-green-600" />)}
      </div>
    </div>
  )
}

export default ReportCard
