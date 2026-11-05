import type { PropsWithChildren, ReactNode } from 'react'
import type React from 'react'
import { NavLink } from 'react-router-dom'

const Header: React.FC<PropsWithChildren<{ actions?: ReactNode }>> = ({ children, actions }) => (
  <header className="container relative z-30 mx-auto w-full px-3 py-3 sm:px-6 sm:py-5 lg:px-10 lg:py-6">
    <div className="flex w-full flex-col items-stretch justify-between gap-3 xl:flex-row xl:items-center xl:gap-6">
      <NavLink className="shrink-0 text-xl font-bold text-indigo-500 no-underline hover:no-underline sm:text-2xl xl:text-3xl" to="/">
        <h1>Lexi</h1>
      </NavLink>
      <nav
        aria-label="练习导航"
        className="my-card relative flex min-w-0 flex-wrap items-center justify-center gap-2 rounded-xl bg-white p-2 dark:bg-gray-800 sm:justify-end sm:p-3 xl:flex-1"
      >
        {children}
        {actions && (
          <div className="ml-auto flex shrink-0 items-center gap-1 border-l border-gray-200 pl-2 dark:border-gray-700 sm:ml-0">
            {actions}
          </div>
        )}
      </nav>
    </div>
  </header>
)

export default Header
