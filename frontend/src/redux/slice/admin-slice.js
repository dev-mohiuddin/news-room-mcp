import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  listUsersApi,
  getUserApi,
  changeUserRoleApi,
  setUserStatusApi,
  deleteUserApi,
} from "@/api/admin/users";
import { listAuditLogsApi } from "@/api/admin/audit";

/* ──────────────────────────────────────────────────────────
 *  Thunks — Users
 * ────────────────────────────────────────────────────────── */
export const fetchUsers = createAsyncThunk(
  "admin/users/list",
  async (params, { rejectWithValue }) => {
    const res = await listUsersApi(params);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Failed to load users");
  }
);

export const fetchUserById = createAsyncThunk(
  "admin/users/get",
  async (id, { rejectWithValue }) => {
    const res = await getUserApi(id);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Failed to load user");
  }
);

export const changeUserRole = createAsyncThunk(
  "admin/users/changeRole",
  async ({ id, roleId }, { rejectWithValue }) => {
    const res = await changeUserRoleApi(id, roleId);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Failed to change role");
  }
);

export const setUserStatus = createAsyncThunk(
  "admin/users/setStatus",
  async ({ id, isActive }, { rejectWithValue }) => {
    const res = await setUserStatusApi(id, isActive);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Failed to update status");
  }
);

export const removeUser = createAsyncThunk(
  "admin/users/delete",
  async (id, { rejectWithValue }) => {
    const res = await deleteUserApi(id);
    if (res?.success) return { id, ...res };
    return rejectWithValue(res?.message || "Failed to delete user");
  }
);

/* ──────────────────────────────────────────────────────────
 *  Thunks — Audit logs
 * ────────────────────────────────────────────────────────── */
export const fetchAuditLogs = createAsyncThunk(
  "admin/logs/list",
  async (params, { rejectWithValue }) => {
    const res = await listAuditLogsApi(params);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Failed to load logs");
  }
);

/* ──────────────────────────────────────────────────────────
 *  Slice
 * ────────────────────────────────────────────────────────── */
const initialState = {
  users: [],
  usersPagination: null,
  currentUser: null,

  logs: [],
  logsPagination: null,

  isLoading: false,
  isMutating: false,
  error: null,
};

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    clearAdminError: (state) => {
      state.error = null;
    },
    clearCurrentUser: (state) => {
      state.currentUser = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* Users */
      .addCase(fetchUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = action.payload.data || [];
        state.usersPagination = action.payload.pagination || null;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.currentUser = action.payload.data;
      })

      .addCase(changeUserRole.fulfilled, (state, action) => {
        const user = action.payload.data;
        if (!user) return;
        state.users = state.users.map((u) =>
          u._id === user._id ? user : u
        );
        if (state.currentUser?._id === user._id) state.currentUser = user;
      })

      .addCase(setUserStatus.fulfilled, (state, action) => {
        const user = action.payload.data;
        if (!user) return;
        state.users = state.users.map((u) =>
          u._id === user._id ? user : u
        );
        if (state.currentUser?._id === user._id) state.currentUser = user;
      })

      .addCase(removeUser.fulfilled, (state, action) => {
        state.users = state.users.filter((u) => u._id !== action.payload.id);
      })

      /* Audit logs */
      .addCase(fetchAuditLogs.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.logs = action.payload.data || [];
        state.logsPagination = action.payload.pagination || null;
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearAdminError, clearCurrentUser } = adminSlice.actions;
export default adminSlice.reducer;
