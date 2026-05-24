import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getTeamMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
} from "@/api/team/team";

export const fetchTeamMembers = createAsyncThunk(
  "team/fetchAll",
  async (query = "", { rejectWithValue }) => {
    const res = await getTeamMembers(query);
    if (res?.status === "success") return res.data;
    return rejectWithValue(res?.message);
  }
);

export const inviteNewMember = createAsyncThunk(
  "team/invite",
  async (data, { rejectWithValue }) => {
    const res = await inviteMember(data);
    if (res?.status === "success") return res.data;
    return rejectWithValue(res?.message);
  }
);

export const changeMemberRole = createAsyncThunk(
  "team/changeRole",
  async ({ id, data }, { rejectWithValue }) => {
    const res = await updateMemberRole(id, data);
    if (res?.status === "success") return res.data;
    return rejectWithValue(res?.message);
  }
);

export const removeTeamMember = createAsyncThunk(
  "team/remove",
  async (id, { rejectWithValue }) => {
    const res = await removeMember(id);
    if (res?.status === "success") return id;
    return rejectWithValue(res?.message);
  }
);

const initialState = {
  members: [],
  pagination: null,
  getLoading: false,
  success: null,
  error: null,
};

const teamSlice = createSlice({
  name: "team",
  initialState,
  reducers: {
    clearTeamMessages: (s) => {
      s.success = null;
      s.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeamMembers.pending, (s) => {
        s.getLoading = true;
      })
      .addCase(fetchTeamMembers.fulfilled, (s, a) => {
        s.getLoading = false;
        s.members = a.payload?.members ?? [];
      });
  },
});

export const { clearTeamMessages } = teamSlice.actions;
export default teamSlice.reducer;
