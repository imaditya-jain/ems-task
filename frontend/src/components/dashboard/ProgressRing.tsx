interface ProgressRingProps {
  /** 0-1 */
  value: number
  size?: number
  stroke?: number
  children?: React.ReactNode
}

/** A circular progress ring with content (usually a number) in the middle. */
const ProgressRing = ({ value, size = 168, stroke = 12, children }: ProgressRingProps) => {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(Math.max(value, 0), 1)

  return (
    <div className="relative mx-auto" style={{ width: size, height: size, maxWidth: '100%' }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          className="stroke-primary transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

export default ProgressRing
