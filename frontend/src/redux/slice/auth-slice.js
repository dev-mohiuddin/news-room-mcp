import { loginApi, registerApi } from "@/api/auth/auth";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  error: null,
};

// Hydrate from localStorage on boot
const storedUser = localStorage.getItem("user");
const storedToken = localStorage.getItem("token");
if (storedUser && storedToken) {
  try {
    initialState.user = JSON.parse(storedUser);
    initialState.isAuthenticated = true;
  } catch {
    /* ignore */
  }
}

export const signInUser = createAsyncThunk(
  "/auth/sign-in",
  async (data, { rejectWithValue }) => {
    const res = await loginApi(data);
    if (res?.status === "success") return res;
    return rejectWithValue(res?.message || "Login failed");
  }
);

export const signUpUser = createAsyncThunk(
  "/auth/sign-up",
  async (data, { rejectWithValue }) => {
    const res = await registerApi(data);
    if (res?.status === "success") return res;
    return rejectWithValue(res?.message || "Registration failed");
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logoutUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // login
      .addCase(signInUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInUser.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload?.status === "success") {
          state.isAuthenticated = true;
          state.user = action.payload.data.user;
          localStorage.setItem("token", action.payload.data.token);
          localStorage.setItem(
            "user",
            JSON.stringify(action.payload.data.user)
          );
        }
      })
      .addCase(signInUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.user = null;
        state.isAuthenticated = false;
      })

      // register
      .addCase(signUpUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signUpUser.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload?.status === "success" && action.payload?.data?.token) {
          state.isAuthenticated = true;
          state.user = action.payload.data.user;
          localStorage.setItem("token", action.payload.data.token);
          localStorage.setItem(
            "user",
            JSON.stringify(action.payload.data.user)
          );
        }
      })
      .addCase(signUpUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { logoutUser, setUser } = authSlice.actions;
export default authSlice.reducer;
