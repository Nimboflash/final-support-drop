import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import * as UI from "./index";

// AC-P1.2 — the 09 §7 set exists as OWNED source in packages/ui, importable from
// the public API. Names transcribed from doc 09 §7 (Combobox is a Command+Popover
// composition in the upstream registry, covered by those exports — recorded in the
// P1 handoff as a doc-to-registry mapping note).
const OWNED_EXPORTS = [
  // form & input
  "Button", "Input", "Textarea", "Label", "Checkbox", "RadioGroup", "RadioGroupItem",
  "Select", "SelectTrigger", "SelectContent", "SelectItem",
  "Form", "FormField", "FormItem", "Field", "FieldLabel",
  "Calendar", "Popover", "PopoverTrigger", "PopoverContent",
  "Command", "CommandInput", "CommandList", "CommandItem",
  // display
  "Badge", "Alert", "AlertTitle", "AlertDescription",
  "Tooltip", "TooltipTrigger", "TooltipContent", "TooltipProvider",
  "HoverCard", "HoverCardTrigger", "HoverCardContent",
  // overlays
  "Dialog", "DialogTrigger", "DialogContent",
  "AlertDialog", "AlertDialogTrigger", "AlertDialogContent",
  "Sheet", "SheetTrigger", "SheetContent",
  "Drawer", "DrawerTrigger", "DrawerContent",
  // structure
  "Tabs", "TabsList", "TabsTrigger", "TabsContent",
  "Accordion", "AccordionItem", "AccordionTrigger", "AccordionContent",
  "Collapsible", "CollapsibleTrigger", "CollapsibleContent",
  "Table", "TableHeader", "TableBody", "TableRow", "TableCell",
  "Pagination", "PaginationContent", "PaginationItem",
  "DropdownMenu", "DropdownMenuTrigger", "DropdownMenuContent", "DropdownMenuItem",
  "ContextMenu", "ContextMenuTrigger", "ContextMenuContent",
  "Sidebar", "SidebarProvider", "SidebarContent", "SidebarMenu",
  "Breadcrumb", "BreadcrumbList", "BreadcrumbItem",
  "Separator", "ResizablePanelGroup", "ResizablePanel", "ResizableHandle",
  "ScrollArea", "Skeleton", "Progress", "Toaster",
  // direction
  "DirectionProvider",
] as const;

describe("owned shadcn set (AC-P1.2, 09 §7)", () => {
  it.each([...OWNED_EXPORTS])("exports %s from the public API", (name) => {
    const mod = UI as Record<string, unknown>;
    expect(mod[name], `@drop/ui must export ${name}`).toBeDefined();
  });

  it("simple leaf components render in an RTL container", () => {
    const { container } = render(
      <div dir="rtl">
        <UI.Button>ذخیره</UI.Button>
        <UI.Badge>نشان</UI.Badge>
        <UI.Input placeholder="جست‌وجو" />
        <UI.Separator />
        <UI.Skeleton className="h-4 w-24" />
        <UI.Progress value={40} />
        <UI.Alert>
          <UI.AlertTitle>توجه</UI.AlertTitle>
          <UI.AlertDescription>نسخهٔ منتشرشده تغییرناپذیر است.</UI.AlertDescription>
        </UI.Alert>
      </div>,
    );
    expect(container.querySelectorAll("button, input, [role='alert'], [role='progressbar']").length)
      .toBeGreaterThanOrEqual(3);
  });
});
