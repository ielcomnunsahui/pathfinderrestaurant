import { createFileRoute } from "@tanstack/react-router";
import { SignInPage } from "@/components/auth/SignInPage";

export const Route = createFileRoute("/login/")({
  head: () => ({
    meta: [
      { title: "Sign in — P.R.I.S.M" },
      { name: "description", content: "Access your Pathfinder Restaurant P.R.I.S.M workspace." },
    ],
  }),
  component: () => <SignInPage variant="staff" />,
});
