import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DemoSessionProvider } from "@/features/session/demo-session-provider";

import "../styles/globals.css";

export const metadata: Metadata = {
  title: "ScreenPilot · Automate first-round screening interviews",
  description:
    "Run consistent AI voice screening interviews and turn candidate answers into clear notes for your hiring team to review.",
};

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
