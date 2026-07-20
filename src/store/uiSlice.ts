import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { SortDirection, SortKey, TaskFilters, TaskType } from "@/lib/types";
import type { TaskStatus } from "@/lib/types";

const DEFAULT_FILTERS: TaskFilters = { type: "all", status: "all", search: "" };

export interface UiState {
  filters: TaskFilters;
  sort: { key: SortKey; direction: SortDirection };
  selectedTaskId: string | null;
}

const initialState: UiState = {
  filters: { ...DEFAULT_FILTERS },
  sort: { key: "updatedAt", direction: "desc" },
  selectedTaskId: null,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    typeFilterChanged(state, action: PayloadAction<TaskType | "all">) {
      state.filters.type = action.payload;
    },
    statusFilterChanged(state, action: PayloadAction<TaskStatus | "all">) {
      state.filters.status = action.payload;
    },
    searchChanged(state, action: PayloadAction<string>) {
      state.filters.search = action.payload;
    },
    /** Resets type/status/search back to "show everything", but deliberately
     * leaves sort order and the current selection alone -- clearing filters
     * shouldn't also lose your place in the list or your open task. */
    filtersReset(state) {
      state.filters = { ...DEFAULT_FILTERS };
    },
    sortChanged(state, action: PayloadAction<{ key: SortKey }>) {
      if (state.sort.key === action.payload.key) {
        state.sort.direction = state.sort.direction === "asc" ? "desc" : "asc";
      } else {
        state.sort.key = action.payload.key;
        state.sort.direction = "desc";
      }
    },
    taskSelected(state, action: PayloadAction<string | null>) {
      state.selectedTaskId = action.payload;
    },
  },
});

export const { typeFilterChanged, statusFilterChanged, searchChanged, filtersReset, sortChanged, taskSelected } =
  uiSlice.actions;
export const uiReducer = uiSlice.reducer;
