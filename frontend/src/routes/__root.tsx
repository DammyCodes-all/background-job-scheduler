/* eslint-disable react-refresh/only-export-components */
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { AppSidebar } from '@/components/layout/Sidebar'
import { CreateJobDialog } from '@/components/create-job-dialog'
import { useJobStream } from '@/hooks/useJobStream'
import { useJobStore } from '@/stores/jobStore'
import { TooltipProvider } from '@/components/ui/tooltip'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const [createOpen, setCreateOpen] = useState(false)
  const isConnected = useJobStore((s) => s.isConnected)

  useJobStream()

  return (
    <TooltipProvider delayDuration={400}>
    <SidebarProvider
      style={{ "--sidebar-width": "14rem" } as React.CSSProperties}>
      <AppSidebar onCreateClick={() => setCreateOpen(true)} />
      <SidebarInset className="min-w-0">
        <header className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-2">
          <SidebarTrigger className="size-7" />
          <div className="ml-auto flex items-center gap-2">
            <span
              className={`inline-block size-1.5 rounded-full ${
                isConnected ? 'bg-status-completed' : 'bg-status-failed'
              }`}
            />
            <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
              {isConnected ? 'connected' : 'disconnected'}
            </span>
          </div>
        </header>
        <div className="min-h-0 flex-1">
          <Outlet />
        </div>
      </SidebarInset>
      <CreateJobDialog open={createOpen} onOpenChange={setCreateOpen} />
    </SidebarProvider>
    </TooltipProvider>
  )
}
