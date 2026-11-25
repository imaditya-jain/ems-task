import type { IconType } from 'react-icons'
import {
  IoBarChartOutline,
  IoBusinessOutline,
  IoCalendarOutline,
  IoDocumentTextOutline,
  IoGridOutline,
  IoPeopleOutline,
  IoRibbonOutline,
} from 'react-icons/io5'

export interface NavItem {
  label: string
  to: string
  icon: IconType
}

/** Single source of truth for the sidebar. */
export const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: IoGridOutline },
  { label: 'Employees', to: '/employees', icon: IoPeopleOutline },
  { label: 'Attendance', to: '/attendance', icon: IoCalendarOutline },
  { label: 'Performance', to: '/performance', icon: IoRibbonOutline },
  { label: 'Analytics', to: '/analytics', icon: IoBarChartOutline },
  { label: 'Departments', to: '/departments', icon: IoBusinessOutline },
  { label: 'Reports', to: '/reports', icon: IoDocumentTextOutline },
]
