import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  generateArticleApi,
  listArticlesApi,
  getArticleApi,
  updateArticleApi,
  deleteArticleApi,
  publishArticleApi,
  retryArticleApi,
  cancelArticleApi,
  duplicateArticleApi,
  getQuotaApi,
} from "@/api/article/article";

/* ──────────────────────────────────────────────────────────
 *  Thunks — talk to the new article pipeline
 * ────────────────────────────────────────────────────────── */

export const generateArticle = createAsyncThunk(
  "articles/generate",
  async (payload, { rejectWithValue }) => {
    const res = await generateArticleApi(payload);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not start generation");
  }
);

export const fetchArticles = createAsyncThunk(
  "articles/list",
  async (params, { rejectWithValue }) => {
    const res = await listArticlesApi(params);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load articles");
  }
);

export const fetchArticleById = createAsyncThunk(
  "articles/getOne",
  async (id, { rejectWithValue }) => {
    const res = await getArticleApi(id);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load article");
  }
);

export const saveArticleEdits = createAsyncThunk(
  "articles/update",
  async ({ id, data }, { rejectWithValue }) => {
    const res = await updateArticleApi(id, data);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not save");
  }
);

export const removeArticle = createAsyncThunk(
  "articles/delete",
  async (id, { rejectWithValue }) => {
    const res = await deleteArticleApi(id);
    if (res?.success !== false) return { id };
    return rejectWithValue(res?.message || "Could not delete");
  }
);

export const publishArticle = createAsyncThunk(
  "articles/publish",
  async ({ id, payload }, { rejectWithValue }) => {
    const res = await publishArticleApi(id, payload);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Publish failed");
  }
);

export const retryArticle = createAsyncThunk(
  "articles/retry",
  async ({ id, from } = {}, { rejectWithValue }) => {
    const res = await retryArticleApi(id, from ? { from } : {});
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Retry failed");
  }
);

export const cancelArticle = createAsyncThunk(
  "articles/cancel",
  async (id, { rejectWithValue }) => {
    const res = await cancelArticleApi(id);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Cancel failed");
  }
);

export const duplicateArticle = createAsyncThunk(
  "articles/duplicate",
  async (id, { rejectWithValue }) => {
    const res = await duplicateArticleApi(id);
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Duplicate failed");
  }
);

export const fetchQuota = createAsyncThunk(
  "articles/quota",
  async (_, { rejectWithValue }) => {
    const res = await getQuotaApi();
    if (res?.success) return res;
    return rejectWithValue(res?.message || "Could not load quota");
  }
);

/* ──────────────────────────────────────────────────────────
 *  Slice
 * ────────────────────────────────────────────────────────── */

const initialState = {
  // List
  list: [],
  pagination: null,
  // Detail
  current: null,
  brief: null,
  // Live job tracking — `progress[articleId] = { status, stage, percent }`
  progress: {},
  // Quota snapshot from /api/v1/quota
  quota: null,
  // Flags
  isLoading: false,
  isMutating: false,
  error: null,
  lastJobId: null,
};

const articleSlice = createSlice({
  name: "articles",
  initialState,
  reducers: {
    clearArticleError: (state) => {
      state.error = null;
    },
    clearCurrentArticle: (state) => {
      state.current = null;
      state.brief = null;
    },
    /** Socket.io `article:progress` */
    receiveProgress: (state, action) => {
      const { articleId, status, stage, percent } = action.payload || {};
      if (!articleId) return;
      state.progress[articleId] = { status, stage, percent };
      // Mirror onto list / current if present
      const idx = state.list.findIndex((a) => a._id === articleId);
      if (idx >= 0) state.list[idx] = { ...state.list[idx], status };
      if (state.current?._id === articleId) {
        state.current = { ...state.current, status };
      }
    },
    /** Socket.io `article:done` */
    receiveDone: (state, action) => {
      const { articleId, status } = action.payload || {};
      if (!articleId) return;
      state.progress[articleId] = {
        status,
        stage: "done",
        percent: 100,
      };
      const idx = state.list.findIndex((a) => a._id === articleId);
      if (idx >= 0) state.list[idx] = { ...state.list[idx], status };
      if (state.current?._id === articleId) {
        state.current = { ...state.current, status };
      }
    },
    /** Socket.io `article:failed` */
    receiveFailed: (state, action) => {
      const { articleId, status, failureReason } = action.payload || {};
      if (!articleId) return;
      state.progress[articleId] = {
        status,
        failureReason,
        stage: "failed",
        percent: 100,
      };
      const idx = state.list.findIndex((a) => a._id === articleId);
      if (idx >= 0)
        state.list[idx] = { ...state.list[idx], status, failureReason };
      if (state.current?._id === articleId) {
        state.current = { ...state.current, status, failureReason };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateArticle.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(generateArticle.fulfilled, (state, action) => {
        state.isMutating = false;
        state.lastJobId = action.payload?.data?.jobId || null;
      })
      .addCase(generateArticle.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload;
      })

      .addCase(fetchArticles.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchArticles.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload?.data || [];
        state.pagination = action.payload?.pagination || null;
      })
      .addCase(fetchArticles.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      .addCase(fetchArticleById.fulfilled, (state, action) => {
        state.current = action.payload?.data?.article || null;
        state.brief = action.payload?.data?.brief || null;
      })

      .addCase(saveArticleEdits.fulfilled, (state, action) => {
        const article = action.payload?.data;
        if (!article) return;
        state.current = article;
        const idx = state.list.findIndex((a) => a._id === article._id);
        if (idx >= 0) state.list[idx] = article;
      })

      .addCase(removeArticle.fulfilled, (state, action) => {
        const { id } = action.payload || {};
        state.list = state.list.filter((a) => a._id !== id);
      })

      .addCase(publishArticle.fulfilled, (state, action) => {
        const article = action.payload?.data?.article;
        if (!article) return;
        state.current = article;
        const idx = state.list.findIndex((a) => a._id === article._id);
        if (idx >= 0) state.list[idx] = article;
      })

      .addCase(retryArticle.fulfilled, (state, action) => {
        const data = action.payload?.data;
        if (!data) return;
        if (state.current?._id === data.articleId) {
          state.current = {
            ...state.current,
            status: data.status,
            failureReason: null,
          };
        }
        const idx = state.list.findIndex((a) => a._id === data.articleId);
        if (idx >= 0) {
          state.list[idx] = {
            ...state.list[idx],
            status: data.status,
            failureReason: null,
          };
        }
        state.lastJobId = data.jobId || state.lastJobId;
      })

      .addCase(cancelArticle.fulfilled, (state, action) => {
        const data = action.payload?.data;
        if (!data) return;
        if (state.current?._id === data.articleId) {
          state.current = { ...state.current, status: data.status };
        }
        const idx = state.list.findIndex((a) => a._id === data.articleId);
        if (idx >= 0) {
          state.list[idx] = { ...state.list[idx], status: data.status };
        }
      })

      .addCase(duplicateArticle.fulfilled, (state, action) => {
        const newArticle = action.payload?.data;
        if (!newArticle) return;
        // Prepend so the user sees the copy at the top of the list.
        state.list = [newArticle, ...state.list];
      })

      .addCase(fetchQuota.fulfilled, (state, action) => {
        state.quota = action.payload?.data || null;
      });
  },
});

export const {
  clearArticleError,
  clearCurrentArticle,
  receiveProgress,
  receiveDone,
  receiveFailed,
} = articleSlice.actions;
export default articleSlice.reducer;
