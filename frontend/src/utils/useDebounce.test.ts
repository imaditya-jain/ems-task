import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebounce } from '@/utils/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('a', 400))

    expect(result.current).toBe('a')
  })

  it('only updates after the delay has passed without further changes', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 400), { initialProps: { value: 'a' } })

    rerender({ value: 'ab' })
    act(() => {
      vi.advanceTimersByTime(399)
    })
    expect(result.current).toBe('a')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('ab')
  })

  it('restarts the timer on every change, so only the last value is emitted', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 400), { initialProps: { value: 'a' } })

    rerender({ value: 'ab' })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    rerender({ value: 'abc' })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe('a')

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBe('abc')
  })
})
