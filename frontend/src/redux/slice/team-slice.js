import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getTeamApi,
  inviteMemberApi,
  resendInviteApi,
  cancelInviteApi,
  changeMemberRoleApi,
  removeMemberApi,
  inspectInviteApi,
  acceptInviteApi,
} from "@/api/team/team";

/* ── Thunks ── */
export const fetchTeam = createAsyncThunk(
  "team/fetch",
  async (_, { rejectWithValue }) => {
    const res = await getTeamApi();
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Failed to load team");
  }
);

export const inviteMember = createAsyncThunk(
  "team/invite",
  async (payload, { rejectWithValue }) => {
    const res = await inviteMemberApi(payload);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Failed to invite member");
  }
);

export const resendInvite = createAsyncThunk(
  "team/resendInvite",
  async (id, { rejectWithValue }) => {
    const res = await resendInviteApi(id);
    if (res?.success) return { id, ...res };
    return rejectWithValue(res?.message || "Failed to resend");
  }
);

export const cancelInvite = createAsyncThunk(
  "team/cancelInvite",
  async (id, { rejectWithValue }) => {
    const res = await cancelInviteApi(id);
    if (res?.success) return { id, ...res };
    return rejectWithValue(res?.message || "Failed to cancel");
  }
);

export const changeMemberRole = createAsyncThunk(
  "team/changeRole",
  async ({ id, roleName }, { rejectWithValue }) => {
    const res = await changeMemberRoleApi(id, roleName);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Failed to change role");
  }
);

export const removeMember = createAsyncThunk(
  "team/removeMember",
  async (id, { rejectWithValue }) => {
    const res = await removeMemberApi(id);
    if (res?.success) return { id, ...res };
    return rejectWithValue(res?.message || "Failed to remove member");
  }
);

export const inspectInvite = createAsyncThunk(
  "team/inspectInvite",
  async (token, { rejectWithValue }) => {
    const res = await inspectInviteApi(token);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Invalid invitation");
  }
);

export const acceptInvite = createAsyncThunk(
  "team/acceptInvite",
  async ({ token, payload }, { rejectWithValue }) => {
    const res = await acceptInviteApi(token, payload);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Failed to accept invitation");
  }
);

/* ── Slice ── */
const initialState = {
  members: [],
  invites: [],
  isLoading: false,
  isMutating: false,
  error: null,
  // Public invite acceptance state
  inviteInspection: null,
};

const teamSlice = createSlice({
  name: "team",
  initialState,
  reducers: {
    clearTeamError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeam.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTeam.fulfilled, (state, action) => {
        state.isLoading = false;
        state.members = action.payload.data?.members || [];
        state.invites = action.payload.data?.invites || [];
      })
      .addCase(fetchTeam.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      .addCase(inviteMember.fulfilled, (state, action) => {
        const invite = action.payload.data?.invite;
        if (invite) state.invites.unshift(invite);
      })

      .addCase(cancelInvite.fulfilled, (state, action) => {
        state.invites = state.invites.filter((i) => i._id !== action.payload.id && i.id !== action.payload.id);
      })

      .addCase(changeMemberRole.fulfilled, (state, action) => {
        const updated = action.payload.data;
        if (!updated) return;
        state.members = state.members.map((m) =>
          m._id === updated._id ? updated : m
        );
      })

      .addCase(removeMember.fulfilled, (state, action) => {
        state.members = state.members.filter((m) => m._id !== action.payload.id);
      })

      .addCase(inspectInvite.fulfilled, (state, action) => {
        state.inviteInspection = action.payload.data;
      })
      .addCase(inspectInvite.rejected, (state) => {
        state.inviteInspection = { valid: false };
      });
  },
});

export const { clearTeamError } = teamSlice.actions;
export default teamSlice.reducer;
