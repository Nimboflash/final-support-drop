/**
 * @drop/ui — shadcn components as owned code, DROP tokens and FA/RTL primitives.
 * Panel-activated per ADR-0017 D3 / 18 §10; API frozen at the P1 handoff (P4 consumes it).
 * The single theme file is ./theme.css (09 §3).
 */

// direction (ADR 0010 D6)
export { DirectionProvider } from "@radix-ui/react-direction";

// ---- owned shadcn set (09 §7; AC-P1.2) ----
export * from "./components/ui/accordion";
export * from "./components/ui/alert";
export * from "./components/ui/alert-dialog";
export * from "./components/ui/badge";
export * from "./components/ui/breadcrumb";
export * from "./components/ui/button";
export * from "./components/ui/calendar";
export * from "./components/ui/card";
export * from "./components/ui/checkbox";
export * from "./components/ui/collapsible";
export * from "./components/ui/command";
export * from "./components/ui/context-menu";
export * from "./components/ui/dialog";
export * from "./components/ui/drawer";
export * from "./components/ui/dropdown-menu";
export * from "./components/ui/field";
export * from "./components/ui/form";
export * from "./components/ui/hover-card";
export * from "./components/ui/input";
export * from "./components/ui/label";
export * from "./components/ui/pagination";
export * from "./components/ui/popover";
export * from "./components/ui/progress";
export * from "./components/ui/radio-group";
export * from "./components/ui/resizable";
export * from "./components/ui/scroll-area";
export * from "./components/ui/select";
export * from "./components/ui/separator";
export * from "./components/ui/sheet";
export * from "./components/ui/sidebar";
export * from "./components/ui/skeleton";
export * from "./components/ui/sonner";
export * from "./components/ui/table";
export * from "./components/ui/tabs";
export * from "./components/ui/textarea";
export * from "./components/ui/tooltip";

// ---- DROP domain layer ----
// hooks — P4/P6 need the responsive switch for the review sheet (V2 02 §6)
export { useIsMobile } from "./hooks/use-mobile";

export * from "./components/drop/vocabulary";
export * from "./components/drop/labels-fa";
export * from "./components/drop/status";
export * from "./components/drop/primitives";

// utils
export { cn } from "./lib/utils";
