import Link from "next/link";
import { Brand } from "./brand";

export function SiteHeader() {
  return (
    <header className="site-header page-shell">
      <Brand />
      <nav aria-label="Main navigation">
        <Link href="/#method">Method</Link>
        <Link href="/analyze">Review desk</Link>
        <Link href="/history">History</Link>
        <a
          href="https://github.com/Maxma1104/chapterlens-ai"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </nav>
      <Link className="header-login" href="/login">Sign in <span>↗</span></Link>
    </header>
  );
}
