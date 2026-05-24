import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  searchTopic,
  summarizeSources,
  generateBrief,
} from "@/api/research/research";

export const runTopicSearch = createAsyncThunk(
  "research/search",
  async (data, { rejectWithValue }) => {
    const res = await searchTopic(data);
    if (res?.status === "success") return res.data;
    return rejectWithValue(res?.message);
  }
);

export const runSummarize = createAsyncThunk(
  "research/summarize",
  async (data, { rejectWithValue }) => {
    const res = await summarizeSources(data);
    if (res?.status === "success") return res.data;
    return rejectWithValue(res?.message);
  }
);

export const runGenerateBrief = createAsyncThunk(
  "research/brief",
  async (data, { rejectWithValue }) => {
    const res = await generateBrief(data);
    if (res?.status === "success") return res.data;
    return rejectWithValue(res?.message);
  }
);

const initialState = {
  sources: [],
  selectedSources: [],
  brief: null,
  isSearching: false,
  isGenerating: false,
  error: null,
};

const researchSlice = createSlice({
  name: "research",
  initialState,
  reducers: {
    toggleSourceSelected: (state, action) => {
      const id = action.payload;
      if (state.selectedSources.includes(id)) {
        state.selectedSources = state.selectedSources.filter((s) => s !== id);
      } else {
        state.selectedSources.push(id);
      }
    },
    clearResearch: (state) => {
      state.sources = [];
      state.selectedSources = [];
      state.brief = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runTopicSearch.pending, (s) => {
        s.isSearching = true;
      })
      .addCase(runTopicSearch.fulfilled, (s, a) => {
        s.isSearching = false;
        s.sources = a.payload?.sources ?? [];
      })
      .addCase(runTopicSearch.rejected, (s, a) => {
        s.isSearching = false;
        s.error = a.payload;
      })
      .addCase(runGenerateBrief.pending, (s) => {
        s.isGenerating = true;
      })
      .addCase(runGenerateBrief.fulfilled, (s, a) => {
        s.isGenerating = false;
        s.brief = a.payload?.brief ?? null;
      });
  },
});

export const { toggleSourceSelected, clearResearch } = researchSlice.actions;
export default researchSlice.reducer;
