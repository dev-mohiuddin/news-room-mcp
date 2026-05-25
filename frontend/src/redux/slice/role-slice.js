import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  listRolesApi,
  getRoleApi,
  getPermissionCatalogApi,
  createRoleApi,
  updateRoleApi,
  deleteRoleApi,
} from "@/api/role/role";

const initialState = {
  list: [],
  pagination: null,
  current: null,
  permissionCatalog: null,
  isLoading: false,
  error: null,
};

/* ──────────────────────────────────────────────────────────
 *  Thunks
 * ────────────────────────────────────────────────────────── */
export const fetchRoles = createAsyncThunk(
  "role/list",
  async (params, { rejectWithValue }) => {
    const res = await listRolesApi(params);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Failed to load roles");
  }
);

export const fetchRoleById = createAsyncThunk(
  "role/getOne",
  async (id, { rejectWithValue }) => {
    const res = await getRoleApi(id);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Failed to load role");
  }
);

export const fetchPermissionCatalog = createAsyncThunk(
  "role/permissions",
  async (scope, { rejectWithValue }) => {
    const res = await getPermissionCatalogApi(scope);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Failed to load permissions");
  }
);

export const createRole = createAsyncThunk(
  "role/create",
  async (payload, { rejectWithValue }) => {
    const res = await createRoleApi(payload);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Failed to create role");
  }
);

export const updateRole = createAsyncThunk(
  "role/update",
  async ({ id, payload }, { rejectWithValue }) => {
    const res = await updateRoleApi(id, payload);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Failed to update role");
  }
);

export const deleteRole = createAsyncThunk(
  "role/delete",
  async (id, { rejectWithValue }) => {
    const res = await deleteRoleApi(id);
    if (res?.success) return { id, ...res };
    return rejectWithValue(res?.message || "Failed to delete role");
  }
);

/* ──────────────────────────────────────────────────────────
 *  Slice
 * ────────────────────────────────────────────────────────── */
const roleSlice = createSlice({
  name: "role",
  initialState,
  reducers: {
    clearCurrentRole: (state) => {
      state.current = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* list */
      .addCase(fetchRoles.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload.data || [];
        state.pagination = action.payload.pagination || null;
      })
      .addCase(fetchRoles.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      /* one */
      .addCase(fetchRoleById.fulfilled, (state, action) => {
        state.current = action.payload.data;
      })

      /* catalog */
      .addCase(fetchPermissionCatalog.fulfilled, (state, action) => {
        state.permissionCatalog = action.payload.data;
      })

      /* create */
      .addCase(createRole.fulfilled, (state, action) => {
        const role = action.payload.data;
        if (role) state.list.unshift(role);
      })

      /* update */
      .addCase(updateRole.fulfilled, (state, action) => {
        const role = action.payload.data;
        if (!role) return;
        const idx = state.list.findIndex((r) => r._id === role._id);
        if (idx >= 0) state.list[idx] = role;
        if (state.current?._id === role._id) state.current = role;
      })

      /* delete */
      .addCase(deleteRole.fulfilled, (state, action) => {
        state.list = state.list.filter((r) => r._id !== action.payload.id);
      });
  },
});

export const { clearCurrentRole, clearError } = roleSlice.actions;
export default roleSlice.reducer;
