import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getAllArticles,
  getSingleArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  publishArticle,
  articleStatistics,
} from "@/api/article/article";

// Thunks

export const fetchAllArticles = createAsyncThunk(
  "articles/fetchAll",
  async (params = {}, { rejectWithValue }) => {
    const {
      page = 1,
      rows = 10,
      sortField = "id",
      sortOrder = "desc",
      search_term = "",
    } = params;

    const res = await getAllArticles(
      `?page=${page}&rows=${rows}&sort_order=${sortOrder}&sortField=${sortField}&search_term=${search_term}`
    );

    if (res?.status === "success") return res.data;
    return rejectWithValue(res?.message);
  }
);

export const fetchSingleArticle = createAsyncThunk(
  "articles/fetchOne",
  async (id, { rejectWithValue }) => {
    const res = await getSingleArticle(id);
    if (res?.status === "success") return res.data.article;
    return rejectWithValue(res?.message);
  }
);

export const createNewArticle = createAsyncThunk(
  "articles/create",
  async (data, { rejectWithValue }) => {
    const res = await createArticle(data);
    if (res?.status === "success") return res.data.article;
    return rejectWithValue(res?.message);
  }
);

export const updateExistingArticle = createAsyncThunk(
  "articles/update",
  async ({ id, data }, { rejectWithValue }) => {
    const res = await updateArticle(id, data);
    if (res?.status === "success") return res.data.article;
    return rejectWithValue(res?.message);
  }
);

export const deleteArticleById = createAsyncThunk(
  "articles/delete",
  async (id, { rejectWithValue }) => {
    const res = await deleteArticle(id);
    if (res?.status === "success") return id;
    return rejectWithValue(res?.message);
  }
);

export const publishArticleById = createAsyncThunk(
  "articles/publish",
  async ({ id, data }, { rejectWithValue }) => {
    const res = await publishArticle(id, data);
    if (res?.status === "success") return res.data.article;
    return rejectWithValue(res?.message);
  }
);

export const fetchArticleStatistics = createAsyncThunk(
  "articles/statistics",
  async (_, { rejectWithValue }) => {
    const res = await articleStatistics();
    if (res?.status === "success") return res.data;
    return rejectWithValue(res?.message);
  }
);

const initialState = {
  articles: [],
  singleArticle: null,
  pagination: null,
  statistics: null,

  getLoading: false,
  createLoading: false,
  updateLoading: false,
  deleteLoading: false,

  success: null,
  error: null,
  requestStatus: false,
};

const articleSlice = createSlice({
  name: "articles",
  initialState,
  reducers: {
    clearArticleMessages: (state) => {
      state.success = null;
      state.error = null;
      state.requestStatus = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllArticles.pending, (state) => {
        state.getLoading = true;
        state.error = null;
      })
      .addCase(fetchAllArticles.fulfilled, (state, action) => {
        state.getLoading = false;
        state.articles = action.payload?.articles ?? [];
        state.pagination = action.payload?.pagination ?? null;
        state.requestStatus = true;
      })
      .addCase(fetchAllArticles.rejected, (state, action) => {
        state.getLoading = false;
        state.error = action.payload;
      })

      .addCase(fetchSingleArticle.pending, (state) => {
        state.getLoading = true;
        state.error = null;
      })
      .addCase(fetchSingleArticle.fulfilled, (state, action) => {
        state.getLoading = false;
        state.singleArticle = action.payload;
        state.requestStatus = true;
      })
      .addCase(fetchSingleArticle.rejected, (state, action) => {
        state.getLoading = false;
        state.error = action.payload;
      })

      .addCase(createNewArticle.pending, (state) => {
        state.createLoading = true;
        state.error = null;
      })
      .addCase(createNewArticle.fulfilled, (state, action) => {
        state.createLoading = false;
        state.articles.unshift(action.payload);
        state.success = "Article created successfully!";
        state.requestStatus = true;
      })
      .addCase(createNewArticle.rejected, (state, action) => {
        state.createLoading = false;
        state.error = action.payload;
      })

      .addCase(updateExistingArticle.pending, (state) => {
        state.updateLoading = true;
        state.error = null;
      })
      .addCase(updateExistingArticle.fulfilled, (state, action) => {
        state.updateLoading = false;
        state.articles = state.articles.map((a) =>
          a.id === action.payload.id ? action.payload : a
        );
        state.success = "Article updated successfully!";
        state.requestStatus = true;
      })
      .addCase(updateExistingArticle.rejected, (state, action) => {
        state.updateLoading = false;
        state.error = action.payload;
      })

      .addCase(deleteArticleById.pending, (state) => {
        state.deleteLoading = true;
        state.error = null;
      })
      .addCase(deleteArticleById.fulfilled, (state, action) => {
        state.deleteLoading = false;
        state.articles = state.articles.filter(
          (a) => a.id !== action.payload
        );
        state.success = "Article deleted successfully!";
        state.requestStatus = true;
      })
      .addCase(deleteArticleById.rejected, (state, action) => {
        state.deleteLoading = false;
        state.error = action.payload;
      })

      .addCase(publishArticleById.pending, (state) => {
        state.updateLoading = true;
      })
      .addCase(publishArticleById.fulfilled, (state, action) => {
        state.updateLoading = false;
        state.articles = state.articles.map((a) =>
          a.id === action.payload.id ? action.payload : a
        );
        state.success = "Article published!";
        state.requestStatus = true;
      })
      .addCase(publishArticleById.rejected, (state, action) => {
        state.updateLoading = false;
        state.error = action.payload;
      })

      .addCase(fetchArticleStatistics.fulfilled, (state, action) => {
        state.statistics = action.payload;
      });
  },
});

export const { clearArticleMessages } = articleSlice.actions;
export default articleSlice.reducer;
