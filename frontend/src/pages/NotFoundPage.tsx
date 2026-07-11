import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-hull px-6 text-center">
      <p className="font-mono text-sm text-manifest-faint">404</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-wide text-manifest">Route not found</h1>
      <p className="mt-2 max-w-sm text-sm text-manifest-dim">
        There's nothing built at this path. Check the URL, or head back to your repos.
      </p>
      <Link to="/dashboard" className="mt-6 text-sm text-beacon underline-offset-4 hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
