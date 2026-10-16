import IconGithub from '~icons/simple-icons/github'

export default function ProjectFooter() {
  return (
    <footer className="flex w-full shrink-0 items-center justify-center px-4 pt-2">
      <a
        href="https://github.com/panjoel812/zju-english-dictation"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub 项目（新标签页打开）"
        className="inline-flex min-h-[44px] max-w-full items-center gap-2 rounded px-2 text-xs leading-5 text-gray-500 underline-offset-4 hover:text-gray-800 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <IconGithub className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 break-words">GitHub / zju-english-dictation</span>
      </a>
    </footer>
  )
}
