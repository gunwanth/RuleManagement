# Sweet Shop Workflow Builder (Figma-style)

A modern React + React Flow UI that mimics a Figma-like workflow builder for Sweet Shop Management rules.

## Features

- Dashboard with a prominent “➕ Create New Rule” button
- Full-screen workflow canvas with pan/zoom + dotted grid background
- Draggable nodes + connectable edges (smooth connections)
- Default flow: Start → Buy Sweet → Check Stock → Update Stock → End
- Sidebar node palette (drag onto canvas), delete selected node, export workflow as JSON

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Note: In this sandboxed environment, Node.js cannot spawn subprocesses; a small defensive patch was applied to Vite in `node_modules/` so it can run here. On a normal Windows dev machine you typically won’t need that.

