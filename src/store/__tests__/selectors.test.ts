import { makeStore } from "../store";
import { fetchTasks } from "../tasksSlice";
import { searchChanged, sortChanged, statusFilterChanged, typeFilterChanged } from "../uiSlice";
import { selectFilteredSortedTasks } from "../selectors";
import type { NormalizedTask } from "@/lib/types";

const SAMPLE_TASKS: NormalizedTask[] = [
  {
    id: "t1",
    title: "Label cats",
    type: "image",
    status: "todo",
    assignee: null,
    annotationCount: 1,
    updatedAt: 100,
    meta: {},
    issues: [],
  },
  {
    id: "t2",
    title: "Transcribe call",
    type: "audio",
    status: "in_progress",
    assignee: { id: "u1", name: "Asha" },
    annotationCount: 2,
    updatedAt: 300,
    meta: {},
    issues: [],
  },
  {
    id: "t3",
    title: "Review copy",
    type: "text",
    status: "done",
    assignee: { id: "u2", name: "Ben" },
    annotationCount: 3,
    updatedAt: 200,
    meta: {},
    issues: [],
  },
];

// fetchTasks hits the network; for selector tests we dispatch the
// already-fulfilled action shape directly rather than mocking fetch.
function seedStore() {
  const store = makeStore();
  store.dispatch({
    type: fetchTasks.fulfilled.type,
    payload: { tasks: SAMPLE_TASKS, page: 1, pageSize: 20, total: 3 },
  });
  return store;
}

describe("selectFilteredSortedTasks", () => {
  it("defaults to sorting by updatedAt descending", () => {
    const store = seedStore();
    const ids = selectFilteredSortedTasks(store.getState()).map((t) => t.id);
    expect(ids).toEqual(["t2", "t3", "t1"]);
  });

  it("filters by type", () => {
    const store = seedStore();
    store.dispatch(typeFilterChanged("audio"));
    const result = selectFilteredSortedTasks(store.getState());
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("t2");
  });

  it("filters by status", () => {
    const store = seedStore();
    store.dispatch(statusFilterChanged("done"));
    const result = selectFilteredSortedTasks(store.getState());
    expect(result.map((t) => t.id)).toEqual(["t3"]);
  });

  it("filters by case-insensitive search across title and id", () => {
    const store = seedStore();
    store.dispatch(searchChanged("CATS"));
    expect(selectFilteredSortedTasks(store.getState()).map((t) => t.id)).toEqual(["t1"]);

    store.dispatch(searchChanged("t3"));
    expect(selectFilteredSortedTasks(store.getState()).map((t) => t.id)).toEqual(["t3"]);
  });

  it("sorts by title when requested, and flips direction on repeat", () => {
    const store = seedStore();
    store.dispatch(sortChanged({ key: "title" }));
    expect(selectFilteredSortedTasks(store.getState()).map((t) => t.id)).toEqual(["t2", "t3", "t1"]);

    store.dispatch(sortChanged({ key: "title" }));
    expect(selectFilteredSortedTasks(store.getState()).map((t) => t.id)).toEqual(["t1", "t3", "t2"]);
  });
});
