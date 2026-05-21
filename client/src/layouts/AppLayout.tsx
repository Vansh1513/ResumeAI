import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../utils/constants";
import { cn } from "../utils/cn";
import Button from "../components/ui/Button";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-primary/15 text-primary"
      : "text-text-muted hover:bg-surface-overlay hover:text-text"
  );

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <section className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface-raised p-4">
        <section className="mb-8 flex items-center gap-3 px-2">
          <span className="text-xl text-accent">◆</span>
          <section>
            <p className="font-semibold text-text">ResumeAI</p>
            <p className="text-xs text-text-muted">ATS & Job Match</p>
          </section>
        </section>

        <nav className="flex flex-1 flex-col gap-1">
          <NavLink to={ROUTES.home} end className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to={ROUTES.upload} className={navLinkClass}>
            Upload Resume
          </NavLink>
          <NavLink to={ROUTES.history} className={navLinkClass}>
            Match History
          </NavLink>
        </nav>

        <section className="mt-auto border-t border-border pt-4">
          <p className="truncate px-2 text-sm font-medium text-text">{user?.full_name}</p>
          <p className="truncate px-2 text-xs text-text-muted">{user?.email}</p>
          <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={logout}>
            Sign out
          </Button>
        </section>
      </aside>

      <main className="flex-1 overflow-auto p-6 lg:p-8">
        <Outlet />
      </main>
    </section>
  );
}
