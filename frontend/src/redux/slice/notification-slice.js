import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  listNotificationsApi,
  getUnreadCountApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  deleteNotificationApi,
  clearReadNotificationsApi,
  sendBroadcastApi,
  listBroadcastsApi,
} from "@/api/notification/notification";

/* ──────────────────────────────────────────────────────────
 *  Thunks
 * ────────────────────────────────────────────────────────── */

export const fetchNotifications = createAsyncThunk(
  "notifications/list",
  async (params, { rejectWithValue }) => {
    const res = await listNotificationsApi(params);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load notifications");
  }
);

export const fetchUnreadCount = createAsyncThunk(
  "notifications/unreadCount",
  async (_, { rejectWithValue }) => {
    const res = await getUnreadCountApi();
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load unread count");
  }
);

export const markNotificationRead = createAsyncThunk(
  "notifications/markRead",
  async (id, { rejectWithValue }) => {
    const res = await markNotificationReadApi(id);
    if (res?.success) return { id };
    return rejectWithValue(res?.message || "Could not mark as read");
  }
);

export const markAllNotificationsRead = createAsyncThunk(
  "notifications/markAllRead",
  async (_, { rejectWithValue }) => {
    const res = await markAllNotificationsReadApi();
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not mark all as read");
  }
);

export const deleteNotification = createAsyncThunk(
  "notifications/delete",
  async (id, { rejectWithValue }) => {
    const res = await deleteNotificationApi(id);
    if (res?.success !== false) return { id };
    return rejectWithValue(res?.message || "Could not delete");
  }
);

export const clearReadNotifications = createAsyncThunk(
  "notifications/clearRead",
  async (_, { rejectWithValue }) => {
    const res = await clearReadNotificationsApi();
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not clear read notifications");
  }
);

export const sendBroadcast = createAsyncThunk(
  "notifications/sendBroadcast",
  async (payload, { rejectWithValue }) => {
    const res = await sendBroadcastApi(payload);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not send broadcast");
  }
);

export const fetchBroadcasts = createAsyncThunk(
  "notifications/listBroadcasts",
  async (params, { rejectWithValue }) => {
    const res = await listBroadcastsApi(params);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load broadcasts");
  }
);

/* ──────────────────────────────────────────────────────────
 *  Slice
 * ────────────────────────────────────────────────────────── */

const initialState = {
  list: [],
  pagination: null,
  unreadCount: 0,
  isLoading: false,
  isMutating: false,
  error: null,

  /* Admin broadcast composer history */
  broadcasts: [],
  broadcastsPagination: null,
  isSendingBroadcast: false,
};

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    /** Socket.io `notification:new` */
    receiveNotification: (state, action) => {
      const n = action.payload?.notification;
      if (!n?._id) return;
      // Prepend if not already present (avoids duplicates on reconnect)
      const exists = state.list.some((x) => x._id === n._id);
      if (!exists) {
        state.list = [n, ...state.list];
        if (!n.read) state.unreadCount += 1;
      }
    },
    /** Socket.io `notification:read` (multi-tab sync) */
    receiveRead: (state, action) => {
      const { id } = action.payload || {};
      if (!id) return;
      const idx = state.list.findIndex((x) => x._id === id);
      if (idx >= 0 && !state.list[idx].read) {
        state.list[idx] = { ...state.list[idx], read: true };
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    /** Socket.io `notification:all_read` */
    receiveAllRead: (state) => {
      state.list = state.list.map((n) => ({ ...n, read: true }));
      state.unreadCount = 0;
    },
    /** Socket.io `notification:deleted` */
    receiveDeleted: (state, action) => {
      const { id } = action.payload || {};
      if (!id) return;
      const removed = state.list.find((n) => n._id === id);
      state.list = state.list.filter((n) => n._id !== id);
      if (removed && !removed.read) {
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    clearNotificationError: (state) => {
      state.error = null;
    },
    resetNotificationState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      /* list */
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload?.data || [];
        state.pagination = action.payload?.pagination || null;
        if (typeof action.payload?.pagination?.unread === "number") {
          state.unreadCount = action.payload.pagination.unread;
        }
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      /* unread count */
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload?.data?.count ?? 0;
      })

      /* mark read */
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const { id } = action.payload || {};
        const idx = state.list.findIndex((x) => x._id === id);
        if (idx >= 0 && !state.list[idx].read) {
          state.list[idx] = { ...state.list[idx], read: true };
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })

      /* mark all read */
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.list = state.list.map((n) => ({ ...n, read: true }));
        state.unreadCount = 0;
      })

      /* delete */
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const { id } = action.payload || {};
        const removed = state.list.find((n) => n._id === id);
        state.list = state.list.filter((n) => n._id !== id);
        if (removed && !removed.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })

      /* clear read */
      .addCase(clearReadNotifications.fulfilled, (state) => {
        state.list = state.list.filter((n) => !n.read);
      })

      /* admin broadcast */
      .addCase(sendBroadcast.pending, (state) => {
        state.isSendingBroadcast = true;
      })
      .addCase(sendBroadcast.fulfilled, (state) => {
        state.isSendingBroadcast = false;
      })
      .addCase(sendBroadcast.rejected, (state, action) => {
        state.isSendingBroadcast = false;
        state.error = action.payload;
      })

      .addCase(fetchBroadcasts.fulfilled, (state, action) => {
        state.broadcasts = action.payload?.data || [];
        state.broadcastsPagination = action.payload?.pagination || null;
      });
  },
});

export const {
  receiveNotification,
  receiveRead,
  receiveAllRead,
  receiveDeleted,
  clearNotificationError,
  resetNotificationState,
} = notificationSlice.actions;
export default notificationSlice.reducer;
