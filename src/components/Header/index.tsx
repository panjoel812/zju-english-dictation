import type { PropsWithChildren } from 'react'
import type React from 'react'
import { NavLink } from 'react-router-dom'

const Header: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <header className="container z-20 mx-auto w-full px-3 py-3 sm:px-6 sm:py-5 lg:px-10 lg:py-6">
      <div className="flex w-full flex-col items-stretch justify-between gap-3 lg:flex-row lg:items-center">
        <NavLink className="text-xl font-bold text-indigo-500 no-underline hover:no-underline sm:text-2xl lg:text-4xl" to="/">
          <h1>大学英语默写器</h1>
        </NavLink>
        <nav className="my-card on element flex w-full flex-wrap content-center items-center justify-center gap-2 rounded-xl bg-white p-2 transition-colors duration-300 dark:bg-gray-800 sm:gap-3 sm:p-3 lg:w-auto lg:justify-end lg:p-4">
          {children}
        </nav>
      </div>
    </header>
  )
}

export default Header
