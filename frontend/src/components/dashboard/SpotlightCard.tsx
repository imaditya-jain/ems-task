import { Link } from 'react-router-dom'
import { IoStar } from 'react-icons/io5'
import Avatar from '@/components/common/Avatar'
import type { Performer } from '@/types'

/** A big highlight card for the best-rated employee. The swirl is pure decoration. */
const SpotlightCard = ({ performer, className }: { performer: Performer | undefined; className?: string }) => (
  <section className={`relative flex min-h-72 flex-col overflow-hidden rounded-3xl border border-glass-line bg-sage p-5 shadow-card sm:p-6 ${className ?? ''}`}>
    <svg viewBox="0 0 240 200" className="pointer-events-none absolute -right-12 top-8 w-56 opacity-95" aria-hidden="true">
      <path d="M-10 120 C 40 20, 120 10, 150 70 S 130 180, 210 120" fill="none" stroke="#e4f568" strokeWidth="26" strokeLinecap="round" />
    </svg>

    <h2 className="relative text-sm font-medium">Employee spotlight</h2>

    {performer ? (
      <div className="relative mt-auto">
        <Avatar name={performer.employeeName} className="mb-4 h-20 w-20 bg-white text-2xl shadow-card" />
        <p className="text-xl font-semibold leading-tight">{performer.employeeName}</p>
        <p className="mt-1 text-sm text-foreground/70">
          Top performer · {performer.department} · {performer.period}
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-glass px-3 py-1 text-sm font-medium">
          <IoStar className="text-[#e2a23b]" />
          {performer.overall.toFixed(2)} rating
        </p>
      </div>
    ) : (
      <div className="relative mt-auto">
        <p className="text-sm text-foreground/70">No performance reviews yet.</p>
        <Link to="/performance" className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary">
          Add a review
        </Link>
      </div>
    )}
  </section>
)

export default SpotlightCard
