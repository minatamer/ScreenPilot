import type { ReactNode } from "react";

import { Badge } from "./badge";

type EntryModeBadgeProps = Readonly<{
  children: ReactNode;
}>;

export function EntryModeBadge({ children }: EntryModeBadgeProps) {
  return <Badge tone="coral">{children}</Badge>;
}
