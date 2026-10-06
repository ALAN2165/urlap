import { create } from 'zustand';
import { AdminAlert } from '@/types/admin';

interface AlertsState {
  alerts: AdminAlert[];
  setAlerts: (alerts: AdminAlert[]) => void;
  addAlert: (alert: AdminAlert) => void;
  updateAlertStatus: (id: string, status: AdminAlert['status']) => void;
}

export const useAlertsStore = create<AlertsState>((set) => ({
  alerts: [],
  setAlerts: (alerts) => set({ alerts }),
  addAlert: (alert) => set((s) => (s.alerts.some((a) => a.id === alert.id) ? s : { alerts: [alert, ...s.alerts] })),
  updateAlertStatus: (id, status) => set((s) => ({
    alerts: status === 'RESOLVED' ? s.alerts.filter((a) => a.id !== id) : s.alerts.map((a) => (a.id === id ? { ...a, status } : a)),
  })),
}));