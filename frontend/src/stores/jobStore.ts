import { create } from 'zustand'

interface JobStore {
  isConnected: boolean
  setConnected: (v: boolean) => void
  flashingIds: string[]
  addFlashingId: (id: string) => void
  removeFlashingId: (id: string) => void
}

export const useJobStore = create<JobStore>((set) => ({
  isConnected: false,
  setConnected: (v) => set({ isConnected: v }),
  flashingIds: [],
  addFlashingId: (id) =>
    set((s) => {
      if (s.flashingIds.includes(id)) return s
      return { flashingIds: [...s.flashingIds, id] }
    }),
  removeFlashingId: (id) =>
    set((s) => ({ flashingIds: s.flashingIds.filter((x) => x !== id) })),
}))
