"use client";

import { forwardRef } from "react";
import { AssistantModalPrimitive } from "@assistant-ui/react";
import { HsafaChatProvider, type HsafaChatProviderProps } from "../HsafaProvider";
import { HsafaThread, type HsafaThreadProps } from "./HsafaThread";

export interface HsafaModalProps
  extends Omit<HsafaChatProviderProps, "children">,
    HsafaThreadProps {
  defaultOpen?: boolean;
  width?: string;
  height?: string;
}

export function HsafaModal({
  // Provider props
  gatewayUrl,
  entityId,
  smartSpaceId,
  smartSpaces,
  onSwitchThread,
  onNewThread,
  secretKey,
  publicKey,
  jwt,
  // Thread props
  welcomeMessage,
  placeholder,
  className,
  // Modal props
  defaultOpen,
  width = "400px",
  height = "500px",
}: HsafaModalProps) {
  return (
    <HsafaChatProvider
      gatewayUrl={gatewayUrl}
      entityId={entityId}
      smartSpaceId={smartSpaceId}
      smartSpaces={smartSpaces}
      onSwitchThread={onSwitchThread}
      onNewThread={onNewThread}
      secretKey={secretKey}
      publicKey={publicKey}
      jwt={jwt}
    >
      <AssistantModalPrimitive.Root defaultOpen={defaultOpen}>
        <AssistantModalPrimitive.Anchor
          style={{
            position: "fixed",
            right: "1rem",
            bottom: "1rem",
            width: "2.75rem",
            height: "2.75rem",
          }}
        >
          <AssistantModalPrimitive.Trigger asChild>
            <ModalTriggerButton />
          </AssistantModalPrimitive.Trigger>
        </AssistantModalPrimitive.Anchor>

        <AssistantModalPrimitive.Content
          sideOffset={16}
          style={{
            width,
            height,
            borderRadius: "0.75rem",
            border: "1px solid #e0e0e0",
            background: "#fff",
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
            overflow: "hidden",
            zIndex: 50,
          }}
        >
          <HsafaThread
            welcomeMessage={welcomeMessage}
            placeholder={placeholder}
            className={className}
          />
        </AssistantModalPrimitive.Content>
      </AssistantModalPrimitive.Root>
    </HsafaChatProvider>
  );
}

type ModalTriggerButtonProps = { "data-state"?: "open" | "closed" };

const ModalTriggerButton = forwardRef<HTMLButtonElement, ModalTriggerButtonProps>(
  function ModalTriggerButton({ "data-state": state, ...rest }, ref) {
    return (
      <button
        ref={ref}
        {...rest}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          border: "none",
          background: "#0f0f0f",
          color: "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          fontSize: "1.25rem",
          transition: "transform 150ms ease",
        }}
        aria-label={state === "open" ? "Close chat" : "Open chat"}
      >
        {state === "open" ? "✕" : "💬"}
      </button>
    );
  }
);
