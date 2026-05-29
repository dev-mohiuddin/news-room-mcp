import { configureStore, combineReducers } from "@reduxjs/toolkit";
import storage from "redux-persist/lib/storage";
import { persistStore, persistReducer } from "redux-persist";

import authSlice from "./slice/auth-slice";
import articleSlice from "./slice/article-slice";
import editorSlice from "./slice/editor-slice";
import researchSlice from "./slice/research-slice";
import cmsSlice from "./slice/cms-slice";
import uiSlice from "./slice/ui-slice";
import billingSlice from "./slice/billing-slice";
import adminSlice from "./slice/admin-slice";
import brandSlice from "./slice/brand-slice";
import teamSlice from "./slice/team-slice";
import roleSlice from "./slice/role-slice";
import notificationSlice from "./slice/notification-slice";
import planSlice from "./slice/plan-slice";
import systemSlice from "./slice/system-slice";
import supportSlice from "./slice/support-slice";
import analyticsSlice from "./slice/analytics-slice";
import templateSlice from "./slice/template-slice";
import userSlice from "./slice/user-slice";
import integrationSlice from "./slice/integration-slice";
import wizardSlice from "./slice/wizard-slice";

// Persist only auth + ui (rest are server data)
const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth", "ui"],
};

const rootReducer = combineReducers({
  auth: authSlice,
  articles: articleSlice,
  editor: editorSlice,
  research: researchSlice,
  cms: cmsSlice,
  ui: uiSlice,
  billing: billingSlice,
  admin: adminSlice,
  brand: brandSlice,
  team: teamSlice,
  role: roleSlice,
  notifications: notificationSlice,
  plans: planSlice,
  system: systemSlice,
  support: supportSlice,
  analytics: analyticsSlice,
  templates: templateSlice,
  user: userSlice,
  integrations: integrationSlice,
  wizard: wizardSlice,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          "persist/PERSIST",
          "persist/REHYDRATE",
          "persist/PURGE",
        ],
      },
    }),
});

export const persistor = persistStore(store);
export default store;
