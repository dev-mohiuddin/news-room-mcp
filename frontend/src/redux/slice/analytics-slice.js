import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getTenantDashboardApi,
  getTenantReportApi,
  getAdminDashboardApi,
  getAdminReportApi,
} from "@/api/analytics/analytics";

/* ──────────────────────────────────────────────────────────
 *  Thunks
 * ────────────────────────────────────────────────────────── */
export const fetchTenantDashboard = createAsyncThunk(
  "analytics/tenantDashboard",
  async (_, { rejectWithValue }) => {
    const res = await getTenantDashboardApi();
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load dashboard");
  }
);

export const fetchTenantReport = createAsyncThunk(
  "analytics/tenantReport",
  async (range = "30d", { rejectWithValue }) => {
    const res = await getTenantReportApi(range);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load report");
  }
);

export const fetchAdminDashboard = createAsyncThunk(
  "analytics/adminDashboard",
  async (_, { rejectWithValue }) => {
    const res = await getAdminDashboardApi();
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load dashboard");
  }
);

export const fetchAdminReport = createAsyncThunk(
  "analytics/adminReport",
  async (range = "30d", { rejectWithValue }) => {
    const res = await getAdminReportApi(range);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load report");
  }
);

/* ──────────────────────────────────────────────────────────
 *  Slice
 * ────────────────────────────────────────────────────────── */

const initialState = {
  tenantDashboard: null,
  tenantReport: null,
  adminDashboard: null,
  adminReport: null,
  isLoading: false,
  error: null,
};

const analyticsSlice = createSlice({
  name: "analytics",
  initialState,
  reducers: {
    clearAnalyticsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTenantDashboard.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchTenantDashboard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tenantDashboard = action.payload?.data || null;
      })
      .addCase(fetchTenantDashboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      .addCase(fetchTenantReport.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchTenantReport.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tenantReport = action.payload?.data || null;
      })
      .addCase(fetchTenantReport.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      .addCase(fetchAdminDashboard.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchAdminDashboard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.adminDashboard = action.payload?.data || null;
      })
      .addCase(fetchAdminDashboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      .addCase(fetchAdminReport.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchAdminReport.fulfilled, (state, action) => {
        state.isLoading = false;
        state.adminReport = action.payload?.data || null;
      })
      .addCase(fetchAdminReport.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearAnalyticsError } = analyticsSlice.actions;
export default analyticsSlice.reducer;
