/** One palette for every chart so the app looks consistent. */
export const chartColors = {
  primary: '#2f3e39',
  green: '#4fae8b',
  amber: '#e2a23b',
  sky: '#5aa6d4',
  violet: '#8d7fd1',
  red: '#e0675a',
  slate: '#a3aea8',
}

export const seriesColors = [chartColors.primary, chartColors.green, chartColors.amber, chartColors.sky, chartColors.violet, chartColors.red, '#2aa198', '#d6609a']

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
