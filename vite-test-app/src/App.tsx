import { useMemo, useState } from 'react';
import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
} from '@assistant-ui/react';
import { useHsafaClient, useSmartSpaces } from '@hsafa/react-sdk';
import { useHsafaRuntime } from './useHsafaRuntime';

const GATEWAY_URL = 'http://localhost:3001';
const DEMO_USER_ENTITY_ID = 'b04623f4-4c18-43cc-8010-0f18d05b5004';

export default function App() {
  const client = useHsafaClient({ gatewayUrl: GATEWAY_URL });
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);

  const { smartSpaces } = useSmartSpaces(client, { entityId: DEMO_USER_ENTITY_ID });
  const effectiveSmartSpaceId = selectedSpaceId ?? smartSpaces[0]?.id ?? null;

  const { runtime } = useHsafaRuntime({
    client,
    entityId: DEMO_USER_ENTITY_ID,
    smartSpaceId: effectiveSmartSpaceId,
    onSwitchThread: setSelectedSpaceId,
  });

  const sortedSpaces = useMemo(() => {
    const arr = [...smartSpaces];
    arr.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    return arr;
  }, [smartSpaces]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div style={{ display: 'flex', height: '100%', width: '100%' }}>
        {/* Sidebar: SmartSpaces list */}
        <div
          style={{
            width: 260,
            borderRight: '1px solid #ddd',
            padding: 12,
            overflow: 'auto',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8 }}>SmartSpaces</div>
          {sortedSpaces.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSpaceId(s.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 10px',
                marginBottom: 6,
                borderRadius: 8,
                border: '1px solid #ddd',
                background: effectiveSmartSpaceId === s.id ? '#f2f2f2' : '#fff',
                cursor: 'pointer',
              }}
            >
              {s.name ?? s.id}
            </button>
          ))}
        </div>

        {/* Main chat area using assistant-ui primitives */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <ThreadPrimitive.Root
            style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}
          >
            <ThreadPrimitive.Viewport style={{ flex: 1, overflow: 'auto', padding: 12 }}>
              <ThreadPrimitive.Messages
                components={{
                  UserMessage: UserMessageComponent,
                  AssistantMessage: AssistantMessageComponent,
                }}
              />
            </ThreadPrimitive.Viewport>

            <ComposerPrimitive.Root
              style={{
                display: 'flex',
                gap: 8,
                padding: 12,
                borderTop: '1px solid #ddd',
              }}
            >
              <ComposerPrimitive.Input
                placeholder={effectiveSmartSpaceId ? 'Type a message…' : 'Select a space...'}
                disabled={!effectiveSmartSpaceId}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #ccc',
                  outline: 'none',
                }}
              />
              <ComposerPrimitive.Send
                disabled={!effectiveSmartSpaceId}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid #ccc',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                Send
              </ComposerPrimitive.Send>
            </ComposerPrimitive.Root>
          </ThreadPrimitive.Root>
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}

function UserMessageComponent() {
  return (
    <MessagePrimitive.Root style={{ marginBottom: 12, textAlign: 'right' }}>
      <div
        style={{
          display: 'inline-block',
          maxWidth: 700,
          padding: '10px 12px',
          borderRadius: 12,
          background: '#dff7df',
          border: '1px solid #e5e5e5',
          whiteSpace: 'pre-wrap',
        }}
      >
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessageComponent() {
  return (
    <MessagePrimitive.Root style={{ marginBottom: 12, textAlign: 'left' }}>
      <div
        style={{
          display: 'inline-block',
          maxWidth: 700,
          padding: '10px 12px',
          borderRadius: 12,
          background: '#f5f5f5',
          border: '1px solid #e5e5e5',
          whiteSpace: 'pre-wrap',
        }}
      >
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
}
