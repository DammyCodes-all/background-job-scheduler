/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useDlqQuery, useRetryJobMutation } from "@/hooks/useJobQueries";
import { useJobStore } from "@/stores/jobStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { HugeiconsIcon } from "@hugeicons/react";
import { RedoIcon, Search01Icon, AlertTriangle } from "@hugeicons/core-free-icons";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dlq")({
  component: DlqPage,
});

const TH = "text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground bg-muted/30 border-b border-border";
const HEADERS = ["ID", "Type", "Error", "Retries", "Failed At", "Actions"];

function relTime(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

function fmtExact(dateStr: string): string {
  return format(new Date(dateStr), "MMM d, yyyy HH:mm:ss");
}

function DateCell({ date }: { date: string | null }) {
  if (!date) return <span className="text-muted-foreground">{'\u2014'}</span>;
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
          {id.slice(0, 8)}{'\u2026'}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start">
        <span className="font-mono text-[11px]">{id}</span>
      </TooltipContent>
    </Tooltip>
  );
}

function DlqPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const flashingIds = useJobStore((s) => s.flashingIds);
  const { data, isLoading } = useDlqQuery(page);
  const retryJob = useRetryJobMutation();

  const allJobs = useMemo(() => data?.data ?? [], [data?.data]);

  const filtered = useMemo(() => {
    if (!search) return allJobs;
    const q = search.toLowerCase();
    return allJobs.filter(
      (job) =>
        job.type.toLowerCase().includes(q) ||
        (job.errorMessage ?? "").toLowerCase().includes(q),
    );
  }, [allJobs, search]);

  if (isLoading) {
    return (
      <div className="size-full space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="size-full space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Dead Letter Queue</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data?.total ?? 0} failed jobs awaiting resolution
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

      {(data?.total ?? 0) >= 10 && (
        <div className="flex items-center gap-2 rounded-lg border border-status-failed/30 bg-status-failed/10 px-3 py-2 text-xs text-status-failed">
          <HugeiconsIcon icon={AlertTriangle} strokeWidth={2} className="size-4 shrink-0" />
          <span>
            High failure rate detected — <strong>{data?.total}</strong> jobs in the dead letter queue.
            Action recommended.
          </span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative ml-auto w-52">
          <HugeiconsIcon
            icon={Search01Icon}
            strokeWidth={2}
            className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder={"Search by type or error\u2026"}
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
                <TableHead key={h} className={cn(TH, h === "Actions" && "w-24")}>
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((job) => {
              const isExpanded = expandedId === job.id;
              const isConfirming = confirmingId === job.id;
              return (
                <TableRow
                  key={job.id}
                  className={cn(flashingIds.includes(job.id) && "animate-row-flash")}
                >
                  <TableCell>
                    <IdCell id={job.id} />
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{job.type}</TableCell>
                  <TableCell className="max-w-xs">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : job.id)}
                      className="w-full cursor-pointer text-left"
                    >
                      <code
                        className={cn(
                          "text-xs font-mono text-status-failed",
                          !isExpanded && "line-clamp-2",
                        )}
                      >
                        {job.errorMessage ?? "Unknown error"}
                      </code>
                      {isExpanded && (
                        <pre className="mt-1.5 rounded bg-muted p-2 text-[11px] text-foreground whitespace-pre-wrap break-all">
                          {job.errorMessage ?? "Unknown error"}
                        </pre>
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                    <span className={job.retryCount >= job.maxRetries ? "text-status-failed" : ""}>
                      {job.retryCount}/{job.maxRetries}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums whitespace-nowrap text-muted-foreground">
                    <DateCell date={job.completedAt} />
                  </TableCell>
                  <TableCell>
                    {isConfirming ? (
                      <div className="flex gap-1">
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={() => {
                            retryJob.mutate(job.id);
                            setConfirmingId(null);
                          }}
                          disabled={retryJob.isPending}
                        >
                          Confirm retry
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setConfirmingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => setConfirmingId(job.id)}
                        disabled={retryJob.isPending}
                        className="gap-1"
                      >
                        <HugeiconsIcon icon={RedoIcon} strokeWidth={2} className="size-3" />
                        Retry
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={HEADERS.length} className="text-center py-8 text-muted-foreground">
                  {search
                    ? "No DLQ entries match the current search"
                    : "No jobs in the dead letter queue"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
