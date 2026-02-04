export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface Entity {
  id: string;
  type: 'human' | 'agent' | 'system';
  externalId: string | null;
  displayName: string | null;
  metadata: JsonValue | null;
  agentId: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SmartSpace {
  id: string;
  name: string | null;
  description: string | null;
  isPrivate: boolean;
  metadata: JsonValue | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SmartSpaceMembership {
  id: string;
  smartSpaceId: string;
  entityId: string;
  role: string | null;
  joinedAt?: string;
}

export interface SmartSpaceMessageRecord {
  id: string;
  smartSpaceId: string;
  entityId: string;
  role: string;
  content: string | null;
  metadata: JsonValue | null;
  seq: string; // BigInt serialized
  createdAt: string;
  runId: string | null;
}

export interface HsafaSseEvent<T = any> {
  id: string;
  type: string;
  ts: string;
  data: T;
}

export interface SmartSpaceStreamPayload<TData = any> {
  seq: number;
  smartSpaceId: string;
  runId?: string;
  agentEntityId?: string;
  data: TData;
}

export interface SmartSpaceStreamMessage {
  id: string;
  role: string;
  parts: Array<
    | { type: 'text'; text: string }
    | { type: 'tool-call'; toolCallId: string; toolName: string; args: unknown }
    | { type: 'tool-result'; toolCallId: string; toolName: string; result: unknown }
  >;
}

export interface RunCreatedEvent {
  runId: string;
  agentEntityId: string;
  agentId: string;
  status: string;
}

export interface RunStatusEvent {
  runId: string;
  status: string;
  error?: string;
}

export interface RunStreamPartEvent {
  runId: string;
  type: string;
  textDelta?: string;
  toolCallId?: string;
  toolName?: string;
  args?: unknown;
}
