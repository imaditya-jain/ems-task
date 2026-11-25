import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IoArrowUpOutline } from 'react-icons/io5'

interface DashboardCardProps {
  title: string
  /** where the little arrow button in the corner goes */
  to?: string
  tone?: 'glass' | 'sage' | 'ink'
  className?: string
  children: ReactNode
}

const tones = {
  glass: 'border-glass-line bg-glass',
  sage: 'border-glass-line bg-sage',
  ink: 'border-black/10 bg-primary text-on-primary',
}

/** The rounded translucent card every dashboard widget sits in. */
const DashboardCard = ({ title, to, tone = 'glass', className, children }: DashboardCardProps) => (
  <section className={clsx('rounded-3xl border p-5 shadow-card backdrop-blur-xl backdrop-saturate-150 sm:p-6', tones[tone], className)}>
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className={clsx('text-sm font-medium', tone === 'ink' ? 'text-on-primary/80' : 'text-foreground')}>{title}</h2>
      {to && (
        <Link
          to={to}
          aria-label={`Open ${title}`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-on-accent transition hover:bg-accent-dark"
        >
          <IoArrowUpOutline className="rotate-45 text-base" />
        </Link>
      )}
    </div>
    {children}
  </section>
)

export default DashboardCard
