import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, inLivePreview, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error: authError } =
        mode === "sign-up"
          ? await authClient.signUp.email({ name: name || email, email, password })
          : await authClient.signIn.email({ email, password });
      if (authError) {
        setError(authError.message ?? "Something went wrong. Try again.");
        return;
      }
      void navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg p-6">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-6">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-accent-steel uppercase">
            Steel PM
          </p>
          <h1 className="mt-1 text-xl font-semibold text-fg">
            {mode === "sign-up" ? "Create an account" : "Sign in"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            S&amp;H Steel shared workspace — everyone signed in sees the same projects.
          </p>
        </div>

        {authEnabled ? (
          <>
            <form onSubmit={handleSubmit} className="space-y-2.5">
              {mode === "sign-up" && (
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm text-fg placeholder:text-muted focus:border-primary/50 focus:outline-none"
                />
              )}
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm text-fg placeholder:text-muted focus:border-primary/50 focus:outline-none"
              />
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm text-fg placeholder:text-muted focus:border-primary/50 focus:outline-none"
              />
              {error && <p className="text-xs text-status-red">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg hover:bg-primary-dim disabled:opacity-60"
              >
                {busy ? "Please wait…" : mode === "sign-up" ? "Create account" : "Sign in"}
              </button>
            </form>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode((m) => (m === "sign-up" ? "sign-in" : "sign-up"));
              }}
              className="w-full text-center text-xs text-muted hover:text-fg"
            >
              {mode === "sign-up"
                ? "Already have an account? Sign in"
                : "New here? Create an account"}
            </button>

            {/*
             * The broker OAuth buttons (Google / X) only work with the shared
             * preview client, which the broker only accepts callbacks for on
             * `*.grok-sandbox.com` hosts. On any other deployed origin (e.g. this
             * app's real production URL) they always fail with "Invalid redirect
             * URI", so hide them outside the live preview instead of showing a
             * button that's guaranteed to error when clicked.
             */}
            {GROK_PROVIDERS.length > 0 && inLivePreview() && (
              <>
                <div className="flex items-center gap-2 text-[10px] text-muted uppercase">
                  <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-2">
                  {GROK_PROVIDERS.map((p) => (
                    <button
                      key={p.providerId}
                      type="button"
                      onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                      className="w-full rounded-md border border-border bg-surface-2 px-4 py-2.5 text-sm font-medium text-fg hover:border-primary/50 hover:bg-surface-3"
                    >
                      Continue with {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">Sign-in is disabled.</p>
        )}
        <Link to="/" className="block text-center text-sm text-primary hover:underline">
          Back to tracker
        </Link>
      </div>
    </main>
  );
}
