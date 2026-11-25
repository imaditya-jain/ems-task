import clsx from 'clsx'

const palette = ['bg-[#cfe0d3]', 'bg-[#e5ddf3]', 'bg-[#f6e3c4]', 'bg-[#d3e6f3]', 'bg-[#f3d5d5]', 'bg-[#e4f1b8]']

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

/** A stable colour per name, so the same person always gets the same avatar. */
const colourFor = (name: string) => palette[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length]

interface AvatarProps {
  name: string
  className?: string
}

const Avatar = ({ name, className }: AvatarProps) => (
  <span
    aria-hidden="true"
    className={clsx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-on-accent', colourFor(name), className ?? 'h-9 w-9 text-xs')}
  >
    {initialsOf(name)}
  </span>
)

export default Avatar
