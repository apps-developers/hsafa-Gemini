-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('queued', 'running', 'waiting_tool', 'completed', 'failed', 'canceled');

-- CreateEnum
CREATE TYPE "ToolExecutionTarget" AS ENUM ('server', 'device', 'browser', 'external');

-- CreateEnum
CREATE TYPE "ToolCallStatus" AS ENUM ('requested', 'dispatched', 'completed', 'failed', 'expired');

-- CreateEnum
CREATE TYPE "ToolResultSource" AS ENUM ('server', 'device', 'browser');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_versions" (
    "id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "config_json" JSONB NOT NULL,
    "config_hash" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "agent_id" UUID NOT NULL,
    "agent_version_id" UUID NOT NULL,
    "status" "RunStatus" NOT NULL,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "error_message" TEXT,
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
    "target_device_id" UUID,
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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "device_key" TEXT NOT NULL,
    "display_name" TEXT,
    "capabilities" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6),

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_sessions" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "connected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnected_at" TIMESTAMPTZ(6),
    "connection_meta" JSONB NOT NULL DEFAULT '{}'::jsonb,

    CONSTRAINT "device_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_name_key" ON "tenants"("name");

-- CreateIndex
CREATE INDEX "agents_tenant_id_created_at_idx" ON "agents"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "agents_tenant_id_name_key" ON "agents"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "agent_versions_agent_id_created_at_idx" ON "agent_versions"("agent_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "agent_versions_agent_id_version_key" ON "agent_versions"("agent_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "agent_versions_agent_id_config_hash_key" ON "agent_versions"("agent_id", "config_hash");

-- CreateIndex
CREATE INDEX "runs_tenant_id_created_at_idx" ON "runs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "runs_status_updated_at_idx" ON "runs"("status", "updated_at");

-- CreateIndex
CREATE INDEX "runs_agent_id_created_at_idx" ON "runs"("agent_id", "created_at");

-- CreateIndex
CREATE INDEX "run_events_run_id_created_at_idx" ON "run_events"("run_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "run_events_run_id_seq_key" ON "run_events"("run_id", "seq");

-- CreateIndex
CREATE INDEX "tool_calls_run_id_seq_idx" ON "tool_calls"("run_id", "seq");

-- CreateIndex
CREATE INDEX "tool_calls_target_device_id_status_idx" ON "tool_calls"("target_device_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tool_calls_run_id_call_id_key" ON "tool_calls"("run_id", "call_id");

-- CreateIndex
CREATE INDEX "tool_results_run_id_created_at_idx" ON "tool_results"("run_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tool_results_run_id_call_id_key" ON "tool_results"("run_id", "call_id");

-- CreateIndex
CREATE INDEX "devices_tenant_id_created_at_idx" ON "devices"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "devices_tenant_id_device_key_key" ON "devices"("tenant_id", "device_key");

-- CreateIndex
CREATE INDEX "device_sessions_device_id_connected_at_idx" ON "device_sessions"("device_id", "connected_at");

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_versions" ADD CONSTRAINT "agent_versions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_agent_version_id_fkey" FOREIGN KEY ("agent_version_id") REFERENCES "agent_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_events" ADD CONSTRAINT "run_events_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_target_device_id_fkey" FOREIGN KEY ("target_device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_results" ADD CONSTRAINT "tool_results_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_results" ADD CONSTRAINT "tool_results_run_id_call_id_fkey" FOREIGN KEY ("run_id", "call_id") REFERENCES "tool_calls"("run_id", "call_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
