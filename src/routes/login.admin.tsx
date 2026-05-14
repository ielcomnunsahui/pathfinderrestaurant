import { createFileRoute } from "@tanstack/react-router";
import { SignInPage } from "@/components/auth/SignInPage";

export const Route = createFileRoute("/login/admin")({
  head: () => ({ meta: [{ title: "Admin sign in — P.R.I.S.M" }] }),
  component: () => <SignInPage variant="admin" />,
});
