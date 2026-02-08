// =============================================================================
// Client Options
// =============================================================================

export interface HsafaClientOptions {
  gatewayUrl: string;
  secretKey?: string;
  publicKey?: string;
  jwt?: string;
}

// =============================================================================
// Core Resources
// =============================================================================

export interface Agent {
  id: string;
  name: string;
  description?: string | null;
  configJson: Record<string, unknown>;
  configHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface Entity {
  id: string;
  type: 'human' | 'agent' | 'system';
  externalId?: string | null;
  displayName?: string | null;
  agentId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface SmartSpace {
  id: string;
  name?: string | null;
  description?: string | null;
  isPrivate: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface SmartSpaceMessage {
  id: string;
  smartSpaceId: string;
  entityId?: string | null;
  seq: string;
  role: string;
  content?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  entityType?: string;
  entityName?: string | null;
}

export interface Membership {
  id: string;
  smartSpaceId: string;
  entityId: string;
  role?: string | null;
  joinedAt: string;
  entity?: Entity;
}

export interface Run {
  id: string;
  smartSpaceId: string;
  agentEntityId: string;
  agentId: string;
  triggeredById?: string | null;
  parentRunId?: string | null;
  status: RunStatus;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  completedAt?: string | null;
  errorMessage?: string | null;
}

export type RunStatus =
  | 'queued'
  | 'running'
  | 'waiting_tool'
  | 'completed'
  | 'failed'
  | 'canceled';

export interface RunEvent {
  id: string;
  runId: string;
  seq: number;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface Client {
  id: string;
  entityId: string;
  clientKey: string;
  clientType?: string | null;
  displayName?: string | null;
  capabilities?: Record<string, unknown>;
  lastSeenAt: string;
  createdAt: string;
}

// =============================================================================
// Stream Events
// =============================================================================

export interface StreamEvent {
  id: string;
  type: EventType;
  ts: string;
  data: Record<string, unknown>;
  smartSpaceId?: string;
  runId?: string;
  entityId?: string;
  entityType?: string;
  agentEntityId?: string;
  seq?: number;
}

export type EventType =
  | 'smartSpace.message'
  | 'smartSpace.member.joined'
  | 'smartSpace.member.left'
  | 'run.created'
  | 'run.started'
  | 'run.waiting_tool'
  | 'run.completed'
  | 'run.failed'
  | 'run.canceled'
  | 'text.delta'
  | 'reasoning.delta'
  | 'step.start'
  | 'step.finish'
  | 'tool-input-start'
  | 'tool-input-delta'
  | 'tool-input-available'
  | 'tool-output-available'
  | 'message.user'
  | 'message.assistant'
  | 'message.tool'
  | (string & {});

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface CreateAgentParams {
  name?: string;
  config: Record<string, unknown>;
}

export interface CreateEntityParams {
  type: 'human' | 'system';
  externalId?: string;
  displayName?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateAgentEntityParams {
  agentId: string;
  externalId?: string;
  displayName?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateEntityParams {
  displayName?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateSmartSpaceParams {
  name?: string;
  description?: string;
  visibility?: 'public' | 'private';
  isPrivate?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateSmartSpaceParams {
  name?: string;
  description?: string;
  visibility?: 'public' | 'private';
  isPrivate?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AddMemberParams {
  entityId: string;
  role?: string;
}

export interface UpdateMemberParams {
  role: string;
}

export interface SendMessageParams {
  content: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  role?: string;
  triggerAgents?: boolean;
}

export interface ListMessagesParams {
  afterSeq?: string;
  beforeSeq?: string;
  limit?: number;
}

export interface CreateRunParams {
  smartSpaceId: string;
  agentEntityId: string;
  agentId?: string;
  triggeredById?: string;
  parentRunId?: string;
  metadata?: Record<string, unknown>;
  start?: boolean;
}

export interface SubmitToolResultParams {
  runId: string;
  toolCallId: string;
  result: unknown;
  source?: 'client' | 'server';
}

export interface SubmitRunToolResultParams {
  callId: string;
  result: unknown;
  source?: 'client' | 'server';
  clientId?: string;
}

export interface RegisterClientParams {
  entityId: string;
  clientKey: string;
  clientType?: string;
  displayName?: string;
  capabilities?: Record<string, unknown>;
}

export interface ListParams {
  limit?: number;
  offset?: number;
}

export interface ListRunsParams extends ListParams {
  smartSpaceId?: string;
  agentEntityId?: string;
  agentId?: string;
  status?: RunStatus;
}

export interface ListEntitiesParams extends ListParams {
  type?: 'human' | 'agent' | 'system';
}

export interface SubscribeOptions {
  afterSeq?: number;
  since?: string;
}

// =============================================================================
// SSE Stream Types
// =============================================================================

export type StreamEventHandler = (event: StreamEvent) => void;

export interface HsafaStream {
  on(event: string, handler: StreamEventHandler): void;
  off(event: string, handler: StreamEventHandler): void;
  close(): void;
}
