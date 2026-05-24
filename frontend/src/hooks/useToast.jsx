import { toast } from "sonner";

// Tiny wrapper to keep call sites consistent with the rest of the app.
export default function useToast() {
  return {
    success: (msg, opts = {}) => toast.success(msg, opts),
    error: (msg, opts = {}) => toast.error(msg, opts),
    info: (msg, opts = {}) => toast.info(msg, opts),
    warning: (msg, opts = {}) => toast.warning(msg, opts),
    loading: (msg, opts = {}) => toast.loading(msg, opts),
    dismiss: (id) => toast.dismiss(id),
  };
}
