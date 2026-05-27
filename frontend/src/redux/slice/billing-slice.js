import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getMySubscriptionApi,
  listMyInvoicesApi,
  createCheckoutSessionApi,
  createPortalSessionApi,
  getAdminBillingSummaryApi,
  listAdminInvoicesApi,
} from "@/api/billing/billing";

/* ──────────────────────────────────────────────────────────
 *  Thunks
 * ────────────────────────────────────────────────────────── */

export const fetchMySubscription = createAsyncThunk(
  "billing/mySubscription",
  async (_, { rejectWithValue }) => {
    const res = await getMySubscriptionApi();
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load subscription");
  }
);

export const fetchMyInvoices = createAsyncThunk(
  "billing/myInvoices",
  async (params, { rejectWithValue }) => {
    const res = await listMyInvoicesApi(params);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load invoices");
  }
);

export const createCheckoutSession = createAsyncThunk(
  "billing/checkout",
  async (payload, { rejectWithValue }) => {
    const res = await createCheckoutSessionApi(payload);
    if (res?.success) return res;
    return rejectWithValue({
      message: res?.message || "Could not start checkout",
      code: res?.data?.code || null,
    });
  }
);

export const createPortalSession = createAsyncThunk(
  "billing/portal",
  async (_, { rejectWithValue }) => {
    const res = await createPortalSessionApi();
    if (res?.success) return res;
    return rejectWithValue({
      message: res?.message || "Could not open billing portal",
      code: res?.data?.code || null,
    });
  }
);

export const fetchAdminBillingSummary = createAsyncThunk(
  "billing/adminSummary",
  async (_, { rejectWithValue }) => {
    const res = await getAdminBillingSummaryApi();
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load summary");
  }
);

export const fetchAdminInvoices = createAsyncThunk(
  "billing/adminInvoices",
  async (params, { rejectWithValue }) => {
    const res = await listAdminInvoicesApi(params);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load invoices");
  }
);

/* ──────────────────────────────────────────────────────────
 *  Slice
 * ────────────────────────────────────────────────────────── */

const initialState = {
  // Tenant
  subscription: null,
  plan: null,
  usage: null,
  paymentMethod: null,
  stripeConfigured: true, // assume yes until first fetch tells us
  invoices: [],
  invoicesPagination: null,

  // Admin
  adminSummary: null,
  adminInvoices: [],
  adminInvoicesPagination: null,

  // Flags
  isLoading: false,
  isMutating: false,
  error: null,
};

const billingSlice = createSlice({
  name: "billing",
  initialState,
  reducers: {
    clearBillingError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* my subscription */
      .addCase(fetchMySubscription.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMySubscription.fulfilled, (state, action) => {
        state.isLoading = false;
        const data = action.payload?.data || {};
        state.subscription = data.subscription || null;
        state.plan = data.plan || null;
        state.usage = data.usage || null;
        state.paymentMethod = data.paymentMethod || null;
        if (typeof data.stripeConfigured === "boolean") {
          state.stripeConfigured = data.stripeConfigured;
        }
      })
      .addCase(fetchMySubscription.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      /* my invoices */
      .addCase(fetchMyInvoices.fulfilled, (state, action) => {
        state.invoices = action.payload?.data || [];
        state.invoicesPagination = action.payload?.pagination || null;
      })

      /* checkout */
      .addCase(createCheckoutSession.pending, (state) => {
        state.isMutating = true;
      })
      .addCase(createCheckoutSession.fulfilled, (state) => {
        state.isMutating = false;
      })
      .addCase(createCheckoutSession.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload;
      })

      /* portal */
      .addCase(createPortalSession.pending, (state) => {
        state.isMutating = true;
      })
      .addCase(createPortalSession.fulfilled, (state) => {
        state.isMutating = false;
      })
      .addCase(createPortalSession.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload;
      })

      /* admin */
      .addCase(fetchAdminBillingSummary.fulfilled, (state, action) => {
        state.adminSummary = action.payload?.data || null;
        if (typeof action.payload?.data?.stripeConfigured === "boolean") {
          state.stripeConfigured = action.payload.data.stripeConfigured;
        }
      })
      .addCase(fetchAdminInvoices.fulfilled, (state, action) => {
        state.adminInvoices = action.payload?.data || [];
        state.adminInvoicesPagination = action.payload?.pagination || null;
      });
  },
});

export const { clearBillingError } = billingSlice.actions;
export default billingSlice.reducer;
