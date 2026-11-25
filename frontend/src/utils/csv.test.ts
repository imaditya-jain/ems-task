import { describe, expect, it } from 'vitest'
import { parseCsv } from '@/utils/csv'

describe('parseCsv', () => {
  it('parses simple rows', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('handles Windows line endings', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('keeps commas that are inside quotes', () => {
    expect(parseCsv('name,address\nAsha,"12 Main St, Pune"')).toEqual([
      ['name', 'address'],
      ['Asha', '12 Main St, Pune'],
    ])
  })

  it('unescapes doubled quotes', () => {
    expect(parseCsv('note\n"She said ""hi"""')).toEqual([['note'], ['She said "hi"']])
  })

  it('keeps newlines that are inside quotes', () => {
    expect(parseCsv('note\n"line1\nline2"')).toEqual([['note'], ['line1\nline2']])
  })

  it('trims whitespace around fields', () => {
    expect(parseCsv(' a , b \n 1 , 2 ')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('skips blank lines', () => {
    expect(parseCsv('a,b\n\n1,2\n\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('keeps empty cells so columns stay aligned', () => {
    expect(parseCsv('a,b,c\n1,,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
    ])
  })

  it('returns an empty array for empty input', () => {
    expect(parseCsv('')).toEqual([])
  })

  it('handles a final row without a trailing newline', () => {
    expect(parseCsv('a\n1')).toEqual([['a'], ['1']])
  })
})
