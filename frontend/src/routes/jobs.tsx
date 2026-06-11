/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, } from "react";
import { useJobsQuery, useCancelJobMutation, useDeleteJobMutation, useJobStats } from "@/hooks/useJobQueries";
import { useJobStore } from "@/stores/jobStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, ClipboardListIcon, Delete01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { JobStatus } from "@/lib/api";

export const Route = createFileRoute("/jobs")({
  component: JobsPage,
});

const ALL_STATUSES: (JobStatus | "all")[] = [
  "all",
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
];

const statusBadge: Record<string, string> = {
  pending: "bg-status-pending/10 text-status-pending border-status-pending/20",
  processing: "bg-status-processing/10 text-status-processing border-status-processing/20",
  completed: "bg-status-completed/10 text-status-completed border-status-completed/20",
  failed: "bg-status-failed/10 text-status-failed border-status-failed/20",
  cancelled: "bg-status-cancelled/10 text-status-cancelled border-status-cancelled/20",
};

function priorityColor(p: number): string {
  if (p <= 1) return "text-status-failed";
  if (p <= 3) return "text-status-pending";
  return "text-status-completed";
}

function intervalLabel(interval: string | null): string {
  if (!interval) return "\u2014";
  return interval.replace(/_/g, " ");
}

function relTime(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

function fmtExact(dateStr: string): string {
  return format(new Date(dateStr), "MMM d, yyyy HH:mm:ss");
}

const TH = "text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground border-b border-border";
const HEADERS = [
  "ID",
  "Type",
  "Priority",
  "Status",
  "Retries",
  "Interval",
  "Started",
  "Completed",
  "Created",
  "Scheduled",
  "Actions",
];

function DateCell({ date }: { date: string | null }) {
  if (!date) return <span className="text-muted-foreground">{"\u2014"}</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-muted-foreground cursor-default">{relTime(date)}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start">
        {fmtExact(date)}
      </TooltipContent>
    </Tooltip>
  );
}

function IdCell({ id }: { id: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="font-mono text-[11px] text-muted-foreground cursor-default">
          {id.slice(0, 8)}
          {"\u2026"}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start">
        <span className="font-mono text-[11px]">{id}</span>
      </TooltipContent>
    </Tooltip>
  );
}

function JobsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const flashingIds = useJobStore((s) => s.flashingIds);
  const { data, isLoading } = useJobsQuery(page);
  const { data: stats } = useJobStats();
  const cancelJob = useCancelJobMutation();
  const deleteJob = useDeleteJobMutation();

  const allJobs = useMemo(() => data?.data ?? [], [data?.data]);
  const totalCounts = useMemo(() => {
    const counts: Record<string, number> = { all: stats?.total ?? 0 };
    for (const s of ALL_STATUSES) {
      if (s !== "all") {
        counts[s] = stats?.[s] ?? 0;
      }
    }
    return counts;
  }, [stats]);

  const filtered = useMemo(() => {
    return allJobs
      .filter((job) => statusFilter === "all" || job.status === statusFilter)
      .filter((job) => !search || job.type.toLowerCase().includes(search.toLowerCase()));
  }, [allJobs, statusFilter, search]);

  if (isLoading) {
    return (
      <div className="size-full space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <>
    <div className="size-full space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Jobs</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filtered.length === allJobs.length
              ? `${data?.total ?? 0} total`
              : `${filtered.length} of ${data?.total ?? 0}`}{" "}
            &mdash; page {page} of {data?.totalPages ?? 1}
          </p>
        </div>
        <div className="flex gap-2">
          {page > 1 && (
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
          )}
          {(data?.totalPages ?? 1) > page && (
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ToggleGroup
          type="single"
          value={statusFilter}
          onValueChange={(v) => v && setStatusFilter(v as JobStatus | "all")}
          variant="filter"
          size="xs"
        >
          {ALL_STATUSES.map((s) => (
            <ToggleGroupItem key={s} value={s} className="gap-1">
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              <span className="tabular-nums text-muted-foreground group-data-[state=on]/toggle:text-primary-foreground/70">
                {totalCounts[s]}
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="relative ml-auto w-52">
          <HugeiconsIcon
            icon={Search01Icon}
            strokeWidth={2}
            className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder={"Search by type\u2026"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 pl-7"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {HEADERS.map((h) => (
                <TableHead key={h} className={cn(TH, h === "Actions" && "w-28")}>
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((job) => (
              <TableRow
                key={job.id}
                className={cn(flashingIds.includes(job.id) && "animate-row-flash")}
              >
                <TableCell>
                  <IdCell id={job.id} />
                </TableCell>
                <TableCell className="font-medium text-foreground">{job.type}</TableCell>
                <TableCell>
                  <span
                    className={cn("font-mono text-xs tabular-nums", priorityColor(job.priority))}
                  >
                    {job.priority}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className={cn(statusBadge[job.status] ?? "", "border")} variant="outline">
                    {job.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                  <span className={job.retryCount >= job.maxRetries ? "text-status-failed" : ""}>
                    {job.retryCount}/{job.maxRetries}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {intervalLabel(job.interval)}
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums whitespace-nowrap text-muted-foreground">
                  <DateCell date={job.startedAt} />
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums whitespace-nowrap text-muted-foreground">
                  <DateCell date={job.completedAt} />
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums whitespace-nowrap text-muted-foreground">
                  <DateCell date={job.createdAt} />
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums whitespace-nowrap text-muted-foreground">
                  <DateCell date={job.scheduledAt} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1.5">
                    {job.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => cancelJob.mutate(job.id)}
                        title="Cancel"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3.5" />
                      </Button>
                    )}
                    {job.status !== "processing" && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeletingId(job.id)}
                        title="Delete"
                      >
                        <HugeiconsIcon
                          icon={Delete01Icon}
                          strokeWidth={2}
                          className="size-3.5 text-status-failed"
                        />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={HEADERS.length}
                  className="text-center py-12 text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <HugeiconsIcon icon={ClipboardListIcon} strokeWidth={1.5} className="size-8 text-muted-foreground/30" />
                    <span className="text-xs">
                      {search || statusFilter !== "all"
                        ? "No jobs match the current filters"
                        : "No jobs found"}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
      <AlertDialog open={!!deletingId} onOpenChange={(v) => { if (!v) setDeletingId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this job? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingId) deleteJob.mutate(deletingId)
                setDeletingId(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
