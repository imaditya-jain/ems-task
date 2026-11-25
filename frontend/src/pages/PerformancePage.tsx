import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { IoAdd, IoCreateOutline, IoDocumentTextOutline, IoGridOutline, IoTrashOutline } from 'react-icons/io5'
import ChartCard from '@/components/analytics/ChartCard'
import StatCard from '@/components/analytics/StatCard'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import Modal from '@/components/common/Modal'
import Pagination from '@/components/common/Pagination'
import Spinner from '@/components/common/Spinner'
import ReviewForm from '@/components/forms/ReviewForm'
import RatingBadge from '@/components/performance/RatingBadge'
import { fetchDepartmentsHandler } from '@/lib/features/department.feature'
import {
  createReviewHandler,
  deleteReviewHandler,
  fetchEmployeeOptionsHandler,
  fetchMetricsHandler,
  fetchReviewsHandler,
  updateReviewHandler,
  type ReviewPayload,
} from '@/lib/features/performance.feature'
import { downloadReportHandler, type ReportFormat } from '@/lib/features/report.feature'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { chartColors } from '@/utils/chartColors'
import { useDebounce } from '@/utils/useDebounce'
import type { PerformanceReview, Performer } from '@/types'

const PAGE_SIZE = 10
const CURRENT_YEAR = new Date().getFullYear()
const controlClass = 'h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
const distributionColors: Record<string, string> = {
  'Needs Improvement': chartColors.red,
  'Meets Expectations': chartColors.slate,
  'Exceeds Expectations': chartColors.sky,
  Outstanding: chartColors.green,
}

const PerformerList = ({ title, items, emptyText }: { title: string; items: Performer[]; emptyText: string }) => (
  <div className="rounded-2xl border border-border bg-surface p-5">
    <h3 className="font-semibold">{title}</h3>
    {items.length === 0 ? (
      <p className="mt-3 text-sm text-muted">{emptyText}</p>
    ) : (
      <ul className="mt-3 divide-y divide-border text-sm">
        {items.map((p) => (
          <li key={`${p.employeeCode}-${p.period}`} className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">{p.employeeName}</p>
              <p className="text-muted">{p.department} · {p.period}</p>
            </div>
            <span className="font-semibold">{p.overall.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
)

const PerformancePage = () => {
  const dispatch = useAppDispatch()
  const departments = useAppSelector((state) => state.department.items)
  const { reviews, pagination, metrics, employeeOptions, loading, saving, error } = useAppSelector((state) => state.performance)
  const downloading = useAppSelector((state) => state.report.downloading)

  const [year, setYear] = useState('')
  const [quarter, setQuarter] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [page, setPage] = useState(1)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PerformanceReview | null>(null)
  const [deleting, setDeleting] = useState<PerformanceReview | null>(null)

  const filters = {
    year: year ? Number(year) : undefined,
    quarter: quarter ? Number(quarter) : undefined,
    departmentId: departmentId ? Number(departmentId) : undefined,
  }

  const loadMetrics = useCallback(() => {
    dispatch(
      fetchMetricsHandler({
        year: year ? Number(year) : undefined,
        quarter: quarter ? Number(quarter) : undefined,
        departmentId: departmentId ? Number(departmentId) : undefined,
      }),
    )
  }, [dispatch, year, quarter, departmentId])

  const loadReviews = useCallback(() => {
    dispatch(
      fetchReviewsHandler({
        search: debouncedSearch.trim() || undefined,
        year: year ? Number(year) : undefined,
        quarter: quarter ? Number(quarter) : undefined,
        departmentId: departmentId ? Number(departmentId) : undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    )
  }, [dispatch, debouncedSearch, year, quarter, departmentId, page])

  useEffect(() => {
    dispatch(fetchDepartmentsHandler(undefined))
    dispatch(fetchEmployeeOptionsHandler())
  }, [dispatch])

  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  useEffect(() => {
    loadReviews()
  }, [loadReviews])

  const changeFilter = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  const refresh = () => {
    loadMetrics()
    loadReviews()
  }

  const handleExport = async (format: ReportFormat) => {
    try {
      await dispatch(downloadReportHandler({ report: 'performance', format, ...filters })).unwrap()
      toast.success('Report downloaded.')
    } catch (err) {
      toast.error((err as { error?: string }).error ?? 'Something went wrong.')
    }
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  const handleSubmit = async (data: ReviewPayload) => {
    try {
      const response = editing
        ? await dispatch(updateReviewHandler({ id: editing.id, data })).unwrap()
        : await dispatch(createReviewHandler(data)).unwrap()

      toast.success(response.message)
      closeForm()
      refresh()
    } catch (err) {
      toast.error((err as { error?: string }).error ?? 'Something went wrong.')
    }
  }

  const handleDelete = async () => {
    if (!deleting) return

    try {
      const response = await dispatch(deleteReviewHandler(deleting.id)).unwrap()
      toast.success(response.message)
      if (reviews.length === 1 && page > 1) setPage(page - 1)
      else loadReviews()
      loadMetrics()
    } catch (err) {
      toast.error((err as { error?: string }).error ?? 'Something went wrong.')
    } finally {
      setDeleting(null)
    }
  }

  const exportButton = (format: ReportFormat, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => handleExport(format)}
      disabled={downloading !== null}
      className="flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-page disabled:opacity-60"
    >
      {icon}
      {downloading === `performance-${format}` ? 'Preparing...' : label}
    </button>
  )

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Performance</h1>
          <p className="mt-1 text-sm text-muted">Quarterly reviews and performance metrics.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {exportButton('pdf', 'Export PDF', <IoDocumentTextOutline className="text-lg text-red-500" />)}
          {exportButton('excel', 'Export Excel', <IoGridOutline className="text-lg text-green-600" />)}
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            <IoAdd className="text-lg" />
            Add Review
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <select value={year} onChange={(e) => changeFilter(setYear)(e.target.value)} aria-label="Filter by year" className={controlClass}>
          <option value="">All years</option>
          {Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select value={quarter} onChange={(e) => changeFilter(setQuarter)(e.target.value)} aria-label="Filter by quarter" className={controlClass}>
          <option value="">All quarters</option>
          {[1, 2, 3, 4].map((q) => (
            <option key={q} value={q}>Q{q}</option>
          ))}
        </select>
        <select value={departmentId} onChange={(e) => changeFilter(setDepartmentId)(e.target.value)} aria-label="Filter by department" className={controlClass}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {metrics && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard label="Reviews" value={metrics.summary.reviewCount} />
            <StatCard label="Average rating" value={metrics.summary.averageOverall.toFixed(2)} hint="out of 5" />
            <StatCard label="Quality" value={metrics.summary.averageQuality.toFixed(2)} />
            <StatCard label="Productivity" value={metrics.summary.averageProductivity.toFixed(2)} />
            <StatCard label="Teamwork" value={metrics.summary.averageTeamwork.toFixed(2)} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <ChartCard title="Rating distribution" empty={metrics.summary.reviewCount === 0}>
              <ResponsiveContainer width="100%" height="100%">
                {/* Horizontal bars: the long rating names stay readable instead of overlapping on an x-axis */}
                <BarChart data={metrics.distribution} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Reviews" radius={[0, 6, 6, 0]}>
                    {metrics.distribution.map((b) => (
                      <Cell key={b.label} fill={distributionColors[b.label]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Average rating by department" empty={metrics.byDepartment.length === 0}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.byDepartment}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Bar dataKey="averageOverall" name="Average rating" fill={chartColors.primary} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Rating trend" description="Average rating per quarter (all periods)." empty={metrics.trend.length === 0}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Line dataKey="averageOverall" name="Average rating" stroke={chartColors.green} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PerformerList title="Top performers" items={metrics.topPerformers} emptyText="No reviews yet." />
            <PerformerList title="Needs improvement (below 3.0)" items={metrics.needsImprovement} emptyText="Nobody is below 3.0 for these filters." />
          </div>
        </>
      )}

      <h2 className="mb-3 mt-10 text-lg font-semibold">Reviews</h2>
      <input
        type="search"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(1)
        }}
        placeholder="Search employee name or code..."
        aria-label="Search reviews"
        className={`${controlClass} mb-4 h-11 w-full max-w-sm`}
      />

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        {loading && reviews.length === 0 ? (
          <Spinner />
        ) : error ? (
          <p className="p-6 text-sm text-red-500">{error}</p>
        ) : reviews.length === 0 ? (
          <p className="p-6 text-sm text-muted">No reviews found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-page text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 text-right font-medium">Quality</th>
                <th className="px-4 py-3 text-right font-medium">Productivity</th>
                <th className="px-4 py-3 text-right font-medium">Teamwork</th>
                <th className="px-4 py-3 text-right font-medium">Overall</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">{review.employeeName}</p>
                    <p className="text-muted">{review.employeeCode} · {review.departmentName}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{review.year} Q{review.quarter}</td>
                  <td className="px-4 py-3 text-right">{review.qualityScore}</td>
                  <td className="px-4 py-3 text-right">{review.productivityScore}</td>
                  <td className="px-4 py-3 text-right">{review.teamworkScore}</td>
                  <td className="px-4 py-3 text-right font-semibold">{review.overallRating.toFixed(2)}</td>
                  <td className="px-4 py-3"><RatingBadge label={review.ratingLabel} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(review)
                          setFormOpen(true)
                        }}
                        aria-label={`Edit review for ${review.employeeName} ${review.year} Q${review.quarter}`}
                        className="rounded-lg p-2 text-muted hover:bg-page hover:text-primary"
                      >
                        <IoCreateOutline className="text-lg" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(review)}
                        aria-label={`Delete review for ${review.employeeName} ${review.year} Q${review.quarter}`}
                        className="rounded-lg p-2 text-muted hover:bg-page hover:text-red-600"
                      >
                        <IoTrashOutline className="text-lg" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={pagination.page} totalPages={pagination.totalPages} totalCount={pagination.totalCount} pageSize={pagination.pageSize} onPageChange={setPage} />
      </div>

      {formOpen && (
        <Modal title={editing ? 'Edit Review' : 'Add Review'} onClose={closeForm}>
          <ReviewForm review={editing} employees={employeeOptions} saving={saving} onSubmit={handleSubmit} onCancel={closeForm} />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete review"
          message={`Delete the ${deleting.year} Q${deleting.quarter} review for ${deleting.employeeName}? This cannot be undone.`}
          loading={saving}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </section>
  )
}

export default PerformancePage
