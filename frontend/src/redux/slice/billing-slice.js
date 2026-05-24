import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getPlans,
  getSubscription,
  getInvoices,
} from "@/api/billing/billing";

export const fetchPlans = createAsyncThunk(
  "billing/plans",
  async (_, { rejectWithValue }) => {
    const res = await getPlans();
    if (res?.status === "success") return res.data;
    return rejectWithValue(res?.message);
  }
);

export const fetchSubscription = createAsyncThunk(
  "billing/subscription",
  async (_, { rejectWithValue }) => {
    const res = await getSubscription();
    if (res?.status === "success") return res.data;
    return rejectWithValue(res?.message);
  }
);

export const fetchInvoices = createAsyncThunk(
  "billing/invoices",
  async (query = "", { rejectWithValue }) => {
    const res = await getInvoices(query);
    if (res?.status === "success") return res.data;
    return rejectWithValue(res?.message);
  }
);

const initialState = {
  plans: [],
  subscription: null,
  invoices: [],
  usage: null,
  getLoading: false,
  error: null,
};

const billingSlice = createSlice({
  name: "billing",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlans.fulfilled, (s, a) => {
        s.plans = a.payload?.plans ?? [];
      })
      .addCase(fetchSubscription.fulfilled, (s, a) => {
        s.subscription = a.payload?.subscription ?? null;
        s.usage = a.payload?.usage ?? null;
      })
      .addCase(fetchInvoices.fulfilled, (s, a) => {
        s.invoices = a.payload?.invoices ?? [];
      });
  },
});

export default billingSlice.reducer;
