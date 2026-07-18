import Link from "next/link";

export default function NotFound() {
  return <main className="fatal-error"><span>404 / MISSING PAGE</span><h1>This chapter is not in the manuscript.</h1><p>The page may have moved, or the link may be incomplete.</p><Link href="/">Return to ChapterLens</Link></main>;
}
