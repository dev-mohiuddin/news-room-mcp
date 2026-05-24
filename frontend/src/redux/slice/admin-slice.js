import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getAllUsers,
  getUserDetail,
  updateUserStatus,
  getAdminPlans,
  getAdminAnalytics,
  getAuditLogs,
} from "@/api/admin/admin";

export const fetchAllUsers = createAsyncThunk(
  "admin/users/fetchAll",
  async (params = {}, { rejectWithValue }) => {
    const {
      page = 1,
      rows = 10,
      sortField = "id",
      sortOrder = "desc",
      search_term = "",
    } = params;
    const res = await getAllUsers(
      `?page=${page}&rows=${rows}&sort_order=${sortOrder}&sortField=${sortField}&search_term=${search_term}`
    );
    if (res?.status === "success") return res.data;
    return rejectWithValue(res?.message);
  }
);

export const fetchUserDetail = createAsyncThunk(
  "admin/users/fetchOne",
  async (id, { rejectWithValue }) => {
    const res = await getUserDetail(id);
    if (res?.status === "success") return res.data.user;
    return rejectWithValue(res?.message);
  }
);

export const toggleUserStatus = createAsyncThunk(
  "admin/users/toggleStatus",
  async ({ id, data }, { rejectWithValue }) => {
    const res = await updateUserStatus(id, data);
    if (res?.status === "success") return res.data.user;
    return rejectWithValue(res?.message);
  }
);

export const fetchAdminPlans = createAsyncThunk(
  "admin/plans/fetch",
  async (_, { rejectWithValue }) => {
    const res = await getAdminPlans();
    if (res?.status === "success") return res.data;
    return rejectWithValue(res?.message);
  }
);

export const fetchAdminAnalytics = createAsyncThunk(
  "admin/analytics/fetch",
  async (params = "", { rejectWithValue }) => {
    const res = await getAdminAnalytics(params);
    if (res?.status === "success") return res.data;
    return rejectWithValue(res?.message);
  }
);

export const fetchAuditLogs = createAsyncThunk(
  "admin/logs/fetch",
  async (params = "", { rejectWithValue }) => {
    const res = await getAuditLogs(params);
    if (res?.status === "success") return res.data;
    return rejectWithValue(res?.message);
  }
);

const initialState = {
  users: [],
  singleUser: null,
  plans: [],
  analytics: null,
  logs: [],
  pagination: null,

  getLoading: false,
  updateLoading: false,
  success: null,
  error: null,
};

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    clearAdminMessages: (state) => {
      state.success = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllUsers.pending, (state) => {
        state.getLoading = true;
        state.error = null;
      })
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.getLoading = false;
        state.users = action.payload?.users ?? [];
        state.pagination = action.payload?.pagination ?? null;
      })
      .addCase(fetchAllUsers.rejected, (state, action) => {
        state.getLoading = false;
        state.error = action.payload;
      })

      .addCase(fetchUserDetail.fulfilled, (state, action) => {
        state.singleUser = action.payload;
      })

      .addCase(toggleUserStatus.fulfilled, (state, action) => {
        state.users = state.users.map((u) =>
          u.id === action.payload.id ? action.payload : u
        );
        state.success = "User status updated";
      })

      .addCase(fetchAdminPlans.fulfilled, (state, action) => {
        state.plans = action.payload?.plans ?? [];
      })

      .addCase(fetchAdminAnalytics.fulfilled, (state, action) => {
        state.analytics = action.payload;
      })

      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.logs = action.payload?.logs ?? [];
      });
  },
});

export const { clearAdminMessages } = adminSlice.actions;
export default adminSlice.reducer;
