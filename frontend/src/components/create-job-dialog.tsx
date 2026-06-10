import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useCreateJobMutation } from '@/hooks/useJobQueries'
import { HugeiconsIcon } from '@hugeicons/react'
import { FlowIcon, SettingsIcon, FileCodeIcon } from '@hugeicons/core-free-icons'
import type { JobInterval } from '@/lib/api'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const intervals: { value: JobInterval | 'none'; label: string }[] = [
  { value: 'none', label: 'One-shot (no interval)' },
  { value: 'every_1_minute', label: 'Every 1 minute' },
  { value: 'every_5_minutes', label: 'Every 5 minutes' },
  { value: 'every_15_minutes', label: 'Every 15 minutes' },
  { value: 'every_30_minutes', label: 'Every 30 minutes' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

export function CreateJobDialog({ open, onOpenChange }: Props) {
  const [type, setType] = useState('')
  const [priority, setPriority] = useState('1')
  const [maxRetries, setMaxRetries] = useState('3')
  const [intervalVal, setIntervalVal] = useState<string>('none')
  const [payload, setPayload] = useState('')

  const mutation = useCreateJobMutation()

  const handleSubmit = async () => {
    if (!type.trim()) return

    await mutation.mutateAsync({
      type: type.trim(),
      priority: Number(priority),
      maxRetries: Number(maxRetries),
      interval: intervalVal === 'none' ? undefined : (intervalVal as JobInterval),
      payload: payload ? JSON.parse(payload) : undefined,
    })

    setType('')
    setPriority('1')
    setMaxRetries('3')
    setIntervalVal('none')
    setPayload('')
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border-base">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-accent/10">
              <HugeiconsIcon icon={FlowIcon} strokeWidth={1.5} className="size-4 text-accent" />
            </div>
            <div>
              <SheetTitle>Create Job</SheetTitle>
              <SheetDescription>Schedule a new background job</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon icon={FlowIcon} strokeWidth={1.5} className="size-3.5 text-accent" />
              <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Job Details</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type" className="text-xs font-medium">Type <span className="text-status-failed">*</span></Label>
              <Input
                id="type"
                placeholder="e.g. send_email, process_payment"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-8"
              />
            </div>
          </div>

          <Separator className="bg-border-base" />

          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon icon={SettingsIcon} strokeWidth={1.5} className="size-3.5 text-accent" />
              <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Configuration</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="priority" className="text-xs font-medium">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  min={1}
                  max={100}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="h-8"
                />
                <p className="text-[10px] text-text-muted">Lower = higher priority</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maxRetries" className="text-xs font-medium">Max Retries</Label>
                <Input
                  id="maxRetries"
                  type="number"
                  min={0}
                  max={20}
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(e.target.value)}
                  className="h-8"
                />
                <p className="text-[10px] text-text-muted">Before moving to DLQ</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="interval" className="text-xs font-medium">Interval</Label>
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

          <Separator className="bg-border-base" />

          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon icon={FileCodeIcon} strokeWidth={1.5} className="size-3.5 text-accent" />
              <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Payload</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payload" className="text-xs font-medium">JSON Payload</Label>
              <textarea
                id="payload"
                placeholder='{ "key": "value" }'
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                rows={5}
                className="h-24 w-full min-w-0 rounded-md bg-bg-subtle px-2.5 py-2 text-xs font-mono transition-colors outline-none placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-accent/30 resize-y"
              />
              <p className="text-[10px] text-text-muted">Optional JSON data passed to the job handler</p>
            </div>
          </div>
        </div>

        <SheetFooter className="px-6 py-4 border-t border-border-base mt-auto">
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!type.trim() || mutation.isPending}
              className="flex-1"
            >
              {mutation.isPending ? 'Creating…' : 'Create Job'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
