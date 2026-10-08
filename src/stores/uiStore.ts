import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface DialogRequest {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  resolve: (ok: boolean) => void;
}

interface UiState {
  toast: Toast | null;
  dialog: DialogRequest | null;
  showToast: (message: string, tone?: ToastTone) => void;
  hideToast: () => void;
  openDialog: (d: DialogRequest) => void;
  closeDialog: (ok: boolean) => void;
}

let toastId = 0;

export const useUi = create<UiState>((set, get) => ({
  toast: null,
  dialog: null,
  showToast: (message, tone = 'info') => set({ toast: { id: ++toastId, message, tone } }),
  hideToast: () => set({ toast: null }),
  openDialog: (dialog) => set({ dialog }),
  closeDialog: (ok) => {
    get().dialog?.resolve(ok);
    set({ dialog: null });
  },
}));

export const toast = {
  success: (m: string) => useUi.getState().showToast(m, 'success'),
  error: (m: string) => useUi.getState().showToast(m, 'error'),
  info: (m: string) => useUi.getState().showToast(m, 'info'),
};

/** Promise-based confirmation dialog: `if (await confirm({...})) { ... }` */
export const confirm = (opts: Omit<DialogRequest, 'resolve'>) =>
  new Promise<boolean>((resolve) => useUi.getState().openDialog({ ...opts, resolve }));
