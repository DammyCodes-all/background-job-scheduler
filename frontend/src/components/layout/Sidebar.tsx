import { Link, useLocation } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquareIcon,
  ClipboardListIcon,
  AlertTriangle,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/" as const, label: "Dashboard", icon: DashboardSquareIcon },
  { to: "/jobs" as const, label: "Jobs", icon: ClipboardListIcon },
  { to: "/dlq" as const, label: "Dead Letter Queue", icon: AlertTriangle },
] as const;

export function Sidebar({ onCreateClick }: { onCreateClick: () => void }) {
  const location = useLocation();

  return (
    <aside className="flex h-full w-56 flex-col border-r border-border-base bg-bg-surface">
      <div className="flex h-12 items-center gap-2 border-b border-border-base px-4">
        <HugeiconsIcon icon={ClipboardListIcon} strokeWidth={1.5} className="size-4 text-accent" />
        <span className="text-sm font-semibold tracking-tight text-text-primary">
          Job Scheduler
        </span>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map(({ to, label, icon }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2 rounded-md cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-accent-subtle text-accent"
                  : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
              }`}
            >
              <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border-base p-2">
        <Button onClick={onCreateClick} className="w-full gap-1.5 cursor-pointer" size="sm">
          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} className="size-3.5" />
          Create Job
        </Button>
      </div>
    </aside>
  );
}
