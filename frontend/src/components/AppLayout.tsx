import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutGrid, Rocket, Settings, LogOut, Menu, X } from "lucide-react";
import { SocketProvider } from "@/context/SocketContext";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Repos", icon: LayoutGrid },
  { to: "/deployments", label: "Deployments", icon: Rocket },
  { to: "/settings", label: "Settings", icon: Settings },
];

function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center bg-signal font-mono text-[10px] font-bold text-hull-deep">
        SY
      </span>
      <span className="font-display text-lg font-semibold tracking-wide text-manifest">SHIPYARD</span>
    </div>
  );
}

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  async function handleSignOut() {
    if (refreshToken) {
      await api.auth.logout(refreshToken).catch(() => {});
    }
    logout();
    navigate("/", { replace: true });
  }

  return (
    <SocketProvider>
      <div className="min-h-screen bg-hull md:grid md:grid-cols-[15rem_1fr]">
        <aside className="hidden border-r border-line bg-hull-deep md:flex md:flex-col">
          <div className="border-b border-line p-5">
            <Wordmark />
          </div>
          <nav className="flex flex-1 flex-col gap-1 p-3">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-[3px] px-3 py-2 text-sm text-manifest-dim transition-colors hover:bg-deckplate hover:text-manifest",
                    isActive && "bg-deckplate text-manifest",
                  )
                }
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-line p-3">
            <div className="flex items-center gap-2.5 px-2 py-1.5">
              {user?.avatarUrl && (
                <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-[3px]" referrerPolicy="no-referrer" />
              )}
              <span className="truncate font-mono text-xs text-manifest-dim">{user?.githubUsername}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="mt-1 flex w-full items-center gap-2.5 rounded-[3px] px-2 py-1.5 text-sm text-manifest-dim transition-colors hover:bg-deckplate hover:text-hazard"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex items-center justify-between border-b border-line bg-hull-deep p-4 md:hidden">
          <Wordmark />
          <button
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileNavOpen}
            className="rounded-[3px] p-2 text-manifest hover:bg-deckplate"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileNavOpen && (
          <div className="border-b border-line bg-hull-deep p-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-[3px] px-3 py-2 text-sm text-manifest-dim",
                      isActive && "bg-deckplate text-manifest",
                    )
                  }
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                  {label}
                </NavLink>
              ))}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2.5 rounded-[3px] px-3 py-2 text-left text-sm text-manifest-dim hover:text-hazard"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
                Sign out
              </button>
            </nav>
          </div>
        )}

        <main className="min-w-0 p-5 md:p-8">
          <Outlet />
        </main>
      </div>
    </SocketProvider>
  );
}
