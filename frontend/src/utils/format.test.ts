import { describe, expect, it } from 'vitest'
import { formatCurrency, formatDate } from '@/utils/format'

describe('formatCurrency', () => {
  it('formats rupees with Indian digit grouping', () => {
    expect(formatCurrency(85000.5)).toBe('₹85,000.50')
    expect(formatCurrency(1234567)).toBe('₹12,34,567.00')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('₹0.00')
  })
})

describe('formatDate', () => {
  it('formats yyyy-MM-dd as dd Mon yyyy', () => {
    expect(formatDate('2022-06-01')).toBe('01 Jun 2022')
  })

  it('does not shift the day because of the time zone', () => {
    expect(formatDate('2024-12-31')).toBe('31 Dec 2024')
    expect(formatDate('2024-01-01')).toBe('01 Jan 2024')
  })
})
