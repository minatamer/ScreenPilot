"use client";

import { useContext } from "react";

import { DemoSessionContext } from "./demo-session-provider";

export function useDemoSession() {
  const context = useContext(DemoSessionContext);
  if (!context) {
    throw new Error("useDemoSession must be used within DemoSessionProvider.");
  }
  return context;
}
