import { create } from 'zustand'

interface NetworkState {
  status: 'Connected' | 'Connecting' | 'Disconnected'
  setStatus: (status: 'Connected' | 'Connecting' | 'Disconnected') => void
}

export const useNetworkStore = create<NetworkState>((set) => ({
  status: 'Connected',
  setStatus: (status) => set({ status }),
}))