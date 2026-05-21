import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <section className="flex min-h-screen items-center justify-center bg-surface p-4">
      <section className="w-full max-w-md">
        <section className="mb-8 text-center">
          <span className="text-3xl text-accent">◆</span>
          <h1 className="mt-2 text-2xl font-bold text-text">ResumeAI</h1>
          <p className="text-sm text-text-muted">ATS scoring & job matching</p>
        </section>
        <Outlet />
      </section>
    </section>
  );
}
