import { describe, expect, it } from 'vitest'
import { firstNameOf, formatToday, greetingFor } from '@/utils/greeting'

describe('greetingFor', () => {
  it.each([
    [0, 'Good Morning'],
    [11, 'Good Morning'],
    [12, 'Good Afternoon'],
    [16, 'Good Afternoon'],
    [17, 'Good Evening'],
    [23, 'Good Evening'],
  ])('at %i:00 says "%s"', (hour, expected) => {
    expect(greetingFor(hour)).toBe(expected)
  })
})

describe('firstNameOf', () => {
  it('takes the first word', () => {
    expect(firstNameOf('Aditya Nitin Burse')).toBe('Aditya')
    expect(firstNameOf('  Asha  ')).toBe('Asha')
  })

  it('is empty when there is no name yet', () => {
    expect(firstNameOf(undefined)).toBe('')
  })
})

describe('formatToday', () => {
  it('formats like "Thu, 26 Nov 2026"', () => {
    expect(formatToday(new Date(2026, 10, 26))).toBe('Thu, 26 Nov 2026')
  })
})
