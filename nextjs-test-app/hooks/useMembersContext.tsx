"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Entity } from "@hsafa/react-sdk";

interface MembersContextValue {
  membersById: Record<string, Entity>;
  currentEntityId: string;
}

const MembersContext = createContext<MembersContextValue>({
  membersById: {},
  currentEntityId: "",
});

export function MembersProvider({
  children,
  membersById,
  currentEntityId,
}: {
  children: ReactNode;
  membersById: Record<string, Entity>;
  currentEntityId: string;
}) {
  return (
    <MembersContext.Provider value={{ membersById, currentEntityId }}>
      {children}
    </MembersContext.Provider>
  );
}

export function useMembers() {
  return useContext(MembersContext);
}
