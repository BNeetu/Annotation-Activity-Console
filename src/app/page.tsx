"use client";

import { Header } from "@/components/Header";
import { StatusSummary } from "@/components/StatusSummary";
import { TaskFilterBar } from "@/components/TaskFilterBar";
import { TaskList } from "@/components/TaskList";
import { TaskDetailPanel } from "@/components/TaskDetailPanel";
import { Card } from "@/components/Card";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-7xl space-y-6 p-6 sm:p-8">
        <StatusSummary />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="flex h-[70vh] flex-col overflow-hidden">
            <TaskFilterBar />
            <div className="min-h-0 flex-1">
              <TaskList />
            </div>
          </Card>

          <Card className="h-[70vh] overflow-hidden">
            <TaskDetailPanel />
          </Card>
        </div>
      </main>
    </div>
  );
}