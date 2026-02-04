-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('human', 'agent', 'system');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('queued', 'running', 'waiting_tool', 'completed', 'failed', 'canceled');

-- CreateEnum
CREATE TYPE "ToolExecutionTarget" AS ENUM ('server', 'client', 'external');

-- CreateEnum
CREATE TYPE "ToolCallStatus" AS ENUM ('requested', 'dispatched', 'completed', 'failed', 'expired');

-- CreateEnum
CREATE TYPE "ToolResultSource" AS ENUM ('server', 'client');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('active', 'paused', 'completed', 'canceled');

-- CreateTable
CREATE TABLE "entities" (
    "id" UUID NOT NULL,
    "type" "EntityType" NOT NULL,
    "external_id" TEXT,
    "display_name" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "agent_id" UUID,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smart_spaces" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "smart_spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smart_space_memberships" (
    "id" UUID NOT NULL,
    "smart_space_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "role" TEXT,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "smart_space_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smart_space_messages" (
    "id" UUID NOT NULL,
    "smart_space_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT,
    "metadata" JSONB,
    "seq" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "run_id" UUID,

    CONSTRAINT "smart_space_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config_json" JSONB NOT NULL,
    "config_hash" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runs" (
    "id" UUID NOT NULL,
    "smart_space_id" UUID NOT NULL,
    "agent_entity_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "triggered_by_id" UUID,
    "parent_run_id" UUID,
    "status" "RunStatus" NOT NULL,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "run_events" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "seq" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "run_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_calls" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "seq" BIGINT NOT NULL,
    "call_id" TEXT NOT NULL,
    "tool_name" TEXT NOT NULL,
    "args" JSONB NOT NULL,
    "execution_target" "ToolExecutionTarget" NOT NULL,
    "target_client_id" UUID,
    "status" "ToolCallStatus" NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "error_message" TEXT,

    CONSTRAINT "tool_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_results" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "call_id" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "source" "ToolResultSource" NOT NULL,
    "client_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "client_key" TEXT NOT NULL,
    "client_type" TEXT,
    "display_name" TEXT,
    "capabilities" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memories" (
    "id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "topic" TEXT,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "name" TEXT,
    "schedule" TEXT NOT NULL,
    "instruction" TEXT,
    "target_smart_space_id" UUID,
    "status" "PlanStatus" NOT NULL DEFAULT 'active',
    "last_run_at" TIMESTAMPTZ(6),
    "next_run_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_long_term" BOOLEAN NOT NULL DEFAULT false,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entities_external_id_key" ON "entities"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "entities_agent_id_key" ON "entities"("agent_id");

-- CreateIndex
CREATE INDEX "entities_type_idx" ON "entities"("type");

-- CreateIndex
CREATE INDEX "entities_external_id_idx" ON "entities"("external_id");

-- CreateIndex
CREATE INDEX "smart_spaces_created_at_idx" ON "smart_spaces"("created_at");

-- CreateIndex
CREATE INDEX "smart_space_memberships_entity_id_idx" ON "smart_space_memberships"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "smart_space_memberships_smart_space_id_entity_id_key" ON "smart_space_memberships"("smart_space_id", "entity_id");

-- CreateIndex
CREATE INDEX "smart_space_messages_smart_space_id_created_at_idx" ON "smart_space_messages"("smart_space_id", "created_at");

-- CreateIndex
CREATE INDEX "smart_space_messages_entity_id_idx" ON "smart_space_messages"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "smart_space_messages_smart_space_id_seq_key" ON "smart_space_messages"("smart_space_id", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "agents_name_key" ON "agents"("name");

-- CreateIndex
CREATE INDEX "agents_created_at_idx" ON "agents"("created_at");

-- CreateIndex
CREATE INDEX "runs_smart_space_id_created_at_idx" ON "runs"("smart_space_id", "created_at");

-- CreateIndex
CREATE INDEX "runs_agent_entity_id_created_at_idx" ON "runs"("agent_entity_id", "created_at");

-- CreateIndex
CREATE INDEX "runs_status_updated_at_idx" ON "runs"("status", "updated_at");

-- CreateIndex
CREATE INDEX "runs_parent_run_id_idx" ON "runs"("parent_run_id");

-- CreateIndex
CREATE INDEX "run_events_run_id_created_at_idx" ON "run_events"("run_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "run_events_run_id_seq_key" ON "run_events"("run_id", "seq");

-- CreateIndex
CREATE INDEX "tool_calls_run_id_seq_idx" ON "tool_calls"("run_id", "seq");

-- CreateIndex
CREATE INDEX "tool_calls_target_client_id_status_idx" ON "tool_calls"("target_client_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tool_calls_run_id_call_id_key" ON "tool_calls"("run_id", "call_id");

-- CreateIndex
CREATE INDEX "tool_results_run_id_created_at_idx" ON "tool_results"("run_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tool_results_run_id_call_id_key" ON "tool_results"("run_id", "call_id");

-- CreateIndex
CREATE UNIQUE INDEX "clients_client_key_key" ON "clients"("client_key");

-- CreateIndex
CREATE INDEX "clients_entity_id_idx" ON "clients"("entity_id");

-- CreateIndex
CREATE INDEX "clients_client_type_idx" ON "clients"("client_type");

-- CreateIndex
CREATE INDEX "memories_entity_id_topic_idx" ON "memories"("entity_id", "topic");

-- CreateIndex
CREATE INDEX "memories_entity_id_created_at_idx" ON "memories"("entity_id", "created_at");

-- CreateIndex
CREATE INDEX "plans_entity_id_status_idx" ON "plans"("entity_id", "status");

-- CreateIndex
CREATE INDEX "plans_next_run_at_status_idx" ON "plans"("next_run_at", "status");

-- CreateIndex
CREATE INDEX "goals_entity_id_is_completed_idx" ON "goals"("entity_id", "is_completed");

-- CreateIndex
CREATE INDEX "goals_entity_id_priority_idx" ON "goals"("entity_id", "priority");

-- AddForeignKey
ALTER TABLE "entities" ADD CONSTRAINT "entities_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smart_space_memberships" ADD CONSTRAINT "smart_space_memberships_smart_space_id_fkey" FOREIGN KEY ("smart_space_id") REFERENCES "smart_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smart_space_memberships" ADD CONSTRAINT "smart_space_memberships_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smart_space_messages" ADD CONSTRAINT "smart_space_messages_smart_space_id_fkey" FOREIGN KEY ("smart_space_id") REFERENCES "smart_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smart_space_messages" ADD CONSTRAINT "smart_space_messages_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smart_space_messages" ADD CONSTRAINT "smart_space_messages_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_smart_space_id_fkey" FOREIGN KEY ("smart_space_id") REFERENCES "smart_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_agent_entity_id_fkey" FOREIGN KEY ("agent_entity_id") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_parent_run_id_fkey" FOREIGN KEY ("parent_run_id") REFERENCES "runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_events" ADD CONSTRAINT "run_events_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_target_client_id_fkey" FOREIGN KEY ("target_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_results" ADD CONSTRAINT "tool_results_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_results" ADD CONSTRAINT "tool_results_run_id_call_id_fkey" FOREIGN KEY ("run_id", "call_id") REFERENCES "tool_calls"("run_id", "call_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_results" ADD CONSTRAINT "tool_results_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memories" ADD CONSTRAINT "memories_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
