import { AccountLayout } from "@/features/account/components/account-layout";
import OTPLogin from "@/views/otp-login";
import TodoList from "@/views/todo-list";
import {
    createBrowserRouter,
  } from "react-router";
export const router = createBrowserRouter([{
    element: <AccountLayout />,
    children: [{
    index: true,
    path: "/",
    element: <TodoList />
  },
  {
    path: "login",
    element: <OTPLogin />
  }]}]);