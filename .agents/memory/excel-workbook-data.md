---
name: Excel workbook data contract
description: Persistent XLSX storage and date handling quirks for this app.
---

The workbook is the source of truth and belongs in private App Storage. Serialize workbook reads and writes within the API process so simultaneous requests do not overwrite each other. For future changes that need multi-instance consistency, add an explicit cross-process lock rather than assuming the in-memory queue coordinates separate server instances.

**Why:** The user requested an Excel workbook backend, and salary/budget records should not be stored in a public bucket. A local workbook would not be durable across app restarts or publishing.

**How to apply:** Preserve private workbook storage when changing persistence. When an OpenAPI field is `format: date`, validate with generated Zod, then serialize it as `YYYY-MM-DD`; Zod coercion returns `Date`, whose default JSON serialization changes it to a timestamp.
