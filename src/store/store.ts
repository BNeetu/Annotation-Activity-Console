import { configureStore } from "@reduxjs/toolkit";
import { tasksReducer } from "./tasksSlice";
import { uiReducer } from "./uiSlice";

export function makeStore() {
  return configureStore({
    reducer: {
      tasks: tasksReducer,
      ui: uiReducer,
    },
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
