import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  step: 1, // 1..5 wizard
  content: "",
  outline: [],
  isDirty: false,
  autoSaveStatus: "idle", // idle | saving | saved | error
  versions: [],
};

const editorSlice = createSlice({
  name: "editor",
  initialState,
  reducers: {
    setStep: (state, action) => {
      state.step = action.payload;
    },
    nextStep: (state) => {
      state.step = Math.min(state.step + 1, 5);
    },
    prevStep: (state) => {
      state.step = Math.max(state.step - 1, 1);
    },
    setContent: (state, action) => {
      state.content = action.payload;
      state.isDirty = true;
    },
    setOutline: (state, action) => {
      state.outline = action.payload;
      state.isDirty = true;
    },
    setAutoSaveStatus: (state, action) => {
      state.autoSaveStatus = action.payload;
      if (action.payload === "saved") state.isDirty = false;
    },
    pushVersion: (state, action) => {
      state.versions.unshift(action.payload);
    },
    resetEditor: () => initialState,
  },
});

export const {
  setStep,
  nextStep,
  prevStep,
  setContent,
  setOutline,
  setAutoSaveStatus,
  pushVersion,
  resetEditor,
} = editorSlice.actions;

export default editorSlice.reducer;
