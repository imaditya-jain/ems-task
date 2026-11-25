/** One palette for every chart so the app looks consistent. */
export const chartColors = {
  primary: '#4f46e5',
  green: '#16a34a',
  amber: '#d97706',
  sky: '#0284c7',
  violet: '#7c3aed',
  red: '#dc2626',
  slate: '#94a3b8',
}

export const seriesColors = [chartColors.primary, chartColors.green, chartColors.amber, chartColors.sky, chartColors.violet, chartColors.red, '#0d9488', '#db2777']

export const attendanceColors = {
  present: chartColors.green,
  late: chartColors.amber,
  halfDay: chartColors.sky,
  leave: chartColors.violet,
  absent: chartColors.red,
}

export const formatMonthLabel = (month: string) => {
  const [year, m] = month.split('-').map(Number)
  return new Date(year, m - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

export const formatPercent = (fraction: number | null | undefined) => (fraction == null ? '—' : `${(fraction * 100).toFixed(1)}%`)
