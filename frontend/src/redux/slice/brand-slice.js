import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getBrandVoices,
  getSingleBrandVoice,
  createBrandVoice,
  updateBrandVoice,
  deleteBrandVoice,
} from "@/api/brand/brand";

export const fetchBrandVoices = createAsyncThunk(
  "brand/fetchAll",
  async (query = "", { rejectWithValue }) => {
    const res = await getBrandVoices(query);
    if (res?.status === "success") return res.data;
    return rejectWithValue(res?.message);
  }
);

export const fetchSingleBrand = createAsyncThunk(
  "brand/fetchOne",
  async (id, { rejectWithValue }) => {
    const res = await getSingleBrandVoice(id);
    if (res?.status === "success") return res.data;
    return rejectWithValue(res?.message);
  }
);

export const createNewBrand = createAsyncThunk(
  "brand/create",
  async (data, { rejectWithValue }) => {
    const res = await createBrandVoice(data);
    if (res?.status === "success") return res.data;
    return rejectWithValue(res?.message);
  }
);

export const updateExistingBrand = createAsyncThunk(
  "brand/update",
  async ({ id, data }, { rejectWithValue }) => {
    const res = await updateBrandVoice(id, data);
    if (res?.status === "success") return res.data;
    return rejectWithValue(res?.message);
  }
);

export const deleteBrandById = createAsyncThunk(
  "brand/delete",
  async (id, { rejectWithValue }) => {
    const res = await deleteBrandVoice(id);
    if (res?.status === "success") return id;
    return rejectWithValue(res?.message);
  }
);

const initialState = {
  voices: [],
  singleVoice: null,
  getLoading: false,
  createLoading: false,
  updateLoading: false,
  deleteLoading: false,
  success: null,
  error: null,
};

const brandSlice = createSlice({
  name: "brand",
  initialState,
  reducers: {
    clearBrandMessages: (state) => {
      state.success = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrandVoices.pending, (s) => {
        s.getLoading = true;
      })
      .addCase(fetchBrandVoices.fulfilled, (s, a) => {
        s.getLoading = false;
        s.voices = a.payload?.voices ?? [];
      })
      .addCase(fetchBrandVoices.rejected, (s, a) => {
        s.getLoading = false;
        s.error = a.payload;
      });
  },
});

export const { clearBrandMessages } = brandSlice.actions;
export default brandSlice.reducer;
