import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  listMyTicketsApi,
  getMyTicketStatsApi,
  getMyTicketApi,
  createTicketApi,
  replyToMyTicketApi,
  tenantChangeStatusApi,
  listAdminTicketsApi,
  getAdminTicketStatsApi,
  getAdminTicketApi,
  replyAsStaffApi,
  adminChangeStatusApi,
  adminChangePriorityApi,
  adminAssignApi,
} from "@/api/support/support";

/* ──────────────────────────────────────────────────────────
 *  Tenant thunks
 * ────────────────────────────────────────────────────────── */
export const fetchMyTickets = createAsyncThunk(
  "support/list",
  async (params, { rejectWithValue }) => {
    const res = await listMyTicketsApi(params);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load tickets");
  }
);

export const fetchMyTicketStats = createAsyncThunk(
  "support/stats",
  async (_, { rejectWithValue }) => {
    const res = await getMyTicketStatsApi();
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load stats");
  }
);

export const fetchMyTicket = createAsyncThunk(
  "support/getOne",
  async (id, { rejectWithValue }) => {
    const res = await getMyTicketApi(id);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load ticket");
  }
);

export const createTicket = createAsyncThunk(
  "support/create",
  async (payload, { rejectWithValue }) => {
    const res = await createTicketApi(payload);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not create ticket");
  }
);

export const replyToMyTicket = createAsyncThunk(
  "support/reply",
  async ({ id, body }, { rejectWithValue }) => {
    const res = await replyToMyTicketApi(id, { body });
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not reply");
  }
);

export const tenantChangeStatus = createAsyncThunk(
  "support/tenantChangeStatus",
  async ({ id, status }, { rejectWithValue }) => {
    const res = await tenantChangeStatusApi(id, status);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not update status");
  }
);

/* ──────────────────────────────────────────────────────────
 *  Admin thunks
 * ────────────────────────────────────────────────────────── */
export const fetchAdminTickets = createAsyncThunk(
  "support/adminList",
  async (params, { rejectWithValue }) => {
    const res = await listAdminTicketsApi(params);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load tickets");
  }
);

export const fetchAdminStats = createAsyncThunk(
  "support/adminStats",
  async (_, { rejectWithValue }) => {
    const res = await getAdminTicketStatsApi();
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load stats");
  }
);

export const fetchAdminTicket = createAsyncThunk(
  "support/adminGetOne",
  async (id, { rejectWithValue }) => {
    const res = await getAdminTicketApi(id);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load ticket");
  }
);

export const replyAsStaff = createAsyncThunk(
  "support/staffReply",
  async ({ id, body }, { rejectWithValue }) => {
    const res = await replyAsStaffApi(id, { body });
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not reply");
  }
);

export const adminChangeStatus = createAsyncThunk(
  "support/adminStatus",
  async ({ id, status }, { rejectWithValue }) => {
    const res = await adminChangeStatusApi(id, status);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not update status");
  }
);

export const adminChangePriority = createAsyncThunk(
  "support/adminPriority",
  async ({ id, priority }, { rejectWithValue }) => {
    const res = await adminChangePriorityApi(id, priority);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not update priority");
  }
);

export const adminAssign = createAsyncThunk(
  "support/adminAssign",
  async ({ id, assigneeId }, { rejectWithValue }) => {
    const res = await adminAssignApi(id, assigneeId);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not assign");
  }
);

/* ──────────────────────────────────────────────────────────
 *  Slice
 * ────────────────────────────────────────────────────────── */

const EMPTY_STATS = { open: 0, pending: 0, resolved: 0, closed: 0, total: 0 };

const initialState = {
  // Tenant
  myTickets: [],
  myPagination: null,
  myStats: EMPTY_STATS,
  current: null,

  // Admin
  adminTickets: [],
  adminPagination: null,
  adminStats: EMPTY_STATS,
  adminCurrent: null,

  // Flags
  isLoading: false,
  isMutating: false,
  error: null,
};

const upsertInList = (list, ticket) => {
  if (!ticket?._id) return list;
  const idx = list.findIndex((t) => t._id === ticket._id);
  // Lists carry the lightweight shape (no replies) — never replace replies field
  const { replies: _replies, ...rest } = ticket;
  if (idx >= 0) {
    return list.map((t, i) => (i === idx ? { ...t, ...rest } : t));
  }
  return [rest, ...list];
};

const supportSlice = createSlice({
  name: "support",
  initialState,
  reducers: {
    clearCurrentTicket: (state) => {
      state.current = null;
      state.adminCurrent = null;
    },
    clearSupportError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* tenant list */
      .addCase(fetchMyTickets.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMyTickets.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myTickets = action.payload?.data || [];
        state.myPagination = action.payload?.pagination || null;
      })
      .addCase(fetchMyTickets.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      .addCase(fetchMyTicketStats.fulfilled, (state, action) => {
        state.myStats = action.payload?.data || EMPTY_STATS;
      })

      .addCase(fetchMyTicket.fulfilled, (state, action) => {
        state.current = action.payload?.data || null;
      })

      .addCase(createTicket.pending, (state) => {
        state.isMutating = true;
      })
      .addCase(createTicket.fulfilled, (state, action) => {
        state.isMutating = false;
        const t = action.payload?.data;
        if (t) {
          state.current = t;
          state.myTickets = upsertInList(state.myTickets, t);
        }
      })
      .addCase(createTicket.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload;
      })

      .addCase(replyToMyTicket.pending, (state) => {
        state.isMutating = true;
      })
      .addCase(replyToMyTicket.fulfilled, (state, action) => {
        state.isMutating = false;
        const t = action.payload?.data;
        if (t) {
          state.current = t;
          state.myTickets = upsertInList(state.myTickets, t);
        }
      })
      .addCase(replyToMyTicket.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload;
      })

      .addCase(tenantChangeStatus.fulfilled, (state, action) => {
        const t = action.payload?.data;
        if (t) {
          state.current = t;
          state.myTickets = upsertInList(state.myTickets, t);
        }
      })

      /* admin list */
      .addCase(fetchAdminTickets.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchAdminTickets.fulfilled, (state, action) => {
        state.isLoading = false;
        state.adminTickets = action.payload?.data || [];
        state.adminPagination = action.payload?.pagination || null;
      })
      .addCase(fetchAdminTickets.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      .addCase(fetchAdminStats.fulfilled, (state, action) => {
        state.adminStats = action.payload?.data || EMPTY_STATS;
      })

      .addCase(fetchAdminTicket.fulfilled, (state, action) => {
        state.adminCurrent = action.payload?.data || null;
      })

      .addCase(replyAsStaff.pending, (state) => {
        state.isMutating = true;
      })
      .addCase(replyAsStaff.fulfilled, (state, action) => {
        state.isMutating = false;
        const t = action.payload?.data;
        if (t) {
          state.adminCurrent = t;
          state.adminTickets = upsertInList(state.adminTickets, t);
        }
      })
      .addCase(replyAsStaff.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload;
      })

      .addCase(adminChangeStatus.fulfilled, (state, action) => {
        const t = action.payload?.data;
        if (t) {
          state.adminCurrent = t;
          state.adminTickets = upsertInList(state.adminTickets, t);
        }
      })

      .addCase(adminChangePriority.fulfilled, (state, action) => {
        const t = action.payload?.data;
        if (t) {
          state.adminCurrent = t;
          state.adminTickets = upsertInList(state.adminTickets, t);
        }
      })

      .addCase(adminAssign.fulfilled, (state, action) => {
        const t = action.payload?.data;
        if (t) {
          state.adminCurrent = t;
          state.adminTickets = upsertInList(state.adminTickets, t);
        }
      });
  },
});

export const { clearCurrentTicket, clearSupportError } = supportSlice.actions;
export default supportSlice.reducer;
