import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  listPublicPlansApi,
  listAdminPlansApi,
  getAdminPlanApi,
  createPlanApi,
  updatePlanApi,
  setPlanActiveApi,
  deletePlanApi,
} from "@/api/plan/plan";

/* ──────────────────────────────────────────────────────────
 *  Thunks
 * ────────────────────────────────────────────────────────── */

export const fetchPublicPlans = createAsyncThunk(
  "plans/listPublic",
  async (_, { rejectWithValue }) => {
    const res = await listPublicPlansApi();
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load plans");
  }
);

export const fetchAdminPlans = createAsyncThunk(
  "plans/listAdmin",
  async (params, { rejectWithValue }) => {
    const res = await listAdminPlansApi(params);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load plans");
  }
);

export const fetchAdminPlanById = createAsyncThunk(
  "plans/getOne",
  async (id, { rejectWithValue }) => {
    const res = await getAdminPlanApi(id);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load plan");
  }
);

export const createPlan = createAsyncThunk(
  "plans/create",
  async (payload, { rejectWithValue }) => {
    const res = await createPlanApi(payload);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not create plan");
  }
);

export const updatePlan = createAsyncThunk(
  "plans/update",
  async ({ id, payload }, { rejectWithValue }) => {
    const res = await updatePlanApi(id, payload);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not update plan");
  }
);

export const setPlanActive = createAsyncThunk(
  "plans/setActive",
  async ({ id, isActive }, { rejectWithValue }) => {
    const res = await setPlanActiveApi(id, isActive);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not toggle plan");
  }
);

export const deletePlan = createAsyncThunk(
  "plans/delete",
  async (id, { rejectWithValue }) => {
    const res = await deletePlanApi(id);
    if (res?.success !== false) return { id };
    return rejectWithValue(res?.message || "Could not delete plan");
  }
);

/* ──────────────────────────────────────────────────────────
 *  Slice
 * ────────────────────────────────────────────────────────── */

const initialState = {
  publicList: [],
  adminList: [],
  pagination: null,
  current: null,
  isLoading: false,
  isMutating: false,
  error: null,
};

const planSlice = createSlice({
  name: "plans",
  initialState,
  reducers: {
    clearCurrentPlan: (state) => {
      state.current = null;
    },
    clearPlanError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* public */
      .addCase(fetchPublicPlans.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPublicPlans.fulfilled, (state, action) => {
        state.isLoading = false;
        state.publicList = action.payload?.data || [];
      })
      .addCase(fetchPublicPlans.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      /* admin list */
      .addCase(fetchAdminPlans.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchAdminPlans.fulfilled, (state, action) => {
        state.isLoading = false;
        state.adminList = action.payload?.data || [];
        state.pagination = action.payload?.pagination || null;
      })
      .addCase(fetchAdminPlans.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      /* one */
      .addCase(fetchAdminPlanById.fulfilled, (state, action) => {
        state.current = action.payload?.data || null;
      })

      /* create */
      .addCase(createPlan.pending, (state) => {
        state.isMutating = true;
      })
      .addCase(createPlan.fulfilled, (state, action) => {
        state.isMutating = false;
        const plan = action.payload?.data;
        if (plan) state.adminList = [...state.adminList, plan].sort(byOrder);
      })
      .addCase(createPlan.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload;
      })

      /* update */
      .addCase(updatePlan.fulfilled, (state, action) => {
        const plan = action.payload?.data;
        if (!plan) return;
        const idx = state.adminList.findIndex((p) => p._id === plan._id);
        if (idx >= 0) state.adminList[idx] = plan;
        if (state.current?._id === plan._id) state.current = plan;
      })

      /* toggle */
      .addCase(setPlanActive.fulfilled, (state, action) => {
        const plan = action.payload?.data;
        if (!plan) return;
        const idx = state.adminList.findIndex((p) => p._id === plan._id);
        if (idx >= 0) state.adminList[idx] = plan;
      })

      /* delete */
      .addCase(deletePlan.fulfilled, (state, action) => {
        const { id } = action.payload || {};
        state.adminList = state.adminList.filter((p) => p._id !== id);
      });
  },
});

const byOrder = (a, b) => {
  if ((a.sortOrder ?? 0) !== (b.sortOrder ?? 0)) {
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  }
  return (a.monthlyPriceCents ?? 0) - (b.monthlyPriceCents ?? 0);
};

export const { clearCurrentPlan, clearPlanError } = planSlice.actions;
export default planSlice.reducer;
