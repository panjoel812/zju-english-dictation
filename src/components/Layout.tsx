import ProjectFooter from './ProjectFooter'
import type React from 'react'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col pb-4">
      <main className="flex w-full flex-1 flex-col items-center">{children}</main>
      <ProjectFooter />
    </div>
  )
}
