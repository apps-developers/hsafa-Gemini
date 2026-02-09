## Inspiration

The name **Hsafa** comes from the Arabic word **حصافة**, meaning intelligence and wisdom.

We looked at today's "AI agents" and saw a fundamental gap: every framework treats agents as glorified chatbots — one user, one chat, one prompt-response loop, zero persistence, no real autonomy. Close the tab and the agent forgets everything. It can't collaborate with other agents, can't schedule its own work, can't move between contexts.

We asked: **what if AI agents worked like real employees?** They don't forget yesterday. They walk between rooms. They set their own reminders. They coordinate with teammates. They keep working when the boss isn't watching.

That question led to Hsafa — not a chatbot framework, but an **operating system for autonomous AI agents**.

---

## What it does

Hsafa is a runtime for building **persistent, autonomous, collaborative AI agents** that operate like digital workers. It comes with 3 published SDKs (`@hsafa/node` · `@hsafa/react-sdk` · `@hsafa/ui`) so any app can integrate in minutes.

- **SmartSpaces** — Shared workspaces where humans and agents collaborate in persistent timelines with permanent memory.
- **Cross-Space Mobility** — Agents move between spaces carrying full context, like a person walking between rooms.
- **Multi-Agent Networks** — Specialized agents (researcher, planner, executor) coordinate in shared spaces, forming teams and workflows.
- **Autonomous Scheduling** — Agents create their own cron-style plans, deciding when to wake up and what to do — running indefinitely.
- **Persistent Goals & Memory** — Goals, memory, and progress persist across sessions for weeks or months of continuous operation.
- **Prebuilt Tool System** — Internal server-side capabilities (goal management, memory, scheduling, space navigation) with admin-only visibility for sensitive data.
- **Reasoning Transparency** — Optional collapsible "Thinking…" blocks showing the agent's chain-of-thought reasoning in real time.
- **Full SDK Ecosystem** — Node.js (`@hsafa/node`), React (`@hsafa/react`), and drop-in UI (`@hsafa/ui`) SDKs. Any client can connect.

**Example:** A human tells an agent to notify their manager about a leave request. The agent moves to the Manager's space, speaks naturally (remembering the full origin conversation), gets approval, then returns to deliver the decision — all autonomously.

---

## Hsafa SDKs — Integrate in Minutes, Works Everywhere

Hsafa ships **4 SDKs** (3 published on npm, 1 coming soon) designed to make integration dead simple regardless of your stack:

| SDK | Package | Status | What it does |
|-----|---------|--------|--------------|
| **Node.js SDK** | `@hsafa/node` | Published | Full admin + service SDK. Create agents, manage spaces, send messages, subscribe to streams. For backends, services, robots, CLI tools. |
| **React SDK** | `@hsafa/react-sdk` | Published | React hooks and providers. `useSmartSpace()`, `useMessages()`, `useRun()`, `useHsafaRuntime()` — plug into any React app with one provider. |
| **UI SDK** | `@hsafa/ui` | Published | Drop-in prebuilt chat components (thread, composer, modal). One line to get a full agent chat UI with streaming, reasoning, and tool calls. |
| **Python SDK** | `hsafa` | Coming Soon | Same capabilities as Node.js — sync and async. For data pipelines, ML services, and automation. |

**Why this matters:**
- **Any client can connect** — web, mobile, Node.js backend, IoT device, Python script
- **Minimal code** — Go from zero to a working multi-agent chat in ~20 lines with `@hsafa/ui`
- **Layered complexity** — Use `@hsafa/ui` for instant UI, `@hsafa/react-sdk` for custom hooks, or `@hsafa/node` for full programmatic control
- **System-wide auth** — One secret key for backends, one public key + JWT for browsers. No per-space key management.

---

## How we built it

- **Hsafa Gateway** — TypeScript/Node.js runtime with Prisma, PostgreSQL, and Redis. Handles agent execution via Vercel AI SDK v6's `ToolLoopAgent`, SSE streaming, tool orchestration, and message persistence.
- **Agent Builder** — Configuration-driven: agents defined via JSON configs (model, tools, instructions). Builder resolves tools, MCP clients, and prebuilt tools automatically.
- **Prebuilt Tool Registry** — Server-side tools (setGoals, setMemory, createPlan, goToSpace) with direct DB access, auto-injected into every agent run.
- **SSE Streaming Pipeline** — AI model → gateway → Redis → SSE → client SDKs. Real-time text, reasoning, tool calls with partial JSON parsing.
- **Auth Model** — Secret key (`sk_...`) for backends, public key (`pk_...`) + JWT for browsers. Anti-impersonation enforcement.
- **Three SDKs** — `@hsafa/node` (class-based), `@hsafa/react` (hooks + context), `@hsafa/ui` (prebuilt chat components via `@assistant-ui/react`).

**Tech:** TypeScript, Node.js, PostgreSQL, Prisma, Redis, Vercel AI SDK v6, OpenAI GPT-5 / Gemini 2.5 Flash, React, Next.js, SSE.

---

## Challenges we ran into

- **AI SDK v6 breaking changes** — Silent event type and property renames (`tool-input-start` not `tool-call-streaming-start`, `.input` not `.args`) caused tool calls to fail silently.
- **Cross-space agent tone** — Three design iterations to make agents speak naturally in other spaces instead of sounding like notification bots. The breakthrough: packing all context into the system prompt with a minimal "Go ahead." user message.
- **Streaming state reconstruction** — Rebuilding UI state on page refresh required replaying `text-delta`, `reasoning-delta`, and `tool-input-delta` events in order.
- **Circular imports** — Prebuilt tool registry side-effect imports caused initialization errors. Solved with lazy dynamic `import()`.

---

## Accomplishments that we're proud of

- **Agents that move between contexts** — goToSpace works end-to-end: an agent navigates spaces, speaks naturally with full memory, and returns. No existing framework does this.
- **Full prebuilt tool system** — Agents autonomously set goals, manage memory, create plans, and navigate spaces with proper access control.
- **Three production-ready SDKs** — Published to npm. A developer can build a multi-agent chat UI in under 50 lines of code.
- **A real architectural vision** — Not an LLM wrapper. A complete runtime with persistent state, multi-entity collaboration, distributed tools, and a security model.

---

## What we learned

- **Agents need an OS, not a framework.** Persistent state, scheduling, cross-context mobility, and security don't come from wrapping an API.
- **Prompt engineering is system design.** The difference between a robotic notification and natural conversation is entirely in system prompt structure and context injection.
- **Streaming is the hard part.** The AI call is 10% of the work. Reliable SSE, state reconstruction, partial JSON parsing, and race conditions are the other 90%.

---

## What's next for Hsafa

- **Python SDK** — Full parity with Node.js SDK for data pipelines and ML services.
- **Knowledge Base (RAG)** — `searchKnowledge` prebuilt tool for vector database queries during reasoning.
- **Client-side interactive tools** — Agent pauses, shows custom UI (approval buttons, forms), user responds, agent continues.
- **Agent-to-agent private channels** — Agents creating private SmartSpaces between themselves to coordinate without human involvement.
- **Admin dashboard** — Visual monitoring of agent runs, goals, plans, memory, and cross-space activity.
