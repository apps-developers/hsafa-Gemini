"use client";

import { HsafaChatProvider, type HsafaChatProviderProps } from "../HsafaProvider";
import { HsafaThread, type HsafaThreadProps } from "./HsafaThread";

export interface HsafaChatProps
  extends Omit<HsafaChatProviderProps, "children">,
    HsafaThreadProps {
  style?: React.CSSProperties;
}

export function HsafaChat({
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
  // Container
  style,
}: HsafaChatProps) {
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
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          ...style,
        }}
      >
        <HsafaThread
          welcomeMessage={welcomeMessage}
          placeholder={placeholder}
          className={className}
        />
      </div>
    </HsafaChatProvider>
  );
}
