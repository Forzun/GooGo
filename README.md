<div align="center">

![Image Description](./assests/GooCli.svg)

### Goo Cli

</div># GooGo

> A local-first, open-source AI coding assistant for your terminal — powered by Ollama, with file-aware conversations, code editing, and persistent memory you actually own.

GooGo is an experimental AI coding assistant that runs directly in your terminal and works with local language models through Ollama.

The goal is simple: build a coding assistant that can understand your project, read and modify code, remember useful context across conversations, and keep that memory transparent and accessible to you.

Unlike memory systems hidden inside a database, GooGo uses a local Markdown vault as its source of truth. Your memories remain readable, editable, and portable — and can be explored visually using Obsidian.

> **Note:** GooGo is currently under active development. APIs, commands, and features may change.

---

## Features

* 🤖 Chat with local Ollama models directly from your terminal
* ⚡ Built with Bun and TypeScript
* 🌊 Streaming AI responses
* 📂 Reference project files using `@filename`
* 🔎 File search and autocomplete
* 🛠️ AI-powered function editing
* ✏️ Function creation and modification
* 🔄 Function renaming
* 🗑️ Function deletion
* 📊 Code diff previews
* 🧠 Persistent long-term memory
* 🔍 Semantic memory search using embeddings
* 🗃️ SQLite-powered vector index
* 📝 Markdown-based memory vault
* 🔗 Obsidian-compatible memory storage
* 🕸️ Explore memories using Obsidian Graph View
* 🎨 Syntax-highlighted code output
* 💾 Local conversation history
* 🔐 Local-first architecture

---

# How GooGo Works

At a high level:

```text
You
 │
 ▼
GooGo CLI
 │
 ├───────────────► Project Files
 │
 ├───────────────► Coding Tools
 │
 ├───────────────► Memory System
 │
 ▼
Ollama
 │
 ▼
Local LLM
```

GooGo uses the Ollama API to communicate with models running locally on your machine.

Your code stays on your machine unless you explicitly configure GooGo to use an external service in the future.

---

# Requirements

Before installing GooGo, make sure you have:

* Git
* Bun
* Ollama
* At least one Ollama chat/coding model
* An embedding model for memory

Obsidian is optional, but recommended if you want to browse and visualize GooGo's memory vault.

---

# Installation

GooGo is currently installed directly from GitHub.

npm installation will be added later.

## 1. Clone the repository

```bash
git clone https://github.com/Forzun/GooGo.git
```

Enter the project:

```bash
cd GooGo
```

## 2. Install dependencies

GooGo uses Bun.

```bash
bun install
```

## 3. Install Ollama

Install Ollama for your operating system, then make sure the Ollama service is running.

You can verify it with:

```bash
ollama list
```

---

# Download a Chat Model

GooGo lets you use models installed in Ollama.

For example:

```bash
ollama pull qwen2.5-coder:3b
```

You can use another compatible Ollama model if you prefer.

Check your installed models:

```bash
ollama list
```

When GooGo starts, you can select from your locally installed models.

---

# Download the Memory Embedding Model

GooGo's long-term memory system uses a separate embedding model.

The embedding model does **not** generate chat responses.

Instead, it converts memories and questions into numerical vectors so GooGo can perform semantic search and find relevant memories.

Download the embedding model:

```bash
ollama pull nomic-embed-text
```

Make sure it appears in:

```bash
ollama list
```

The architecture looks like this:

```text
User Question
      │
      ▼
nomic-embed-text
      │
      ▼
Query Vector
      │
      ▼
SQLite Vector Search
      │
      ▼
Relevant Memory
      │
      ▼
Markdown Vault
      │
      ▼
Relevant Context
      │
      ▼
Selected Chat Model
      │
      ▼
Response
```

The chat model and embedding model have different jobs:

```text
Chat Model
    │
    └── Thinks, answers questions and works with code

nomic-embed-text
    │
    └── Finds semantically relevant memories
```

---

# Running GooGo

During development, run:

```bash
bun run src/index.ts
```

Depending on your project scripts, you may also be able to use:

```bash
bun run start
```

GooGo will detect your locally installed Ollama models and ask you to select one.

```text
? Select a model

● qwen2.5-coder:3b
● llama3.1:8b
● ...
```

After selecting a model, you can start chatting.

---

# Talking About Your Code

GooGo can read files from your current project.

Use `@` followed by a file path:

```text
@src/index.ts explain this file
```

Or:

```text
@src/utils/filter.ts what does filterCommand do?
```

GooGo can use the referenced file as context when answering your question.

File search and autocomplete help you find files directly from the terminal input.

---

# AI Code Editing

GooGo includes an experimental tool system that allows the model to plan code changes and execute them using controlled tools.

For example:

```text
@src/utils/filter.ts change the sum function to return 500
```

The basic architecture is:

```text
User Request
      │
      ▼
Planner
      │
      ▼
Choose Tool
      │
      ├── Read File
      ├── Modify Function
      ├── Create Function
      ├── Rename Function
      └── Delete Function
      │
      ▼
Execute Change
      │
      ▼
Show Diff
```

Instead of allowing the model unrestricted access to modify arbitrary code, GooGo uses explicit tools to perform controlled operations.

This system is still experimental and under active development.

---

# Long-Term Memory

GooGo includes an experimental persistent memory system.

The goal is to allow GooGo to remember useful information across different conversations.

For example:

```text
I prefer TypeScript over JavaScript.
```

GooGo may extract:

```text
User prefers TypeScript over JavaScript.
```

That information can later be retrieved when it becomes relevant.

---

# Memory Architecture

GooGo follows an important principle:

> Markdown is the source of truth. SQLite is the search index.

Your permanent memory lives inside Markdown files.

SQLite stores embeddings and metadata that help GooGo quickly find the relevant Markdown content.

```text
Conversation
      │
      ▼
Memory Extraction
      │
      ▼
Worth Remembering?
      │
     Yes
      │
      ▼
Markdown Vault
      │
      ▼
Chunking
      │
      ▼
nomic-embed-text
      │
      ▼
SQLite Vector Index
```

When you ask something later:

```text
Question
      │
      ▼
Generate Query Embedding
      │
      ▼
Search SQLite
      │
      ▼
Find Relevant Markdown
      │
      ▼
Read Original Memory
      │
      ▼
Inject Context
      │
      ▼
Ollama
```

This means the SQLite database is disposable.

If the vector database is deleted, the original Markdown memories still exist and can eventually be re-indexed.

---

# Memory Location

By default, GooGo stores its data inside:

```text
~/.goo/
```

The structure looks roughly like:

```text
~/.goo/
│
├── config.json
│
├── vector.db
│
└── vault/
    │
    ├── Daily/
    ├── Memory/
    ├── People/
    ├── Preferences/
    └── Projects/
```

The `vault` directory contains the human-readable Markdown memory.

The `vector.db` file contains the SQLite search index.

---

# Open GooGo Memory in Obsidian

GooGo's memory vault is compatible with Obsidian.

To explore your memory:

1. Open Obsidian.
2. Choose **Open folder as vault**.
3. Select:

```text
~/.goo/vault
```

On Linux, `~` represents your home directory.

For example:

```text
/home/your-username/.goo/vault
```

Once opened, you can browse GooGo's Markdown memory directly inside Obsidian.

---

# View Memory as a Graph

After opening:

```text
~/.goo/vault
```

as an Obsidian vault, open **Graph View**.

As GooGo's memory system grows and notes begin using Obsidian links such as:

```text
[[GooGo]]
[[Ollama]]
[[SQLite]]
[[TypeScript]]
```

you will be able to visually explore relationships between:

```text
                 GooGo
               /   |   \
              /    |    \
         Ollama  SQLite  Bun
            \      |      /
             \     |     /
              TypeScript
```

The long-term goal is to combine:

* Semantic vector search
* Markdown knowledge
* Obsidian links
* Tags
* Projects
* Preferences
* People
* Recency

This allows GooGo's memory to remain both **machine-searchable** and **human-readable**.

---

# Memory Privacy

GooGo's memory is stored locally on your machine.

Your vault lives inside:

```text
~/.goo/vault
```

You can:

* Read your memories
* Edit them
* Delete them
* Back them up
* Version-control them
* Open them in Obsidian

The goal is simple:

> Your AI memory should belong to you.

---

# Current Project Status

GooGo is currently experimental and under active development.

Some features may be incomplete or change significantly.

Current focus areas include:

* Improving AI code editing
* Multi-step tool execution
* Better memory extraction
* Memory retrieval and context injection
* Markdown chunking
* Automatic vault indexing
* Obsidian knowledge graphs
* Memory re-indexing
* Better terminal UI
* Git integration
* Project-aware context
* Safer code modifications

---

# Planned npm Installation

In the future, GooGo will be installable globally through npm.

The planned experience will look something like:

```bash
npm install -g googo
```

or:

```bash
bun install -g googo
```

Then you will be able to enter any project:

```bash
cd my-project
```

and launch GooGo directly:

```bash
goo
```

For now, install GooGo by cloning the GitHub repository.

---

# Development

Clone the project:

```bash
git clone https://github.com/Forzun/GooGo.git
```

Install dependencies:

```bash
cd GooGo

bun install
```

Make sure Ollama is running and required models are installed:

```bash
ollama pull qwen2.5-coder:3b

ollama pull nomic-embed-text
```

Then start development:

```bash
bun run src/index.ts
```

---

# Philosophy

GooGo is built around a few ideas:

### Local First

Run models locally through Ollama whenever possible.

### User-Owned Memory

Long-term memory should live in files you can inspect and control.

### Transparent Context

You should be able to understand what your AI remembers.

### Controlled Tools

AI should modify code through explicit tools instead of unrestricted file manipulation.

### Open Source

Anyone should be able to clone GooGo, understand how it works, modify it, and run their own version.

---

# Roadmap

GooGo is still evolving.

Planned ideas include:

* [ ] Improved code editing agent
* [ ] Multi-step autonomous tool calling
* [ ] Memory Manager
* [ ] Automatic memory retrieval
* [ ] Automatic memory indexing
* [ ] Markdown chunking
* [ ] `goo memory rebuild`
* [ ] Obsidian relationship generation
* [ ] Knowledge graph expansion
* [ ] Git-aware context
* [ ] Terminal command tools
* [ ] Project indexing
* [ ] MCP support
* [ ] Plugin system
* [ ] Global npm/Bun installation
* [ ] More local model providers

---

# Contributing

GooGo is open source and experimental.

If you find a bug, have an idea, or want to improve the project, contributions are welcome.

You can:

* Open an issue
* Suggest a feature
* Submit a pull request
* Improve documentation
* Experiment with the memory architecture

---

# License

Add your chosen open-source license here.

MIT is a common option for open-source developer tools, but choose the license that best matches how you want others to use and contribute to GooGo.

---

# GooGo

**Your code. Your models. Your memory.**

Built for developers who want to explore what a truly local, open, memory-aware AI coding assistant can become.
