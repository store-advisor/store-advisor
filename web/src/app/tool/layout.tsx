import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Store Advisor — Data Cleaning Tool",
  description: "Upload and clean your dataset with Basic, Advanced, or Agent pipelines.",
};

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
