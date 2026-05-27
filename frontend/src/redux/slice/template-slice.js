import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  listTemplatesApi,
  createTemplateApi,
  updateTemplateApi,
  deleteTemplateApi,
} from "@/api/template/template";

export const fetchTemplates = createAsyncThunk(
  "templates/list",
  async (params, { rejectWithValue }) => {
    const res = await listTemplatesApi(params);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Failed to load templates");
  }
);

export const createTemplate = createAsyncThunk(
  "templates/create",
  async (data, { rejectWithValue }) => {
    const res = await createTemplateApi(data);
    if (res?.success) return res.data;
    return rejectWithValue(res?.message || "Could not create template");
  }
);

export const updateTemplate = createAsyncThunk(
  "templates/update",
  async ({ id, data }, { rejectWithValue }) => {
    const res = await updateTemplateApi(id, data);
    if (res?.success) return res.data;
    return rejectWithValue(res?.message || "Could not update template");
  }
);

export const deleteTemplate = createAsyncThunk(
  "templates/delete",
  async (id, { rejectWithValue }) => {
    const res = await deleteTemplateApi(id);
    if (res?.success) return { id };
    return rejectWithValue(res?.message || "Could not delete template");
  }
);

const initialState = {
  list: [],
  pagination: null,
  isLoading: false,
  isMutating: false,
  error: null,
};

const templateSlice = createSlice({
  name: "templates",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTemplates.pending, (s) => {
        s.isLoading = true;
        s.error = null;
      })
      .addCase(fetchTemplates.fulfilled, (s, a) => {
        s.isLoading = false;
        s.list = a.payload?.data || [];
        s.pagination = a.payload?.pagination || null;
      })
      .addCase(fetchTemplates.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload;
      })
      .addCase(createTemplate.pending, (s) => {
        s.isMutating = true;
      })
      .addCase(createTemplate.fulfilled, (s, a) => {
        s.isMutating = false;
        if (a.payload) s.list = [a.payload, ...s.list];
      })
      .addCase(createTemplate.rejected, (s, a) => {
        s.isMutating = false;
        s.error = a.payload;
      })
      .addCase(updateTemplate.pending, (s) => {
        s.isMutating = true;
      })
      .addCase(updateTemplate.fulfilled, (s, a) => {
        s.isMutating = false;
        if (a.payload) {
          s.list = s.list.map((t) => (t.id === a.payload.id ? a.payload : t));
        }
      })
      .addCase(updateTemplate.rejected, (s, a) => {
        s.isMutating = false;
        s.error = a.payload;
      })
      .addCase(deleteTemplate.pending, (s) => {
        s.isMutating = true;
      })
      .addCase(deleteTemplate.fulfilled, (s, a) => {
        s.isMutating = false;
        s.list = s.list.filter((t) => t.id !== a.payload?.id);
      })
      .addCase(deleteTemplate.rejected, (s, a) => {
        s.isMutating = false;
        s.error = a.payload;
      });
  },
});

export default templateSlice.reducer;
