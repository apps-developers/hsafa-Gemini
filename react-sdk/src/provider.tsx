"use client";

import { useMemo, useEffect, useRef, type ReactNode } from 'react';
import { HsafaClient } from './client.js';
import { HsafaContext } from './context.js';

export interface HsafaProviderProps {
  gatewayUrl: string;
  secretKey?: string;
  publicKey?: string;
  jwt?: string;
  children: ReactNode;
}

export function HsafaProvider({
  gatewayUrl,
  secretKey,
  publicKey,
  jwt,
  children,
}: HsafaProviderProps) {
  const clientRef = useRef<HsafaClient | null>(null);

  if (!clientRef.current) {
    clientRef.current = new HsafaClient({
      gatewayUrl,
      secretKey,
      publicKey,
      jwt,
    });
  }

  useEffect(() => {
    clientRef.current?.updateOptions({
      gatewayUrl,
      secretKey,
      publicKey,
      jwt,
    });
  }, [gatewayUrl, secretKey, publicKey, jwt]);

  const value = useMemo(
    () => ({ client: clientRef.current! }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gatewayUrl, secretKey, publicKey, jwt]
  );

  return (
    <HsafaContext.Provider value={value}>
      {children}
    </HsafaContext.Provider>
  );
}
