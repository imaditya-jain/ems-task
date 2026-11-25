import clsx from 'clsx'

interface DotMatrixChartProps {
  /** One value (0-1) per column; null means "no data" and draws an empty column. */
  values: (number | null)[]
  rows?: number
  label: string
}

/** A dotted bar chart: each column lights up a number of dots proportional to its value. */
const DotMatrixChart = ({ values, rows = 8, label }: DotMatrixChartProps) => (
  <div
    role="img"
    aria-label={label}
    className="grid items-end gap-x-[3px]"
    style={{ gridTemplateColumns: `repeat(${Math.max(values.length, 1)}, minmax(0, 1fr))` }}
  >
    {values.map((value, column) => {
      const lit = value == null ? 0 : Math.round(value * rows)

      return (
        <div key={column} className="flex flex-col-reverse items-center gap-[3px]">
          {Array.from({ length: rows }, (_, row) => (
            <span key={row} className={clsx('aspect-square w-full max-w-[9px] rounded-full', row < lit ? 'bg-teal' : 'bg-track')} />
          ))}
        </div>
      )
    })}
  </div>
)

export default DotMatrixChart
