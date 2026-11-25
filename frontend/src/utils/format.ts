const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })

export const formatCurrency = (value: number) => currencyFormatter.format(value)

/** "2022-06-01" -> "01 Jun 2022". Dates arrive as plain yyyy-MM-dd, so parse manually to avoid timezone shifts. */
export const formatDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
