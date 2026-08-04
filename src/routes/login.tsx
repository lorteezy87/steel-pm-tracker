import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-[calc(100dvh-var(--grok-banner-h,0px))] place-items-center bg-bg p-6">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-6">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-accent-steel uppercase">
            Steel PM
          </p>
          <h1 className="mt-1 text-xl font-semibold text-fg">Sign in</h1>
          <p className="mt-1 text-sm text-muted">
            Optional — the tracker works without an account.
          </p>
        </div>
        {authEnabled ? (
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
