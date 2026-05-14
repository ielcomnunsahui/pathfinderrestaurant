import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("[ErrorBoundary]", error, info);
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-orange-500" />
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
            Something went wrong
          </h1>
          <p className="mt-2 break-words text-sm text-muted-foreground">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="hero" onClick={() => { this.reset(); window.location.reload(); }}>
              Reload app
            </Button>
            <Button variant="outline" onClick={() => { this.reset(); window.location.href = "/"; }}>
              Go home
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
