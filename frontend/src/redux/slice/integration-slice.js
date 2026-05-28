import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  listIntegrationsApi,
  upsertIntegrationApi,
  setIntegrationActiveApi,
  deleteIntegrationApi,
  testIntegrationApi,
} from "@/api/admin/integrations";

export const fetchIntegrations = createAsyncThunk(
  "integrations/list",
  async (_, { rejectWithValue }) => {
    const res = await listIntegrationsApi();
    if (res?.success) return res.data;
    return rejectWithValue(res?.message || "Failed to load integrations");
  }
);

export const saveIntegration = createAsyncThunk(
  "integrations/save",
  async (data, { rejectWithValue }) => {
    const res = await upsertIntegrationApi(data);
    if (res?.success) return res.data;
    return rejectWithValue(res?.message || "Could not save integration");
  }
);

export const toggleIntegrationActive = createAsyncThunk(
  "integrations/toggleActive",
  async ({ provider, isActive }, { rejectWithValue }) => {
    const res = await setIntegrationActiveApi(provider, isActive);
    if (res?.success) return res.data;
    return rejectWithValue(res?.message || "Could not toggle integration");
  }
);

export const removeIntegration = createAsyncThunk(
  "integrations/remove",
  async (provider, { rejectWithValue }) => {
    const res = await deleteIntegrationApi(provider);
    if (res?.success) return res.data;
    return rejectWithValue(res?.message || "Could not disconnect integration");
  }
);

export const testIntegration = createAsyncThunk(
  "integrations/test",
  async (provider, { rejectWithValue }) => {
    const res = await testIntegrationApi(provider);
    if (res?.success) return res.data;
    return rejectWithValue(res?.message || "Test failed");
  }
);

const upsertItemInList = (list, payload) => {
  if (!payload?.provider) return list;
  const next = [...list];
  const idx = next.findIndex((i) => i.provider === payload.provider);
  if (idx >= 0) next[idx] = payload;
  else next.push(payload);
  return next;
};

const initialState = {
  list: [],
  isLoading: false,
  isMutating: false,
  testingProvider: null,
  error: null,
};

const integrationSlice = createSlice({
  name: "integrations",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchIntegrations.pending, (s) => {
        s.isLoading = true;
        s.error = null;
      })
      .addCase(fetchIntegrations.fulfilled, (s, a) => {
        s.isLoading = false;
        s.list = a.payload || [];
      })
      .addCase(fetchIntegrations.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload;
      })

      .addCase(saveIntegration.pending, (s) => {
        s.isMutating = true;
      })
      .addCase(saveIntegration.fulfilled, (s, a) => {
        s.isMutating = false;
        s.list = upsertItemInList(s.list, a.payload);
      })
      .addCase(saveIntegration.rejected, (s, a) => {
        s.isMutating = false;
        s.error = a.payload;
      })

      .addCase(toggleIntegrationActive.fulfilled, (s, a) => {
        s.list = upsertItemInList(s.list, a.payload);
      })

      .addCase(removeIntegration.fulfilled, (s, a) => {
        s.list = upsertItemInList(s.list, a.payload);
      })

      .addCase(testIntegration.pending, (s, a) => {
        s.testingProvider = a.meta.arg;
      })
      .addCase(testIntegration.fulfilled, (s, a) => {
        s.testingProvider = null;
        const updated = a.payload?.integration;
        if (updated) s.list = upsertItemInList(s.list, updated);
      })
      .addCase(testIntegration.rejected, (s) => {
        s.testingProvider = null;
      });
  },
});

export default integrationSlice.reducer;
