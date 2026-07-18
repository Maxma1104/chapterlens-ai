import type { Metadata } from "next";
import { AnalyzerWorkspace } from "@/components/analyzer/analyzer-workspace";

export const metadata: Metadata = {
  title: "Review desk — ChapterLens",
  description: "Upload a manuscript excerpt for an evidence-grounded editorial review.",
};

export default function AnalyzePage() {
  return <AnalyzerWorkspace />;
}
