import Badge from "./ui/Badge";

export default function KeywordTags({
  matched,
  missing,
}: {
  matched: string[];
  missing: string[];
}) {
  if (matched.length === 0 && missing.length === 0) {
    return <p className="text-sm text-text-muted">No keywords extracted.</p>;
  }

  return (
    <section className="space-y-4">
      {matched.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Matched</p>
          <section className="flex flex-wrap gap-2">
            {matched.map((kw) => (
              <Badge key={kw} variant="success">
                {kw}
              </Badge>
            ))}
          </section>
        </section>
      )}
      {missing.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Missing</p>
          <section className="flex flex-wrap gap-2">
            {missing.map((kw) => (
              <Badge key={kw} variant="danger">
                {kw}
              </Badge>
            ))}
          </section>
        </section>
      )}
    </section>
  );
}
