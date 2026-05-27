import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getPublicSettingsApi,
  getAdminSettingsApi,
  patchSettingsSectionApi,
  replaceFeatureFlagsApi,
  toggleFeatureFlagApi,
} from "@/api/system/settings";

/* ──────────────────────────────────────────────────────────
 *  Thunks
 * ────────────────────────────────────────────────────────── */

export const fetchPublicSettings = createAsyncThunk(
  "system/public",
  async (_, { rejectWithValue }) => {
    const res = await getPublicSettingsApi();
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load settings");
  }
);

export const fetchAdminSettings = createAsyncThunk(
  "system/admin",
  async (_, { rejectWithValue }) => {
    const res = await getAdminSettingsApi();
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load settings");
  }
);

export const patchSettingsSection = createAsyncThunk(
  "system/patchSection",
  async ({ section, payload }, { rejectWithValue }) => {
    const res = await patchSettingsSectionApi(section, payload);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not save");
  }
);

export const replaceFeatureFlags = createAsyncThunk(
  "system/replaceFlags",
  async (features, { rejectWithValue }) => {
    const res = await replaceFeatureFlagsApi(features);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not save flags");
  }
);

export const toggleFeatureFlag = createAsyncThunk(
  "system/toggleFlag",
  async ({ flagId, payload }, { rejectWithValue }) => {
    const res = await toggleFeatureFlagApi(flagId, payload);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not toggle flag");
  }
);

/* ──────────────────────────────────────────────────────────
 *  Slice
 * ────────────────────────────────────────────────────────── */

const initialState = {
  /** Public — used by maintenance banner & landing branding */
  publicSettings: null,

  /** Admin — full doc */
  adminSettings: null,

  isLoading: false,
  isMutating: false,
  error: null,
};

const systemSlice = createSlice({
  name: "system",
  initialState,
  reducers: {
    clearSystemError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* public */
      .addCase(fetchPublicSettings.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPublicSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.publicSettings = action.payload?.data || null;
      })
      .addCase(fetchPublicSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      /* admin reads */
      .addCase(fetchAdminSettings.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchAdminSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.adminSettings = action.payload?.data || null;
      })
      .addCase(fetchAdminSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      /* writes */
      .addCase(patchSettingsSection.pending, (state) => {
        state.isMutating = true;
      })
      .addCase(patchSettingsSection.fulfilled, (state, action) => {
        state.isMutating = false;
        state.adminSettings = action.payload?.data || state.adminSettings;
      })
      .addCase(patchSettingsSection.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload;
      })

      .addCase(replaceFeatureFlags.pending, (state) => {
        state.isMutating = true;
      })
      .addCase(replaceFeatureFlags.fulfilled, (state, action) => {
        state.isMutating = false;
        state.adminSettings = action.payload?.data || state.adminSettings;
      })
      .addCase(replaceFeatureFlags.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload;
      })

      .addCase(toggleFeatureFlag.pending, (state) => {
        state.isMutating = true;
      })
      .addCase(toggleFeatureFlag.fulfilled, (state, action) => {
        state.isMutating = false;
        state.adminSettings = action.payload?.data || state.adminSettings;
      })
      .addCase(toggleFeatureFlag.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload;
      });
  },
});

export const { clearSystemError } = systemSlice.actions;
export default systemSlice.reducer;
