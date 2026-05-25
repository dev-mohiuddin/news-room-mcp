import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, isValid } from "date-fns";
import { toast } from "sonner";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Generic thunk handler — works with any createAsyncThunk action.
 * Pattern reused from amanaah.
 */
export const handleThunkApi = async ({
  type, // "create" | "update" | "delete" | "get"
  payload,
  dispatch,
  thunks, // { create, update, delete, get }
  form,
  onSuccess,
  clearAction,
  successMsg,
  errorMsg = "Something went wrong",
  showSuccess = true,
  entity = "Item",
}) => {
  try {
    if (clearAction) dispatch(clearAction());

    let thunkToCall;
    switch (type) {
      case "create":
        thunkToCall = thunks.create;
        break;
      case "update":
        thunkToCall = thunks.update;
        break;
      case "delete":
        thunkToCall = thunks.delete;
        break;
      case "get":
        thunkToCall = thunks.get;
        break;
      default:
        throw new Error("Invalid type provided");
    }

    if (!thunkToCall) {
      toast.error(`Thunk for type "${type}" not provided`);
      return;
    }

    const res = await dispatch(thunkToCall(payload));

    if (thunkToCall.fulfilled.match(res)) {
      const defaultMsgs = {
        create: `${entity} created successfully!`,
        update: `${entity} updated successfully!`,
        delete: `${entity} deleted successfully!`,
        get: `${entity} fetched successfully!`,
      };
      const MSG = successMsg || defaultMsgs[type];
      if (showSuccess && MSG) toast.success(MSG);
      if (form) form.reset();
      if (onSuccess) onSuccess();
      if (clearAction) dispatch(clearAction());
      return res;
    } else if (thunkToCall.rejected.match(res)) {
      if (showSuccess) toast.error(res.payload || errorMsg);
      return res;
    }
  } catch (error) {
    toast.error(errorMsg);
    return { error };
  }
};

export const dateFormater = (val, dateFormat = "yyyy-MM-dd") => {
  if (!val) return "";
  try {
    const date = val instanceof Date ? val : parseISO(val);
    if (!isValid(date)) return "";
    return format(date, dateFormat);
  } catch {
    return "";
  }
};

let isLoggingOut = false;
export const handleLogout = async () => {
  if (isLoggingOut) return;
  isLoggingOut = true;
  toast.error("Session expired! Please login again.");

  // Best-effort backend logout (clears server-side cookies). Don't block on it.
  try {
    const { logoutApi } = await import("@/api/auth/auth");
    await logoutApi();
  } catch {
    /* swallow — local cleanup still happens below */
  }

  localStorage.removeItem("persist:root");
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  setTimeout(() => {
    window.location.href = "/auth/login";
  }, 1500);
};

/* ── Common formatters ── */

export const formatNumber = (num) => {
  if (num === null || num === undefined) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toString();
};

export const truncate = (str, len = 80) => {
  if (!str) return "";
  return str.length > len ? str.slice(0, len) + "…" : str;
};

export const slugify = (text = "") =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");

export const buildQuery = (params = {}) => {
  const cleaned = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (!cleaned.length) return "";
  const qs = new URLSearchParams(Object.fromEntries(cleaned)).toString();
  return `?${qs}`;
};

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
    return true;
  } catch {
    toast.error("Failed to copy");
    return false;
  }
};
