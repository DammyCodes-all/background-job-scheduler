import { format } from "date-fns";
import { useState, useRef, type KeyboardEvent } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FlowIcon,
  FileCodeIcon,
  ClockIcon,
  LinkIcon,
  Cancel01Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";
import CodeEditor from "@uiw/react-textarea-code-editor";
import { cn } from "@/lib/utils";
import { useCreateJobMutation } from "@/hooks/useJobQueries";
import type { JobInterval } from "@/lib/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const intervals: { value: JobInterval | "none"; label: string }[] = [
  { value: "none", label: "One-shot (no interval)" },
  { value: "every_1_minute", label: "Every 1 minute" },
  { value: "every_5_minutes", label: "Every 5 minutes" },
  { value: "every_15_minutes", label: "Every 15 minutes" },
  { value: "every_30_minutes", label: "Every 30 minutes" },
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const priorityOptions = [
  { value: "1", label: "High", desc: "Urgent" },
  { value: "3", label: "Medium", desc: "Normal" },
  { value: "5", label: "Low", desc: "Best effort" },
] as const;

export function CreateJobDialog({ open, onOpenChange }: Props) {
  const [type, setType] = useState("");
  const [priority, setPriority] = useState("3");
  const [maxRetries, setMaxRetries] = useState("3");
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState("");
  const [intervalVal, setIntervalVal] = useState<string>("none");
  const [payload, setPayload] = useState("");
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [depIds, setDepIds] = useState<string[]>([]);
  const [depInput, setDepInput] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const depInputRef = useRef<HTMLInputElement>(null);

  const mutation = useCreateJobMutation();

  function validatePayload(val: string) {
    if (!val.trim()) {
      setPayloadError(null);
      return;
    }
    try {
      JSON.parse(val);
      setPayloadError(null);
    } catch {
      setPayloadError("Invalid JSON");
    }
  }

  function addDepId(id: string) {
    const trimmed = id.trim();
    if (trimmed && !depIds.includes(trimmed)) {
      setDepIds([...depIds, trimmed]);
    }
  }

  function removeDepId(id: string) {
    setDepIds(depIds.filter((d) => d !== id));
  }

  function handleDepKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addDepId(depInput);
      setDepInput("");
    }
    if (e.key === "Backspace" && !depInput && depIds.length > 0) {
      setDepIds((prev) => prev.slice(0, -1));
    }
  }

  async function handleSubmit() {
    if (!type.trim()) return;

    if (payload.trim()) {
      try {
        JSON.parse(payload);
      } catch {
        setPayloadError("Invalid JSON");
        return;
      }
    }

    try {
      await mutation.mutateAsync({
        type: type.trim(),
        priority: Number(priority),
        maxRetries: Number(maxRetries),
        scheduledAt: scheduledAt
          ? (() => {
              const d = new Date(scheduledAt);
              if (scheduledTime) {
                const [h, m] = scheduledTime.split(":").map(Number);
                d.setHours(h, m, 0, 0);
              }
              return d.toISOString();
            })()
          : undefined,
        interval: intervalVal === "none" ? undefined : (intervalVal as JobInterval),
        payload: payload ? JSON.parse(payload) : undefined,
        dependency_ids: depIds.length > 0 ? depIds : undefined,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create job");
      return;
    }

    setType("");
    setPriority("3");
    setMaxRetries("3");
    setScheduledAt(undefined);
    setScheduledTime("");
    setIntervalVal("none");
    setPayload("");
    setPayloadError(null);
    setDepIds([]);
    setDepInput("");
    setSubmitError(null);
    onOpenChange(false);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (v) setSubmitError(null);
        onOpenChange(v);
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <HugeiconsIcon icon={FlowIcon} strokeWidth={2.5} className="size-4 text-primary" />
            </div>
            <div>
              <SheetTitle>Create Job</SheetTitle>
              <SheetDescription>Schedule a new background job</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Job Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon
                icon={FlowIcon}
                strokeWidth={2.5}
                className="size-3.5 text-muted-foreground"
              />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Job Details
              </span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="type" className="text-xs font-medium">
                Type <span className="text-status-failed">*</span>
              </Label>
              <Input
                id="type"
                placeholder="e.g. send_email, process_payment"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Priority</Label>
              <div className="flex rounded-md border border-border overflow-hidden">
                {priorityOptions.map((opt, i) => {
                  const active = priority === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPriority(opt.value)}
                      className={cn(
                        "flex-1 px-3 py-1.5 text-xs font-medium transition-colors",
                        i > 0 && "border-l border-border",
                        active
                          ? "bg-chart-2/80 font-semibold text-white"
                          : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <span>{opt.label}</span>
                      <span
                        className={cn(
                          "ml-1.5 text-[10px]",
                          active ? "text-white/90" : "text-muted-foreground",
                        )}
                      >
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="maxRetries" className="text-xs font-medium">
                Max Retries
              </Label>
              <Input
                id="maxRetries"
                type="number"
                min={0}
                max={20}
                value={maxRetries}
                onChange={(e) => setMaxRetries(e.target.value)}
                className="h-8"
              />
              <p className="text-[10px] text-muted-foreground">Before moving to DLQ</p>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon
                icon={ClockIcon}
                strokeWidth={2.5}
                className="size-3.5 text-muted-foreground"
              />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Schedule
              </span>
            </div>

            <FieldGroup className="flex-row">
              <Field>
                <FieldLabel>Date</FieldLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-32 justify-between font-normal h-8">
                      {scheduledAt ? format(scheduledAt, "PPP") : "Select date"}
                      <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="size-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledAt}
                      defaultMonth={scheduledAt}
                      onSelect={(d) => {
                        setScheduledAt(d);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </Field>
              <Field className="w-32">
                <FieldLabel>Time</FieldLabel>
                <Input
                  type="time"
                  value={scheduledTime}
                  step={1}
                  defaultValue="10:30:00"
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="h-8 appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
              </Field>
            </FieldGroup>

            <div className="space-y-1.5">
              <Label htmlFor="interval" className="text-xs font-medium">
                Interval
              </Label>
              <Select value={intervalVal} onValueChange={setIntervalVal}>
                <SelectTrigger className="w-full h-8">
                  <SelectValue placeholder="One-shot (no interval)" />
                </SelectTrigger>
                <SelectContent>
                  {intervals.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dependencies */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon
                icon={LinkIcon}
                strokeWidth={2.5}
                className="size-3.5 text-muted-foreground"
              />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Dependencies
              </span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="depIds" className="text-xs font-medium">
                Dependency IDs
              </Label>
              <div
                className={cn(
                  "flex min-h-8 flex-wrap items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 transition-colors",
                  "focus-within:ring-2 focus-within:ring-ring/30",
                )}
              >
                {depIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 text-xs font-medium text-foreground"
                  >
                    {id}
                    <button
                      type="button"
                      onClick={() => removeDepId(id)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3" />
                    </button>
                  </span>
                ))}
                <input
                  ref={depInputRef}
                  value={depInput}
                  onChange={(e) => setDepInput(e.target.value)}
                  onKeyDown={handleDepKeyDown}
                  placeholder={depIds.length === 0 ? "Type ID and press Enter\u2026" : ""}
                  className="min-w-[80px] flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Job will wait until these jobs complete
              </p>
            </div>
          </div>

          {/* Payload */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon
                icon={FileCodeIcon}
                strokeWidth={2.5}
                className="size-3.5 text-muted-foreground"
              />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Payload
              </span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payload" className="text-xs font-medium">
                JSON Payload
              </Label>
              <div
                className={cn(
                  "rounded-md border overflow-hidden transition-colors focus-within:ring-2",
                  payloadError
                    ? "border-status-failed/50 focus-within:ring-status-failed/30"
                    : "border-border focus-within:ring-ring/30",
                )}
              >
                <CodeEditor
                  value={payload}
                  language="json"
                  placeholder='{ "key": "value" }'
                  onChange={(e) => setPayload(e.target.value)}
                  onBlur={() => validatePayload(payload)}
                  data-color-mode="dark"
                  padding={10}
                  minHeight={96}
                  style={{
                    fontSize: 12,
                    fontFamily:
                      "ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace",
                    backgroundColor: "var(--color-muted)",
                  }}
                />
              </div>
              {payloadError ? (
                <p className="text-[10px] text-status-failed">{payloadError}</p>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Optional JSON data passed to the job handler
                </p>
              )}
            </div>
          </div>
        </div>

        {submitError && (
          <div className="px-6 py-2 bg-status-failed/10 border-t border-status-failed/20">
            <p className="text-[11px] text-status-failed">{submitError}</p>
          </div>
        )}
        <SheetFooter className="px-6 py-4 border-t border-border mt-auto">
          <div className="flex w-full gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!type.trim() || mutation.isPending}
              className="flex-1"
            >
              {mutation.isPending ? "Creating\u2026" : "Create Job"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
