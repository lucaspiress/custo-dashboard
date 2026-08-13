# Roadmap Execution Design

## Goal

Evolve the deployed v3 into an operationally reliable product while preserving
the existing React, FastAPI and Neon architecture.

## Delivery boundaries

The work is divided into independent releases: UX, reports, operations and v4
platform capabilities. Deploy, database cleanup and PDF content decisions are
external gates; they are not assumed during local implementation.

## First release: drag-and-drop import

The projects page keeps its existing `.xlsx` input and upload API. A visible
drop zone accepts one `.xlsx` file, calls the same `importarArquivo` function as
the button, and communicates active/invalid states accessibly. The backend API
does not change.

## Quality bar

The feature must reject non-Excel files before upload, preserve the existing
button workflow, display the existing API error on upload failure, and build
without adding runtime dependencies.
