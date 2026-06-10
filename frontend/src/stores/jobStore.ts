import { create } from 'zustand'

interface JobStore {
  isConnected: boolean
  setConnected: (v: boolean) => void
}

export const useJobStore = create<JobStore>((set) => ({
  isConnected: false,
  setConnected: (v) => set({ isConnected: v }),
}))
