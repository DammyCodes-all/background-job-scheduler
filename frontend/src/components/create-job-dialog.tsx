import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { useCreateJobMutation } from '@/hooks/useJobQueries'
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Job</DialogTitle>
          <DialogDescription>
            Schedule a new background job
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="type">Type *</Label>
            <Input
              id="type"
              placeholder="send_email"
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                min={1}
                max={100}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxRetries">Max Retries</Label>
              <Input
                id="maxRetries"
                type="number"
                min={0}
                max={20}
                value={maxRetries}
                onChange={(e) => setMaxRetries(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="interval">Interval</Label>
            <Select value={intervalVal} onValueChange={setIntervalVal}>
              <SelectTrigger className="w-full">
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

          <div className="space-y-1.5">
            <Label htmlFor="payload">Payload (JSON)</Label>
            <Input
              id="payload"
              placeholder='{"key": "value"}'
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!type.trim() || mutation.isPending}
          >
            {mutation.isPending ? 'Creating…' : 'Create Job'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
