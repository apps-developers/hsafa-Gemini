"use client";

import { type ReactNode } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  HsafaProvider as HsafaSdkProvider,
  type SmartSpace,
} from "@hsafa/react-sdk";
import { useHsafaChatRuntime } from "./useHsafaRuntime";
import { MembersProvider } from "./contexts";

export interface HsafaChatProviderProps {
  children: ReactNode;
  gatewayUrl: string;
  entityId: string;
  smartSpaceId: string | null;
  smartSpaces?: SmartSpace[];
  onSwitchThread?: (smartSpaceId: string) => void;
  onNewThread?: () => void;
  secretKey?: string;
  publicKey?: string;
  jwt?: string;
}

function HsafaChatProviderInner({
  children,
  entityId,
  smartSpaceId,
  smartSpaces = [],
  onSwitchThread,
  onNewThread,
}: {
  children: ReactNode;
  entityId: string;
  smartSpaceId: string | null;
  smartSpaces?: SmartSpace[];
  onSwitchThread?: (smartSpaceId: string) => void;
  onNewThread?: () => void;
}) {
  const { runtime, membersById } = useHsafaChatRuntime({
    smartSpaceId,
    entityId,
    smartSpaces,
    onSwitchThread,
    onNewThread,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <MembersProvider membersById={membersById} currentEntityId={entityId}>
        {children}
      </MembersProvider>
    </AssistantRuntimeProvider>
  );
}

export function HsafaChatProvider({
  children,
  gatewayUrl,
  secretKey,
  publicKey,
  jwt,
  ...innerProps
}: HsafaChatProviderProps) {
  return (
    <HsafaSdkProvider
      gatewayUrl={gatewayUrl}
      secretKey={secretKey}
      publicKey={publicKey}
      jwt={jwt}
    >
      <HsafaChatProviderInner {...innerProps}>
        {children}
      </HsafaChatProviderInner>
    </HsafaSdkProvider>
  );
}
