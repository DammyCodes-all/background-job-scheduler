/* eslint-disable react-refresh/only-export-components */
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { CreateJobDialog } from '@/components/create-job-dialog'
import { useJobStream } from '@/hooks/useJobStream'
import { useJobStore } from '@/stores/jobStore'
import { TooltipProvider } from '@/components/ui/tooltip'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const [createOpen, setCreateOpen] = useState(false)
  const isConnected = useJobStore((s) => s.isConnected)

  useJobStream()

  return (
    <TooltipProvider delayDuration={400}>
    <div className="flex h-dvh overflow-hidden">
      <Sidebar onCreateClick={() => setCreateOpen(true)} />
      <main className="flex flex-1 flex-col overflow-y-auto bg-bg-base">
        <header className="flex h-9 shrink-0 items-center justify-end gap-2 border-b border-border-base px-4">
          <span
            className={`inline-block size-1.5 rounded-full ${
              isConnected ? 'bg-status-completed' : 'bg-status-failed'
            }`}
          />
          <span className="text-[11px] font-mono text-text-muted tabular-nums">
            {isConnected ? 'connected' : 'disconnected'}
          </span>
        </header>
        <div className="flex-1">
          <Outlet />
        </div>
      </main>
      <CreateJobDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
    </TooltipProvider>
  )
}
