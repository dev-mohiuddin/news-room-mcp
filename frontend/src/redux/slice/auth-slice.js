import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  loginApi,
  registerApi,
  verifyOtpApi,
  resendOtpApi,
  googleSignInApi,
  logoutApi,
  meApi,
} from "@/api/auth/auth";

/* ──────────────────────────────────────────────────────────
 *  State shape
 * ────────────────────────────────────────────────────────── */
const initialState = {
  user: null,                // { id, name, email, role, permissions, ... }
  accessToken: null,         // JWT for Authorization header
  isAuthenticated: false,
  isLoading: false,
  error: null,
  pendingVerificationEmail: null, // set after register if OTP needed
};

/* ── Hydrate from localStorage on boot ── */
try {
  const storedUser = localStorage.getItem("user");
  const storedToken = localStorage.getItem("token");
  if (storedUser && storedToken) {
    initialState.user = JSON.parse(storedUser);
    initialState.accessToken = storedToken;
    initialState.isAuthenticated = true;
  }
} catch {
  /* corrupted storage — ignore */
}

/* ──────────────────────────────────────────────────────────
 *  Helpers — persist auth result consistently
 * ────────────────────────────────────────────────────────── */
const persistAuth = (state, payload) => {
  const user = payload?.data?.user || null;
  const token = payload?.data?.accessToken || null;

  if (user && token) {
    state.user = user;
    state.accessToken = token;
    state.isAuthenticated = true;
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", token);
  } else if (user && !token) {
    // e.g. registration with requiresVerification = true
    state.user = user;
    state.accessToken = null;
    state.isAuthenticated = false;
    state.pendingVerificationEmail = user.email;
  }
};

const clearAuth = (state) => {
  state.user = null;
  state.accessToken = null;
  state.isAuthenticated = false;
  state.error = null;
  state.pendingVerificationEmail = null;
  localStorage.removeItem("user");
  localStorage.removeItem("token");
};

/* ──────────────────────────────────────────────────────────
 *  Async thunks
 *
 *  Convention: backend success returns { success: true, data: {...} }.
 *  We forward the entire response payload so reducers can decide.
 * ────────────────────────────────────────────────────────── */

export const signInUser = createAsyncThunk(
  "auth/signIn",
  async (data, { rejectWithValue }) => {
    const res = await loginApi(data);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Login failed");
  }
);

export const signUpUser = createAsyncThunk(
  "auth/signUp",
  async (data, { rejectWithValue }) => {
    const res = await registerApi(data);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Registration failed");
  }
);

export const verifyEmailOtp = createAsyncThunk(
  "auth/verifyOtp",
  async (data, { rejectWithValue }) => {
    const res = await verifyOtpApi(data);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "OTP verification failed");
  }
);

export const resendEmailOtp = createAsyncThunk(
  "auth/resendOtp",
  async (data, { rejectWithValue }) => {
    const res = await resendOtpApi(data);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Failed to resend OTP");
  }
);

export const googleSignIn = createAsyncThunk(
  "auth/googleSignIn",
  async (data, { rejectWithValue }) => {
    const res = await googleSignInApi(data);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Google sign-in failed");
  }
);

export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchMe",
  async (_, { rejectWithValue }) => {
    const res = await meApi();
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Failed to fetch profile");
  }
);

export const logoutUser = createAsyncThunk("auth/logout", async () => {
  try {
    await logoutApi();
  } catch {
    // even if server call fails, we clear local state
  }
  return true;
});

/* ──────────────────────────────────────────────────────────
 *  Slice
 * ────────────────────────────────────────────────────────── */
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action) => {
      const user = action.payload;
      state.user = user;
      state.isAuthenticated = !!user;
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      } else {
        localStorage.removeItem("user");
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    forceLogout: clearAuth,
  },
  extraReducers: (builder) => {
    builder
      /* ── login ── */
      .addCase(signInUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInUser.fulfilled, (state, action) => {
        state.isLoading = false;
        persistAuth(state, action.payload);
      })
      .addCase(signInUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        clearAuth(state);
      })

      /* ── register ── */
      .addCase(signUpUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signUpUser.fulfilled, (state, action) => {
        state.isLoading = false;
        persistAuth(state, action.payload);
      })
      .addCase(signUpUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      /* ── verify OTP ── */
      .addCase(verifyEmailOtp.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(verifyEmailOtp.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pendingVerificationEmail = null;
        persistAuth(state, action.payload);
      })
      .addCase(verifyEmailOtp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      /* ── resend OTP ── */
      .addCase(resendEmailOtp.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(resendEmailOtp.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(resendEmailOtp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      /* ── Google ── */
      .addCase(googleSignIn.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(googleSignIn.fulfilled, (state, action) => {
        state.isLoading = false;
        persistAuth(state, action.payload);
      })
      .addCase(googleSignIn.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      /* ── fetchMe ── */
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        const user = action.payload?.data?.user;
        if (user) {
          state.user = user;
          state.isAuthenticated = true;
          localStorage.setItem("user", JSON.stringify(user));
        }
      })

      /* ── logout ── */
      .addCase(logoutUser.fulfilled, clearAuth);
  },
});

export const { setUser, clearError, forceLogout } = authSlice.actions;
export default authSlice.reducer;
