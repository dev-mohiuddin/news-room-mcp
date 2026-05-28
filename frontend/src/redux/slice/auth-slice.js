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
 *
 *  Single source of truth for AUTHENTICATION is the httpOnly
 *  `access_token` cookie issued by the backend. The frontend
 *  never holds a JWT — it can't because we cannot read httpOnly
 *  cookies from JS, by design.
 *
 *  We DO cache the public `user` payload in localStorage so the
 *  app can render the navbar / role-gated layout instantly on
 *  page reload, without waiting for /auth/me. This cache is
 *  treated as a hint only — `fetchCurrentUser` (called from
 *  CheckAuth) refreshes it from the server on every boot, and
 *  any 401 response clears it via `forceLogout`.
 * ────────────────────────────────────────────────────────── */
const initialState = {
  user: null,                     // public profile payload (cached)
  isAuthenticated: false,         // derived from `user` presence
  isLoading: false,
  error: null,
  pendingVerificationEmail: null, // set after register if OTP needed
};

/* ── Hydrate from localStorage on boot ──
 *
 * We only check for a cached `user` object. The actual auth state
 * is verified on first /auth/me call; this cache just primes the
 * UI so first paint isn't blank.
 */
try {
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    initialState.user = JSON.parse(storedUser);
    initialState.isAuthenticated = true;
  }
} catch {
  /* corrupted storage — ignore */
}

/* ──────────────────────────────────────────────────────────
 *  Helpers — persist auth result consistently
 *
 *  `persistAuth` runs after a successful login / register / verify.
 *  We DO NOT store `accessToken` — it lives only in the httpOnly
 *  cookie. Persisting the public `user` keeps the UI snappy
 *  across page reloads.
 * ────────────────────────────────────────────────────────── */
const persistAuth = (state, payload) => {
  const user = payload?.data?.user || null;
  const requiresVerification = payload?.data?.requiresVerification === true;

  if (user && !requiresVerification) {
    state.user = user;
    state.isAuthenticated = true;
    state.pendingVerificationEmail = null;
    localStorage.setItem("user", JSON.stringify(user));
  } else if (user && requiresVerification) {
    // Registration flow with OTP — user exists but is not yet authenticated.
    state.user = null;
    state.isAuthenticated = false;
    state.pendingVerificationEmail = user.email;
    localStorage.removeItem("user");
  }
};

const clearAuth = (state) => {
  state.user = null;
  state.isAuthenticated = false;
  state.error = null;
  state.pendingVerificationEmail = null;
  localStorage.removeItem("user");
  /* Legacy key — drop if it lingers from older builds */
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
