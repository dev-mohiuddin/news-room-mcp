import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  listBrandVoicesApi,
  createBrandVoiceApi,
  activateBrandVoiceApi,
  reExtractBrandVoiceApi,
  deleteBrandVoiceApi,
} from "@/api/brand/brand";

export const fetchBrandVoices = createAsyncThunk(
  "brand/list",
  async (_, { rejectWithValue }) => {
    const res = await listBrandVoicesApi();
    if (res?.success) return res.data || [];
    return rejectWithValue(res?.message || "Could not load brand voices");
  }
);

export const createBrandVoice = createAsyncThunk(
  "brand/create",
  async (payload, { rejectWithValue }) => {
    const res = await createBrandVoiceApi(payload);
    if (res?.success) return res.data;
    return rejectWithValue(res?.message || "Could not create brand voice");
  }
);

export const activateBrandVoice = createAsyncThunk(
  "brand/activate",
  async (id, { rejectWithValue }) => {
    const res = await activateBrandVoiceApi(id);
    if (res?.success) return res.data;
    return rejectWithValue(res?.message || "Could not activate");
  }
);

export const reExtractBrandVoice = createAsyncThunk(
  "brand/reExtract",
  async (id, { rejectWithValue }) => {
    const res = await reExtractBrandVoiceApi(id);
    if (res?.success) return res.data;
    return rejectWithValue(res?.message || "Could not re-extract");
  }
);

export const deleteBrandVoice = createAsyncThunk(
  "brand/delete",
  async (id, { rejectWithValue }) => {
    const res = await deleteBrandVoiceApi(id);
    if (res?.success !== false) return id;
    return rejectWithValue(res?.message || "Could not delete");
  }
);

const initialState = {
  list: [],
  isLoading: false,
  isMutating: false,
  error: null,
};

const brandSlice = createSlice({
  name: "brand",
  initialState,
  reducers: {
    clearBrandError: (s) => {
      s.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchBrandVoices.pending, (s) => {
      s.isLoading = true;
    })
      .addCase(fetchBrandVoices.fulfilled, (s, a) => {
        s.isLoading = false;
        s.list = a.payload || [];
      })
      .addCase(fetchBrandVoices.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload;
      })
      .addCase(createBrandVoice.fulfilled, (s, a) => {
        if (a.payload) s.list.unshift(a.payload);
      })
      .addCase(activateBrandVoice.fulfilled, (s, a) => {
        const updated = a.payload;
        if (!updated) return;
        s.list = s.list.map((p) => ({
          ...p,
          isActive: p._id === updated._id,
        }));
      })
      .addCase(reExtractBrandVoice.fulfilled, (s, a) => {
        const updated = a.payload;
        if (!updated) return;
        s.list = s.list.map((p) => (p._id === updated._id ? updated : p));
      })
      .addCase(deleteBrandVoice.fulfilled, (s, a) => {
        s.list = s.list.filter((p) => p._id !== a.payload);
      });
  },
});

export const { clearBrandError } = brandSlice.actions;
export default brandSlice.reducer;
