import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import DotMatrixChart from '@/components/dashboard/DotMatrixChart'
import HeroStats from '@/components/dashboard/HeroStats'
import PresenceCards from '@/components/dashboard/PresenceCards'
import ProgressRing from '@/components/dashboard/ProgressRing'
import SpotlightCard from '@/components/dashboard/SpotlightCard'
import WorkforceCard from '@/components/dashboard/WorkforceCard'
import type { DashboardData } from '@/lib/features/dashboard.feature'
import type { Overview } from '@/types'

const overview: Overview = {
  totalEmployees: 30,
  activeEmployees: 28,
  inactiveEmployees: 2,
  departments: 5,
  newHiresThisMonth: 3,
  monthlyPayroll: 2000000,
  averageSalary: 71000,
  todayAttendance: { date: '2026-11-26', present: 20, late: 2, halfDay: 1, leave: 2, absent: 1, notMarked: 2 },
}

describe('DotMatrixChart', () => {
  it('lights dots in proportion to each value and leaves "no data" columns empty', () => {
    const { container } = render(<DotMatrixChart values={[1, 0.5, null]} rows={8} label="chart" />)

    const columns = [...container.querySelectorAll('[role="img"] > div')]
    const lit = columns.map((column) => column.querySelectorAll('.bg-teal').length)

    expect(columns).toHaveLength(3)
    expect(lit).toEqual([8, 4, 0])
  })

  it('has an accessible label', () => {
    render(<DotMatrixChart values={[0.5]} label="Daily attendance rate" />)

    expect(screen.getByRole('img', { name: 'Daily attendance rate' })).toBeInTheDocument()
  })
})

describe('ProgressRing', () => {
  it('draws the arc for the given fraction and clamps out-of-range values', () => {
    const { container, rerender } = render(<ProgressRing value={0.25} size={100} stroke={10} />)
    const arc = () => container.querySelectorAll('circle')[1]
    const circumference = 2 * Math.PI * 45

    expect(Number(arc().getAttribute('stroke-dashoffset'))).toBeCloseTo(circumference * 0.75)

    rerender(<ProgressRing value={5} size={100} stroke={10} />)
    expect(Number(arc().getAttribute('stroke-dashoffset'))).toBeCloseTo(0)

    rerender(<ProgressRing value={-1} size={100} stroke={10} />)
    expect(Number(arc().getAttribute('stroke-dashoffset'))).toBeCloseTo(circumference)
  })

  it('shows its content in the middle', () => {
    render(<ProgressRing value={0.5}>26/28</ProgressRing>)

    expect(screen.getByText('26/28')).toBeInTheDocument()
  })
})

describe('PresenceCards', () => {
  it('splits active employees into "at work" and "away" percentages', () => {
    render(
      <MemoryRouter>
        <PresenceCards overview={overview} />
      </MemoryRouter>,
    )

    // present 20 + late 2 + half-day 1 = 23 of 28 active = 82%; away = leave 2 + absent 1 = 3 = 11%
    expect(screen.getByText('82%')).toBeInTheDocument()
    expect(screen.getByText('23 people')).toBeInTheDocument()
    expect(screen.getByText('11%')).toBeInTheDocument()
    expect(screen.getByText('3 people')).toBeInTheDocument()
    expect(screen.getByText('2 on leave · 1 absent')).toBeInTheDocument()
  })

  it('does not divide by zero when there are no active employees', () => {
    render(
      <MemoryRouter>
        <PresenceCards overview={{ ...overview, activeEmployees: 0 }} />
      </MemoryRouter>,
    )

    expect(screen.getAllByText('0%')).toHaveLength(2)
  })
})

describe('HeroStats', () => {
  const data = {
    overview,
    hiring: { points: [{ month: '2026-10', hires: 1, headcount: 27 }, { month: '2026-11', hires: 3, headcount: 30 }], totalHires: 4, averageHiresPerMonth: 1.3, peakMonth: '2026-11' },
    performance: { summary: { reviewCount: 94, averageOverall: 3.26, averageQuality: 3, averageProductivity: 3, averageTeamwork: 3 } },
  } as unknown as DashboardData

  it('shows the headline numbers with their badges', () => {
    render(<HeroStats data={data} />)

    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('93%')).toBeInTheDocument() // 28 of 30 are active
    expect(screen.getByText('+2 vs last')).toBeInTheDocument() // 3 hires this month vs 1 last month
    expect(screen.getByText('3.3')).toBeInTheDocument()
    expect(screen.getByText('94 reviews')).toBeInTheDocument()
  })

  it('shows a dash instead of a rating when nobody has been reviewed', () => {
    const none = { ...data, performance: { summary: { reviewCount: 0, averageOverall: 0 } } } as unknown as DashboardData

    render(<HeroStats data={none} />)

    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('WorkforceCard', () => {
  const series = (department: string, current: number) => ({ department, headcount: [current], current, change: 0, growthPercent: null })

  it('shows each department share and groups small ones as "Others"', () => {
    render(
      <MemoryRouter>
        <WorkforceCard growth={{ months: ['2026-11'], departments: [series('Eng', 10), series('HR', 5), series('Sales', 3), series('Ops', 1), series('Fin', 1)] }} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Eng')).toBeInTheDocument()
    expect(screen.getByText('Others')).toBeInTheDocument()
    expect(screen.getByText('10 · 50%')).toBeInTheDocument()
    expect(screen.getByText('2 · 10%')).toBeInTheDocument() // Ops + Fin
  })

  it('shows an empty state when there are no employees', () => {
    render(
      <MemoryRouter>
        <WorkforceCard growth={{ months: [], departments: [] }} />
      </MemoryRouter>,
    )

    expect(screen.getByText('No employees yet.')).toBeInTheDocument()
  })
})

describe('SpotlightCard', () => {
  it('highlights the top performer', () => {
    render(
      <MemoryRouter>
        <SpotlightCard performer={{ employeeCode: 'EMP-1', employeeName: 'Isha Desai', department: 'HR', period: '2026 Q4', overall: 4.67 }} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Isha Desai')).toBeInTheDocument()
    expect(screen.getByText('4.67 rating')).toBeInTheDocument()
  })

  it('offers to add a review when there is nobody to highlight', () => {
    render(
      <MemoryRouter>
        <SpotlightCard performer={undefined} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Add a review' })).toHaveAttribute('href', '/performance')
  })
})
