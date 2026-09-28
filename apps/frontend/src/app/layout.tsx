import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DemoSessionProvider } from "@/features/session/demo-session-provider";

import "../styles/globals.css";

const SCREENPILOT_CANONICAL_URL = "https://tryscreenpilot.com";
const SCREENPILOT_TITLE = "ScreenPilot · Automate the first interview";
const SCREENPILOT_DESCRIPTION =
  "A privacy-minded AI voice screening demo that turns candidate answers into evidence-linked notes for human review.";

export const metadata: Metadata = {
  applicationName: "ScreenPilot",
  metadataBase: new URL(SCREENPILOT_CANONICAL_URL),
  title: SCREENPILOT_TITLE,
  description: SCREENPILOT_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "ScreenPilot",
    title: SCREENPILOT_TITLE,
    description: SCREENPILOT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SCREENPILOT_TITLE,
    description: SCREENPILOT_DESCRIPTION,
  },
};

// Per-request rendering lets Next apply the nonce supplied by src/proxy.ts to
// its framework scripts and styles instead of permitting unsafe inline code.
export const dynamic = "force-dynamic";

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html data-scroll-behavior="smooth" lang="en">
      <body>
        <DemoSessionProvider>{children}</DemoSessionProvider>
      </body>
    </html>
  );
}
