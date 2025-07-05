import React from "react";
import ReactDOM from "react-dom/client";
import "./main.css";
import { router } from "./router";
import { RouterProvider } from "react-router";
import { AccountProvider } from "@/features/account/provider/account-provider";
import { TaskProvider } from "@/features/tasks/provider/task-provider";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AccountProvider>
      <TaskProvider>
        <RouterProvider router={router} />
      </TaskProvider>
    </AccountProvider>
  </React.StrictMode>,
);
