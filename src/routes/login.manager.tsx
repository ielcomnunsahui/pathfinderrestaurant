import { createFileRoute } from "@tanstack/react-router";
import { SignInPage } from "@/components/auth/SignInPage";

export const Route = createFileRoute("/login/manager")({
  head: () => ({ meta: [{ title: "Manager sign in — P.R.I.S.M" }] }),
  component: () => <SignInPage variant="manager" />,
});
