# Templates Feature Design

Date: 2026-06-21
Status: Approved
Topic: Prompt Templates library for faster script generation

## Overview

Add a "Templates" page to WebWeave that lets users browse admin-curated prompt templates. Selecting a template auto-fills the generator form (objective + framework), reducing time from intent to generated script.

## Scope

- Admin-curated prompt template library (no user create/edit)
- Browse by category, search by keyword, filter by framework
- One-click: select template → generator pre-filled → Generate
- Replace disabled sidebar "Templates" button with functional page

## Out of Scope

- User-created templates
- Template CRUD UI
- Template sharing/rating
- Community templates

## Architecture

### Route
- `/templates` — SPA view rendered inside `src/app/(main)/page.js`
- Middleware already rewrites `/templates` to `/` (verified)

### Data Flow
```
App mount → WebWeaveContext.fetchTemplates() → GET /api/templates → Supabase
  → templates[] set in context
  → TemplatesPage reads context.templates, renders cards
  → User clicks card → setActiveView('home') + setObjective(prompt) + setFramework(framework)
  → User clicks Generate on pre-filled form
```

### Files

#### New Files
| File | Purpose |
|---|---|
| `src/components/TemplatesPage.js` | Main page: search bar, category tabs, template card grid |
| `src/components/TemplatesPage.module.css` | Page styles |
| `src/app/api/templates/route.js` | `GET /api/templates` — returns public templates |

#### Modified Files
| File | Change |
|---|---|
| `src/app/(main)/page.js` | Add `templates` activeView case, enable sidebar Templates button, wire template selection to generator |
| `src/lib/context/WebWeaveContext.js` | Add `templates` state array + `fetchTemplates()` function |
| `src/lib/i18n/translations.js` | Add template-related translation keys (en + id) |
| `src/middleware.js` | Add `/templates` to `SPA_ROUTES` array |

### No Changes
- Supabase schema — `public.templates` table already exists, add `category` column

## Database

### Table: `public.templates` (existing)

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key, default gen_random_uuid() |
| `owner_id` | uuid | NULL = system template (admin-curated) |
| `name` | text | Display title |
| `prompt` | text | Objective text auto-filled into generator |
| `framework` | text | `playwright_js`, `puppeteer_js`, `selenium_python`, `cypress_js` |
| `visibility` | text | `public` — all users can see |
| `category` | text | **NEW COLUMN** — `login`, `forms`, `e2e`, `api`, `navigation` |
| `created_at` | timestamptz | default now() |

### RLS Policies
- SELECT: `visibility = 'public'` + authenticated (already exists)
- No INSERT/UPDATE/DELETE via API (admin seeds via SQL)

## API

### `GET /api/templates`

Returns all public templates.

**Request:** No params (or optional `?framework=` and `?category=` filters)
**Response:**
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "Login Test",
      "prompt": "Generate a login automation script that...",
      "framework": "playwright_js",
      "category": "login",
      "visibility": "public"
    }
  ]
}
```

## UI Design

### TemplatesPage Layout
```
┌──────────────────────────────────────────────┐
│  Templates                         [🔍 Search]│
│                                              │
│  [All] [Login] [Forms] [E2E] [API] [Nav]    │
│                                              │
│  ┌────────────┐ ┌────────────┐ ┌───────────┐│
│  │ 🔐 Login   │ │ 📝 Forms   │ │ 🛒 E2E    ││
│  │ Playwright │ │ Cypress    │ │ Selenium  ││
│  │            │ │            │ │           ││
│  │ Test login │ │ Fill &     │ │ End-to-end││
│  │ with valid │ │ validate   │ │ checkout  ││
│  │ & invalid  │ │ any form   │ │ flow test ││
│  │ [Use →]   │ │ [Use →]    │ │ [Use →]   ││
│  └────────────┘ └────────────┘ └───────────┘│
└──────────────────────────────────────────────┘
```

### TemplateCard
- Icon per category (emoji or Lucide icon)
- Template name (bold)
- Framework badge (colored pill)
- First ~80 chars of prompt as excerpt
- "Use Template" button/link

### Interaction
1. Click card body or "Use Template" button
2. Context: `setObjective(template.prompt)` + `setFramework(template.framework)`
3. Navigate: `setActiveView('home')`
4. Generator form now pre-filled → user reviews and clicks Generate

### States
- **Loading:** 6 skeleton card placeholders
- **Empty:** "No templates found matching your search"
- **Error:** "Failed to load templates" with retry button

## Seed Data

12 templates across 5 categories and 4 frameworks:

1. Login Test (Playwright)
2. Login Test (Cypress)
3. Form Fill Validation (Playwright)
4. Form Fill Validation (Selenium)
5. E2E Checkout Flow (Playwright)
6. E2E Registration Flow (Cypress)
7. API Smoke Test (Playwright)
8. API CRUD Test (Selenium)
9. Navigation & Links Check (Playwright)
10. Navigation & Links Check (Cypress)
11. Table/Data Grid Validation (Playwright)
12. File Upload Test (Puppeteer)

## Translation Keys (new)

```
templates.title
templates.searchPlaceholder
templates.categories.all
templates.categories.login
templates.categories.forms
templates.categories.e2e
templates.categories.api
templates.categories.navigation
templates.useTemplate
templates.empty
templates.error
```

## Code Conventions

- Use existing patterns: CSS Modules, Lucide icons, `useWebWeave()` hook, `t()` i18n
- Plain JavaScript (no TypeScript)
- Client component (`'use client'`)
- Follow existing error handling: try-catch with `.catch(() => null)`
