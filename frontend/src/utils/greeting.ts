/** "Good Morning" / "Good Afternoon" / "Good Evening" for the given hour (0-23). */
export const greetingFor = (hour: number) => (hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening')

export const firstNameOf = (fullName: string | undefined) => fullName?.trim().split(/\s+/)[0] ?? ''

export const formatToday = (date: Date) =>
  date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
