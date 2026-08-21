# Dashboard Design System

## 1. Foundation and ownership

Use shadcn/ui as open component code inside `packages/ui`. Components are owned by the project
and adapted to DROP. Do not wrap every shadcn component in unnecessary abstractions; create
domain components only where behavior or semantics repeat.

Use the shadcn RTL setup and a direction provider. Set the application root:

```html
<html lang="fa-IR" dir="rtl">
```

All strings are externalized. Physical direction utilities (`left`, `right`, `ml`, `mr`) are
forbidden in shared UI unless a truly physical visual reason is documented; use logical
properties.

## 2. Brand translation into interface

| Brand principle | Interface behavior |
|---|---|
| Balance is composed tension | Stable grid plus one controlled visual interruption, never random misalignment |
| Select less | One primary action per context; progressive disclosure |
| Context, not lecture | Short labels with deeper detail in sheets/tooltips |
| Warm, not theatrical | Human Persian copy, restrained motion and no performative AI language |
| Raw but elevated | Paper/charcoal surfaces, precise borders, subtle material texture only where legible |
| Discovery has purpose | Motion/highlight reveals relationship or a next action |
| One Lens accent | One runtime accent token; no competing decorative accents |

## 3. Token architecture

Keep primitive, semantic and component tokens separate.

```text
Primitive: charcoal, paper, concrete, aluminium, lens-accent
Semantic: background, foreground, surface, border, muted, focus, success, warning, danger
Component: card, sidebar, node, edge, badge, table, sheet
```

Initial values are explicitly `PROVISIONAL` until the visual identity application guide provides
exact values. All replacements occur in one theme file and visual regression snapshots.

Example shape, not final hex authority:

```css
:root {
  --drop-charcoal: /* provisional */;
  --drop-paper: /* provisional */;
  --drop-concrete: /* provisional */;
  --drop-aluminium: /* provisional */;
  --drop-lens-accent: /* runtime validated value or neutral fallback */;
}
```

Store a Lens color as validated design data with contrast metadata. Never inject unchecked CSS
from a user field.

Functional success/warning/error colors may coexist with the Lens accent because they convey
system state. Keep them restrained, icon/label-supported and excluded from decorative layouts.

## 4. Theme behavior

- Default internal dashboard theme: dark-neutral or system-configurable, using Charcoal as the
  anchor.
- Paper surfaces are used for document/editorial previews.
- Concrete/Aluminium are supporting surfaces/borders, not gradient decoration.
- A single Lens accent may appear on the active Lens header, DOT, focus markers and selected
  relationships.
- System settings can disable Lens accent in dense operational views.
- Both light and dark modes must remain accessible even if one ships as the default.

## 5. Typography

- Bundle fonts locally; no remote font/CDN dependency.
- Use Vazirmatn as the approved implementation baseline from the technical spec.
- Define separate Persian display, Persian body, Latin/system and mono styles.
- Latin IDs and code use a locally available mono stack inside `dir="ltr"` isolation.
- Do not mechanically mirror English typographic tracking into Persian.
- Large editorial headings may be expressive; operational forms/tables remain calm and dense.

Final font choice remains replaceable if the visual identity guide supersedes Vazirmatn.

## 6. Layout

- Right sidebar navigation.
- Content uses a 12-column desktop grid with logical gutters.
- Maximum readable document width is narrower than dashboard/table width.
- Dense operational pages use resizable panels.
- Sheets/inspectors open from the left in RTL to avoid covering the right navigation/context.
- Default workflow graph is full-height and top-to-bottom.
- Avoid card grids when a table or a single ordered list communicates better.

## 7. shadcn component set for Release 0

```text
Button, Input, Textarea, Label, Select, Checkbox, Radio Group
Form, Field, Calendar/Popover, Command, Combobox
Badge, Alert, Tooltip, Hover Card
Dialog, Alert Dialog, Sheet, Drawer
Tabs, Accordion, Collapsible
Table, Pagination, Dropdown Menu, Context Menu
Sidebar, Breadcrumb, Separator
Resizable, Scroll Area, Skeleton, Progress
Toast/Sonner equivalent
```

Add components only through the project registry/configuration and review RTL output after each
addition.

## 8. Domain component inventory

```text
ProgramStatusBadge
StageStatusBadge
ApprovalBadge
BlockerCallout
ActorRoleChip
ArtifactVersionLink
ProvenanceTrail
CitationList
CoverageMatrix
RunCostSummary
RequestCard
StructuredFeedbackForm
PersianDateTime
BidiIdentifier
WorkflowNodeCard
WorkflowInspector
WorkflowValidationList
```

## 9. Status and language rules

- Internal enums remain English and language-neutral.
- Persian UI labels are mapped centrally.
- Never show raw error enums without a human Persian explanation and diagnostic ID.
- Use one clear thought per message.
- Avoid corporate, motivational, mystical or over-poetic copy.
- Do not call DROP primarily a cafe, store or marketplace.
- Use `پاتوقِ سلیقه` for House of Taste, not a literal translation.
- Keep controlled English terms such as `DROP FIT` in bidi-safe spans with natural Persian
  explanation.

## 10. Interaction and motion

- 120-200 ms for ordinary UI feedback; longer structural transitions only when they clarify
  hierarchy.
- No looping decorative animation in the dashboard.
- Workflow edges animate only during active execution.
- DOT may signal selection/current Lens, but never competes with task status.
- Honor `prefers-reduced-motion` and provide a global reduced-motion setting.
- Loading states use restrained skeletons/progress, not fake model-thinking theater.

## 11. Forms

- Labels remain visible; placeholders are examples, never labels.
- Validation summary appears above long forms and focuses the first invalid field.
- Autosave is explicit with saved/saving/conflict state.
- Destructive actions use confirmation and exact target naming.
- Approval forms show subject/version, authority, acted-as role and self-approval policy before
  submission.
- Structured feedback separates preserve, remove/change, do-not-change and why.

## 12. Tables and dense views

- Sticky Persian column headings.
- Saved filters and column visibility per user.
- Dates sort by UTC data, not rendered Persian strings.
- Status cells include icon and text.
- IDs use LTR isolation and copy action.
- Row actions remain accessible by keyboard and do not depend on hover.

## 13. Accessibility target

- WCAG 2.2 AA for core journeys.
- Visible focus in both themes and on canvas nodes/edges.
- Minimum target sizes appropriate for desktop and touch.
- Contrast tested for every Lens accent against its actual surface.
- Semantic heading order and landmark navigation.
- Error text linked to controls.
- No meaning communicated by color, position or motion alone.
- Canvas has equivalent structured list/table representation.

## 14. Visual QA

For each core page capture Playwright snapshots at:

```text
1440 x 1000 desktop
1024 x 768 compact desktop/tablet
390 x 844 mobile status/review mode
```

Test long Persian titles, mixed Persian/English, LTR IDs/URLs, empty states, permission denied,
blocked runs, multiple errors and maximum table density. Any clipped Persian diacritic,
misplaced punctuation or mirrored icon is a release-blocking UI defect for the affected flow.

