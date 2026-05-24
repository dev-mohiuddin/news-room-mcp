import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  sidebarOpen: true,
  sidebarCollapsed: false,
  activeModal: null,
  notifications: [],
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    toggleSidebarCollapsed: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action) => {
      state.sidebarCollapsed = action.payload;
    },
    openModal: (state, action) => {
      state.activeModal = action.payload;
    },
    closeModal: (state) => {
      state.activeModal = null;
    },
    pushNotification: (state, action) => {
      state.notifications.unshift(action.payload);
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
  },
});

export const {
  toggleSidebar,
  toggleSidebarCollapsed,
  setSidebarCollapsed,
  openModal,
  closeModal,
  pushNotification,
  clearNotifications,
} = uiSlice.actions;

export default uiSlice.reducer;
