import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { makeStore } from "@/store/store";
import { fetchTasks } from "@/store/tasksSlice";
import { TaskFilterBar } from "../TaskFilterBar";
import { TaskList } from "../TaskList";
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
];

function renderWithStore() {
  const store = makeStore();
  store.dispatch({
    type: fetchTasks.fulfilled.type,
    payload: { tasks: SAMPLE_TASKS, page: 1, pageSize: 20, total: 2 },
  });
  return render(
    <Provider store={store}>
      <TaskFilterBar />
      <TaskList />
    </Provider>
  );
}

describe("<TaskList /> filtering", () => {
  it("shows all tasks with no filter applied", () => {
    renderWithStore();
    expect(screen.getByText("Label cats")).toBeInTheDocument();
    expect(screen.getByText("Transcribe call")).toBeInTheDocument();
  });

  it("hides non-matching rows when a type filter is applied", async () => {
    const user = userEvent.setup();
    renderWithStore();

    await user.selectOptions(screen.getByLabelText("Type"), "audio");

    expect(screen.queryByText("Label cats")).not.toBeInTheDocument();
    expect(screen.getByText("Transcribe call")).toBeInTheDocument();
  });

  it("filters by search text across title", async () => {
    const user = userEvent.setup();
    renderWithStore();

    await user.type(screen.getByLabelText("Search tasks"), "cats");

    expect(screen.getByText("Label cats")).toBeInTheDocument();
    expect(screen.queryByText("Transcribe call")).not.toBeInTheDocument();
  });

  it("Reset clears an active filter and restores all rows", async () => {
    const user = userEvent.setup();
    renderWithStore();

    const resetButton = screen.getByRole("button", { name: /reset/i });
    expect(resetButton).toBeDisabled();

    await user.selectOptions(screen.getByLabelText("Type"), "audio");
    expect(screen.queryByText("Label cats")).not.toBeInTheDocument();
    expect(resetButton).toBeEnabled();

    await user.click(resetButton);
    expect(screen.getByText("Label cats")).toBeInTheDocument();
    expect(screen.getByText("Transcribe call")).toBeInTheDocument();
    expect(resetButton).toBeDisabled();
  });
});
