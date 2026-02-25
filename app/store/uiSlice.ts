import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type UiState = {
  activeTab: "home" | "overview" | "contest" | "gallery" | "profile";
  isToastOpen: boolean;
  toastMessage?: string;
  pendingPath?: string;
};

const initialState: UiState = {
  activeTab: "home",
  isToastOpen: false,
  toastMessage: undefined,
  pendingPath: undefined,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setActiveTab(state, action: PayloadAction<UiState["activeTab"]>) {
      state.activeTab = action.payload;
    },
    showToast(state, action: PayloadAction<string>) {
      state.isToastOpen = true;
      state.toastMessage = action.payload;
    },
    setPendingPath(state, action: PayloadAction<string | undefined>) {
      state.pendingPath = action.payload;
    },
    hideToast(state) {
      state.isToastOpen = false;
      state.toastMessage = undefined;
    },
  },
});

export const { setActiveTab, showToast, hideToast, setPendingPath } =
  uiSlice.actions;
export default uiSlice.reducer;
