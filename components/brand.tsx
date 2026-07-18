import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="ChapterLens home">
      <span className="brand-lens"><i /></span>
      {!compact && <span>Chapter<strong>Lens</strong></span>}
    </Link>
  );
}
