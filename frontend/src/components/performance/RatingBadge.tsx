import clsx from 'clsx'

const styles: Record<string, string> = {
  Outstanding: 'bg-green-100 text-green-700',
  'Exceeds Expectations': 'bg-sky-100 text-sky-700',
  'Meets Expectations': 'bg-slate-200 text-slate-700',
  'Needs Improvement': 'bg-red-100 text-red-700',
}

const RatingBadge = ({ label }: { label: string }) => (
  <span className={clsx('inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', styles[label])}>{label}</span>
)

export default RatingBadge
