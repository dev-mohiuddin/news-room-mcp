import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  listCmsConnectionsApi,
  createWordpressConnectionApi,
  testCmsConnectionApi,
  deleteCmsConnectionApi,
} from "@/api/cms/cms";

export const fetchCmsConnections = createAsyncThunk(
  "cms/fetchAll",
  async (_, { rejectWithValue }) => {
    const res = await listCmsConnectionsApi();
    if (res?.success) return res.data || [];
    return rejectWithValue(res?.message || "Could not load connections");
  }
);

export const addWordpressConnection = createAsyncThunk(
  "cms/addWordpress",
  async (payload, { rejectWithValue }) => {
    const res = await createWordpressConnectionApi(payload);
    if (res?.success) return res.data;
    return rejectWithValue(res?.message || "Could not connect site");
  }
);

export const testCms = createAsyncThunk(
  "cms/test",
  async (id, { rejectWithValue }) => {
    const res = await testCmsConnectionApi(id);
    if (res?.success) return { id, conn: res.data };
    return rejectWithValue(res?.message || "Test failed");
  }
);

export const deleteCms = createAsyncThunk(
  "cms/delete",
  async (id, { rejectWithValue }) => {
    const res = await deleteCmsConnectionApi(id);
    if (res?.success !== false) return id;
    return rejectWithValue(res?.message || "Delete failed");
  }
);

const initialState = {
  connections: [],
  testStatus: null,
  isLoading: false,
  isMutating: false,
  error: null,
};

const cmsSlice = createSlice({
  name: "cms",
  initialState,
  reducers: {
    clearCmsError: (state) => {
      state.error = null;
      state.testStatus = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCmsConnections.pending, (s) => {
        s.isLoading = true;
      })
      .addCase(fetchCmsConnections.fulfilled, (s, a) => {
        s.isLoading = false;
        s.connections = a.payload || [];
      })
      .addCase(fetchCmsConnections.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload;
      })

      .addCase(addWordpressConnection.fulfilled, (s, a) => {
        if (a.payload) s.connections.unshift(a.payload);
      })

      .addCase(testCms.fulfilled, (s, a) => {
        s.testStatus = { ok: true, ...a.payload };
        const idx = s.connections.findIndex((c) => c._id === a.payload.id);
        if (idx >= 0 && a.payload.conn) s.connections[idx] = a.payload.conn;
      })
      .addCase(testCms.rejected, (s, a) => {
        s.testStatus = { ok: false, error: a.payload };
      })

      .addCase(deleteCms.fulfilled, (s, a) => {
        s.connections = s.connections.filter((c) => c._id !== a.payload);
      });
  },
});

export const { clearCmsError } = cmsSlice.actions;
export default cmsSlice.reducer;
