import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getCmsConnections,
  addCmsConnection,
  testCmsConnection,
  deleteCmsConnection,
} from "@/api/cms/cms";

export const fetchCmsConnections = createAsyncThunk(
  "cms/fetchAll",
  async (query = "", { rejectWithValue }) => {
    const res = await getCmsConnections(query);
    if (res?.status === "success") return res.data;
    return rejectWithValue(res?.message);
  }
);

export const addNewCms = createAsyncThunk(
  "cms/add",
  async (data, { rejectWithValue }) => {
    const res = await addCmsConnection(data);
    if (res?.status === "success") return res.data;
    return rejectWithValue(res?.message);
  }
);

export const testCms = createAsyncThunk(
  "cms/test",
  async (id, { rejectWithValue }) => {
    const res = await testCmsConnection(id);
    if (res?.status === "success") return { id, ...res.data };
    return rejectWithValue(res?.message);
  }
);

export const deleteCms = createAsyncThunk(
  "cms/delete",
  async (id, { rejectWithValue }) => {
    const res = await deleteCmsConnection(id);
    if (res?.status === "success") return id;
    return rejectWithValue(res?.message);
  }
);

const initialState = {
  connections: [],
  testStatus: null,
  getLoading: false,
  success: null,
  error: null,
};

const cmsSlice = createSlice({
  name: "cms",
  initialState,
  reducers: {
    clearCmsMessages: (state) => {
      state.success = null;
      state.error = null;
      state.testStatus = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCmsConnections.pending, (s) => {
        s.getLoading = true;
      })
      .addCase(fetchCmsConnections.fulfilled, (s, a) => {
        s.getLoading = false;
        s.connections = a.payload?.connections ?? [];
      })
      .addCase(testCms.fulfilled, (s, a) => {
        s.testStatus = a.payload;
      });
  },
});

export const { clearCmsMessages } = cmsSlice.actions;
export default cmsSlice.reducer;
