<div align="center">

# Hsafa  
### The Operating System for Autonomous AI Agents (network of AI agents)

**Hsafa is not a chatbot framework.**  
It is a runtime for long-lived AI operators that can collaborate, migrate between contexts, execute workflows, and run indefinitely via scheduled self-triggers.

**A world-changer:** the foundation for an AI workforce layer that most modern systems will eventually rely on.

*The name **Hsafa** is inspired by the Arabic word **حصافة**, meaning intelligence and wisdom.*

> A new category of system:  
> **from conversational assistants → to autonomous digital workers.**

`@hsafa/node` · `@hsafa/react-sdk` · `@hsafa/ui` — 3 SDKs published on npm. Integrate from any platform in minutes.

</div>

---

## 🚀 Why Hsafa Exists

Most "AI agents" today are basically:
- one user  
- one chat  
- one prompt-response loop  
- zero persistence  
- no real autonomy  

That is not an agent. That is a chatbot with tools.

**Hsafa introduces a new definition:**

> An agent is a persistent participant inside a shared operational system.  
> It can reason, act, coordinate, remember, schedule tasks, and continue working even when nobody is watching.

---

## 🧠 What Makes Hsafa Different

### ⚡ Autonomous by Default
Agents do not wait for humans to type.

They can start work from:
- system events
- schedules
- other agents
- incoming messages
- external services

Hsafa is designed for **continuous operation**.

Agents can even create their own self-triggering schedules (cron-style): they decide *when* to wake up, *what* to check, and *what* to do next — and they keep going indefinitely.

---

### 🏙 SmartSpaces (Shared Timelines)
Instead of isolated chats, Hsafa runs inside **SmartSpaces**:

SmartSpaces are shared environments where:
- humans collaborate with agents
- multiple agents coordinate together
- services and tools produce events
- memory and history live permanently

This is the difference between:
- a chat window  
vs  
- an **operational workspace**

---

### 🧳 Agents Can Move Across Contexts
Hsafa agents are not stuck in one thread.

An agent can:
- enter a new space
- understand the situation instantly
- respond naturally
- execute tasks
- coordinate with agents already inside

This enables **cross-team workflows** and real organizational intelligence.

---

### 🕸 Multi-Agent Networks (Not Single Bots)
Hsafa is built for **agent ecosystems**, not "one assistant".

You can build:
- agent-to-agent workflows
- specialized departments (research, planning, QA, execution)
- long-running mission teams
- full operational systems where humans are optional

---

### 🛠 Action is a First-Class Primitive
In Hsafa, tools are not "plugins".

Tools are the **hands of the agent**.

Agents can:
- call services
- request approvals
- orchestrate workflows
- coordinate external systems
- execute real operations

---

### 🧬 Long-Term Memory & Continuity
Hsafa agents maintain continuity across time.

They can persist:
- goals
- plans
- progress states
- relationships
- long-term task chains
- historical decisions

This allows agents to operate **continuously (weeks, months)**, not minutes.

---

## 🌍 What You Can Build With Hsafa

### 🏢 Autonomous Operations Copilots
Agents that manage projects like a real coordinator:
- follow up tasks
- assign work
- report progress
- keep timelines alive

### 🎧 Customer Support Networks
Multi-agent support systems:
- triage + escalation
- human handoff
- knowledge retrieval
- automatic resolution workflows

### 🔄 Service Orchestrators
Agents that behave like internal teammates:
- talk to APIs
- run deployments
- monitor incidents
- trigger recovery actions

### 🧠 Multi-Agent Departments
Example:
- **Research Agent**
- **Planner Agent**
- **Executor Agent**
- **QA Agent**
- **Delivery Agent**

All cooperating in SmartSpaces.

### 🌐 Cross-Context Assistants
An agent can talk to Team A, then jump to Team B, continue the same workflow, and keep the full story.

---

## 🧩 Core Concepts

| Concept | Meaning |
|--------|---------|
| **Agent** | A persistent AI operator with goals, memory, and actions |
| **SmartSpace** | Shared environment for humans + agents + tools |
| **Events** | Messages, schedules, triggers, service updates |
| **Tools** | The agent’s execution layer (APIs, services, workflows) |
| **Continuity** | Memory + long-running state across sessions |

---

## 🧠 Vision

Hsafa is designed around one goal:

> Build agents that behave like real autonomous workers,  
> not prompt-based assistants.

Hsafa turns agents into a **reusable workforce primitive**: an OS-layer abstraction you plug into your product so work keeps happening automatically.

It is a system where AI agents can form:
- teams  
- organizations  
- networks  
- operational workflows  
- long-running missions  

---

## 📖 Documentation (Vision & Architecture)

If you want the full architecture and product philosophy:

- **Architecture / Big Idea**  
  [`hsafa-docs/idea-docs/hsafa-gateway-doc.mdx`](./hsafa-docs/idea-docs/hsafa-gateway-doc.mdx)

- **Tools as an Interaction Model**  
  [`hsafa-docs/idea-docs/tools-design-doc.md`](./hsafa-docs/idea-docs/tools-design-doc.md)

- **Cross-Space Agents (goToSpace)**  
  [`hsafa-docs/idea-docs/go-to-space-feature.md`](./hsafa-docs/idea-docs/go-to-space-feature.md)

- **Reasoning UX (Optional Transparency)**  
  [`hsafa-docs/idea-docs/reasoning-design-doc.md`](./hsafa-docs/idea-docs/reasoning-design-doc.md)

- **SDK Direction**  
  [`hsafa-docs/idea-docs/sdk-design-doc.md`](./hsafa-docs/idea-docs/sdk-design-doc.md)

---

## � Hsafa SDKs — Integrate in Minutes, Works Everywhere

Hsafa ships **4 SDKs** (3 published on npm, 1 coming soon) so you can integrate from any platform:

| SDK | Package | Status | Use Case |
|-----|---------|--------|----------|
| **Node.js SDK** | [`@hsafa/node`](https://www.npmjs.com/package/@hsafa/node) | ✅ Published | Backends, services, robots, CLI — full admin + streaming |
| **React SDK** | [`@hsafa/react-sdk`](https://www.npmjs.com/package/@hsafa/react-sdk) | ✅ Published | React hooks & providers — plug into any React app |
| **UI SDK** | [`@hsafa/ui`](https://www.npmjs.com/package/@hsafa/ui) | ✅ Published | Drop-in chat UI with streaming, reasoning & tool calls |
| **Python SDK** | `hsafa` | 🔜 Coming Soon | Data pipelines, ML services, automation — sync & async |

### Why this matters

- **Any client can connect** — web, mobile, Node.js, IoT, Python
- **Minimal code** — Full multi-agent chat UI in ~20 lines with `@hsafa/ui`
- **Layered complexity** — `@hsafa/ui` for instant UI → `@hsafa/react-sdk` for custom hooks → `@hsafa/node` for full control
- **One auth model** — System-wide secret key for backends, public key + JWT for browsers. No per-space key management.

---

## 🗂 Repository Structure

```txt
hsafa-gateway/   # Core gateway runtime (agent execution + orchestration)
node-sdk/        # @hsafa/node — Backend + services SDK
react-sdk/       # @hsafa/react-sdk — React hooks + providers
ui-sdk/          # @hsafa/ui — Drop-in chat UI components
hsafa-docs/      # Vision, architecture, design docs
```

---

## License

[AGPL-3.0](./LICENSE)
