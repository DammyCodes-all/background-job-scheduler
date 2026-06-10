import { Link, useLocation } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquareIcon,
  ClipboardListIcon,
  AlertTriangle,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";

const navItems = [
  { to: "/" as const, label: "Dashboard", icon: DashboardSquareIcon },
  { to: "/jobs" as const, label: "Jobs", icon: ClipboardListIcon },
  { to: "/dlq" as const, label: "Dead Letter Queue", icon: AlertTriangle },
] as const;

export function AppSidebar({ onCreateClick, isConnected }: { onCreateClick: () => void; isConnected: boolean }) {
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="gap-2 group-data-[collapsible=icon]:justify-center">
              <HugeiconsIcon icon={ClipboardListIcon} strokeWidth={1.5} className="size-5 text-primary" />
              <span className="font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
                Job Scheduler
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map(({ to, label, icon }) => {
              const active = location.pathname === to;
              return (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton asChild isActive={active} tooltip={label}>
                    <Link to={to}>
                      <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-4 shrink-0" />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2 space-y-2">
        <Button onClick={onCreateClick} className="w-full gap-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0" size="sm">
          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} className="size-3.5 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">Create Job</span>
        </Button>
        <div className="flex items-center gap-2 px-2 group-data-[collapsible=icon]:justify-center">
          <span
            className={`inline-block size-1.5 shrink-0 rounded-full motion-safe:transition-colors ${
              isConnected
                ? 'bg-status-completed motion-safe:animate-pulse'
                : 'bg-muted-foreground/40'
            }`}
          />
          <span className="text-[10px] font-mono text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
            {isConnected ? 'connected' : 'disconnected'}
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
