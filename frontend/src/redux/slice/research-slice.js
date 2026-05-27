import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  searchTopic,
  summarizeSources,
  generateBrief,
} from "@/api/research/research";

/**
 * Research Hub thunks — call /api/v1/research/* and accept the
 * standard backend envelope { success, data, message, ... }.
 */

export const runTopicSearch = createAsyncThunk(
  "research/search",
  async (data, { rejectWithValue }) => {
    const res = await searchTopic(data);
    if (res?.success) return res.data;
    return rejectWithValue(res?.message || "Search failed");
  }
);

export const runSummarize = createAsyncThunk(
  "research/summarize",
  async (data, { rejectWithValue }) => {
    const res = await summarizeSources(data);
    if (res?.success) return res.data;
    return rejectWithValue(res?.message || "Summarization failed");
  }
);

export const runGenerateBrief = createAsyncThunk(
  "research/brief",
  async (data, { rejectWithValue }) => {
    const res = await generateBrief(data);
    if (res?.success) return res.data;
    return rejectWithValue(res?.message || "Could not generate brief");
  }
);

const initialState = {
  sources: [],
  selectedUrls: [], // url[], used by summarize call
  brief: null,
  query: null,
  isSearching: false,
  isGenerating: false,
  error: null,
};

const researchSlice = createSlice({
  name: "research",
  initialState,
  reducers: {
    toggleSourceSelected: (state, action) => {
      const url = action.payload;
      if (state.selectedUrls.includes(url)) {
        state.selectedUrls = state.selectedUrls.filter((u) => u !== url);
      } else {
        state.selectedUrls.push(url);
      }
    },
    clearResearch: (state) => {
      state.sources = [];
      state.selectedUrls = [];
      state.brief = null;
      state.error = null;
      state.query = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runTopicSearch.pending, (s) => {
        s.isSearching = true;
        s.error = null;
        s.brief = null;
      })
      .addCase(runTopicSearch.fulfilled, (s, a) => {
        s.isSearching = false;
        s.sources = a.payload?.sources ?? [];
        s.query = a.payload?.query ?? null;
        s.selectedUrls = [];
      })
      .addCase(runTopicSearch.rejected, (s, a) => {
        s.isSearching = false;
        s.error = a.payload;
      })
      .addCase(runGenerateBrief.pending, (s) => {
        s.isGenerating = true;
        s.error = null;
      })
      .addCase(runGenerateBrief.fulfilled, (s, a) => {
        s.isGenerating = false;
        s.brief = a.payload?.brief ?? null;
      })
      .addCase(runGenerateBrief.rejected, (s, a) => {
        s.isGenerating = false;
        s.error = a.payload;
      });
  },
});

export const { toggleSourceSelected, clearResearch } = researchSlice.actions;
export default researchSlice.reducer;
