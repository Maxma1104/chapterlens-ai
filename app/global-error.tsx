"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return <html><body><main className="fatal-error"><span>CHAPTERLENS</span><h1>The review desk lost its place.</h1><p>Your manuscript was not changed. Retry the last action, or return to a fresh analysis.</p><button onClick={reset}>Try again</button></main></body></html>;
}
