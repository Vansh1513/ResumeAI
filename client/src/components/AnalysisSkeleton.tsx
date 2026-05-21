import Card from "./ui/Card";

function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-overlay ${className ?? ""}`} />;
}

export default function AnalysisSkeleton() {
  return (
    <Card className="space-y-6">
      <section className="flex flex-col items-center gap-4">
        <Bone className="h-24 w-24 rounded-full" />
        <Bone className="h-4 w-40" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Bone className="h-28" />
        <Bone className="h-28" />
      </section>

      <section className="space-y-2">
        <Bone className="h-4 w-32" />
        <Bone className="h-16 w-full" />
        <Bone className="h-16 w-full" />
      </section>

      <section className="space-y-2">
        <Bone className="h-4 w-36" />
        <Bone className="h-12 w-full" />
        <Bone className="h-12 w-full" />
        <Bone className="h-12 w-full" />
      </section>

      <p className="text-center text-sm text-text-muted">AI is analyzing your resume…</p>
    </Card>
  );
}
