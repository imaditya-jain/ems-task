import type { IconType } from 'react-icons'
import { IoBusinessOutline, IoGridOutline, IoPeopleOutline } from 'react-icons/io5'

export interface NavItem {
  label: string
  to: string
  icon: IconType
}

/** Single source of truth for the sidebar. Feature branches add their links here. */
export const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: IoGridOutline },
  { label: 'Employees', to: '/employees', icon: IoPeopleOutline },
  { label: 'Departments', to: '/departments', icon: IoBusinessOutline },
]
