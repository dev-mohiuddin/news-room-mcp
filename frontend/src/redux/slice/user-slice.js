import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getMyProfile,
  updateProfile,
  changePassword,
  updateNotifications,
  updateWorkspace,
  getApiKeys,
  createApiKey,
  deleteApiKey,
  getProviderKeys,
  upsertProviderKey,
  deleteProviderKey,
} from "@/api/user";

/* ── Profile ── */
export const fetchMyProfile = createAsyncThunk(
  "user/me",
  async (_, { rejectWithValue }) => {
    const res = await getMyProfile();
    if (res?.success) return res.data;
    return rejectWithValue(res?.message || "Could not load profile");
  }
);

export const saveProfile = createAsyncThunk(
  "user/profile",
  async (data, { rejectWithValue }) => {
    const res = await updateProfile(data);
    if (res?.success) return res.data;
    return rejectWithValue(res?.message || "Could not update profile");
  }
);

export const savePassword = createAsyncThunk(
  "user/password",
  async (data, { rejectWithValue }) => {
    const res = await changePassword(data);
    if (res?.success) return true;
    return rejectWithValue(res?.message || "Password update failed");
  }
);

export const saveNotifications = createAsyncThunk(
  "user/notifications",
  async (data, { rejectWithValue }) => {
    const res = await updateNotifications(data);
    if (res?.success) return res.data;
    return rejectWithValue(res?.message || "Could not update notifications");
  }
);

export const saveWorkspace = createAsyncThunk(
  "user/workspace",
  async (data, { rejectWithValue }) => {
    const res = await updateWorkspace(data);
    if (res?.success) return res.data;
    return rejectWithValue(res?.message || "Could not update workspace");
  }
);

/* ── Personal API Keys ── */
export const fetchApiKeys = createAsyncThunk(
  "user/apiKeys/list",
  async (_, { rejectWithValue }) => {
    const res = await getApiKeys();
    if (res?.success) return res.data;
    return rejectWithValue(res?.message || "Could not load API keys");
  }
);

export const issueApiKey = createAsyncThunk(
  "user/apiKeys/create",
  async (data, { rejectWithValue }) => {
    const res = await createApiKey(data);
    if (res?.success) return res.data;
    return rejectWithValue(res?.message || "Could not create API key");
  }
);

export const revokeApiKey = createAsyncThunk(
  "user/apiKeys/revoke",
  async (id, { rejectWithValue }) => {
    const res = await deleteApiKey(id);
    if (res?.success) return { id };
    return rejectWithValue(res?.message || "Could not revoke API key");
  }
);

/* ── Provider Keys ── */
export const fetchProviderKeys = createAsyncThunk(
  "user/providerKeys/list",
  async (_, { rejectWithValue }) => {
    const res = await getProviderKeys();
    if (res?.success) return res.data;
    return rejectWithValue(res?.message || "Could not load provider keys");
  }
);

export const saveProviderKey = createAsyncThunk(
  "user/providerKeys/save",
  async (data, { rejectWithValue }) => {
    const res = await upsertProviderKey(data);
    if (res?.success) return res.data;
    return rejectWithValue(res?.message || "Could not save provider key");
  }
);

export const removeProviderKey = createAsyncThunk(
  "user/providerKeys/remove",
  async (provider, { rejectWithValue }) => {
    const res = await deleteProviderKey(provider);
    if (res?.success) return res.data;
    return rejectWithValue(res?.message || "Could not remove provider key");
  }
);

const initialState = {
  profile: null,
  workspace: null,
  apiKeys: [],
  providerKeys: [],
  /** Holds the raw secret returned by `issueApiKey` so the UI can
   *  show the "Copy your new key" dialog ONCE, then clear it. */
  newApiKeyToken: null,
  isLoading: false,
  isMutating: false,
  error: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    clearNewApiKeyToken: (s) => {
      s.newApiKeyToken = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyProfile.pending, (s) => {
        s.isLoading = true;
        s.error = null;
      })
      .addCase(fetchMyProfile.fulfilled, (s, a) => {
        s.isLoading = false;
        s.profile = a.payload?.user || null;
        s.workspace = a.payload?.workspace || null;
      })
      .addCase(fetchMyProfile.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload;
      })
      .addCase(saveProfile.fulfilled, (s, a) => {
        s.profile = a.payload || s.profile;
      })
      .addCase(saveNotifications.fulfilled, (s, a) => {
        if (s.profile) {
          s.profile = {
            ...s.profile,
            preferences: {
              ...(s.profile.preferences || {}),
              notifications: a.payload || {},
            },
          };
        }
      })
      .addCase(saveWorkspace.fulfilled, (s, a) => {
        s.workspace = a.payload || s.workspace;
      })
      /* API keys */
      .addCase(fetchApiKeys.fulfilled, (s, a) => {
        s.apiKeys = a.payload || [];
      })
      .addCase(issueApiKey.fulfilled, (s, a) => {
        if (a.payload?.apiKey) {
          s.apiKeys = [a.payload.apiKey, ...s.apiKeys];
          s.newApiKeyToken = a.payload.rawToken || null;
        }
      })
      .addCase(revokeApiKey.fulfilled, (s, a) => {
        s.apiKeys = s.apiKeys.filter((k) => k.id !== a.payload?.id);
      })
      /* Provider keys */
      .addCase(fetchProviderKeys.fulfilled, (s, a) => {
        s.providerKeys = a.payload || [];
      })
      .addCase(saveProviderKey.fulfilled, (s, a) => {
        if (!a.payload) return;
        const next = [...s.providerKeys];
        const idx = next.findIndex((p) => p.provider === a.payload.provider);
        if (idx >= 0) next[idx] = a.payload;
        else next.push(a.payload);
        s.providerKeys = next;
      })
      .addCase(removeProviderKey.fulfilled, (s, a) => {
        if (!a.payload) return;
        const next = [...s.providerKeys];
        const idx = next.findIndex((p) => p.provider === a.payload.provider);
        if (idx >= 0) next[idx] = a.payload;
        s.providerKeys = next;
      });
  },
});

export const { clearNewApiKeyToken } = userSlice.actions;
export default userSlice.reducer;
