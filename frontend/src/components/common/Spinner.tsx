import clsx from 'clsx'

const Spinner = ({ fullScreen = false }: { fullScreen?: boolean }) => (
  <div className={clsx('flex items-center justify-center', fullScreen ? 'min-h-screen' : 'py-10')} role="status">
    <span className="h-8 w-8 animate-spin rounded-full border-4 border-track border-t-primary" />
    <span className="sr-only">Loading...</span>
  </div>
)

export default Spinner
