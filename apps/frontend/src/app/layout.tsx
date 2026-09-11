import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DemoSessionProvider } from "@/features/session/demo-session-provider";

import "../styles/globals.css";

export const metadata: Metadata = {
  title: "ScreenPilot · Adaptive AI screening",
  description:
    "A private, role-neutral AI screening demo with human hiring decisions.",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <DemoSessionProvider>{children}</DemoSessionProvider>
      </body>
    </html>
  );
}
