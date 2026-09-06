"use client";

import {
  ACTOR_ROLES,
  APPROVAL_STATES,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  ActorRoleChip,
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertTitle,
  ApprovalBadge,
  Badge,
  BidiIdentifier,
  BlockerCallout,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Calendar,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  ContextMenu,
  ContextMenuTrigger,
  DegradedModeBanner,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  ErrorState,
  Field,
  FieldLabel,
  HoverCard,
  HoverCardTrigger,
  Input,
  Label,
  LoadingState,
  OfflineState,
  PROGRAM_STATUSES,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PermissionDeniedState,
  PersianDateTime,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ProgramStatusBadge,
  Progress,
  RUN_STATUSES,
  RadioGroup,
  RadioGroupItem,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  RunStatusBadge,
  STAGE_STATUSES,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Skeleton,
  StageStatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Toaster,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  cn,
} from "@drop/ui";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-h`} className="space-y-3">
      <h2 id={`${id}-h`} className="text-lg font-bold">
        {title}
      </h2>
      {children}
      <Separator />
    </section>
  );
}

/** Mixed-content torture fixtures per 09 §14: long Persian, mixed FA/EN, LTR IDs. */
const LONG_PERSIAN_TITLE =
  "برنامهٔ عمیق «پاتوقِ سلیقه» برای فصل پاییز با تمرکز بر روایت شهری، معماری خام و جزئیات کنترل‌شدهٔ اجرایی";
const MIXED_TEXT = "معیار DROP FIT برای جهت‌گیری Direction B با امتیاز ۰٫۸۷ تأیید شد.";

export function GalleryContent({ dark }: { dark: boolean }) {
  return (
    <div className={cn(dark && "dark", "min-h-screen bg-background text-foreground")}>
      <main className="mx-auto max-w-5xl space-y-8 p-6" data-testid="gallery-root">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">گالری اجزای رابط — دراپ</h1>
          <p className="text-sm text-muted-foreground">
            مرجع دیداری تیکت P1؛ فقط برای توسعه و آزمون. تم فعلی:{" "}
            {dark ? "تیره" : "روشن"}
          </p>
        </header>

        <Section id="type" title="تایپوگرافی و متن دوجهته">
          <p className="max-w-prose text-xl font-medium" style={{ textWrap: "balance" }}>
            {LONG_PERSIAN_TITLE}
          </p>
          <p className="max-w-prose">{MIXED_TEXT}</p>
          <p>
            شناسهٔ اجرا: <BidiIdentifier value="run_01J8ZKW9M2Q-42" /> · نشانی:{" "}
            <BidiIdentifier value="https://drop.local/studio/runs/42?tab=events" />
          </p>
          <p>
            زمان ثبت: <PersianDateTime value="2026-08-21T12:00:00.000Z" />
          </p>
        </Section>

        <Section id="stage-status" title="وضعیت مرحله‌ها (۱۴ حالت ADR-0012)">
          <div className="flex flex-wrap gap-2">
            {STAGE_STATUSES.map((s) => (
              <StageStatusBadge key={s} status={s} />
            ))}
          </div>
        </Section>

        <Section id="run-status" title="وضعیت اجراها (۹ حالت) و برنامه‌ها">
          <div className="flex flex-wrap gap-2">
            {RUN_STATUSES.map((s) => (
              <RunStatusBadge key={s} status={s} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {PROGRAM_STATUSES.map((s) => (
              <ProgramStatusBadge key={s} status={s} />
            ))}
            {APPROVAL_STATES.map((s) => (
              <ApprovalBadge key={s} state={s} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {ACTOR_ROLES.map((r) => (
              <ActorRoleChip key={r} role={r} />
            ))}
          </div>
        </Section>

        <Section id="states" title="حالت‌های نمایشی (18 §4.1)">
          <div className="grid gap-4 md:grid-cols-2">
            <LoadingState />
            <EmptyState />
            <ErrorState diagnosticId="diag-7f3a" />
            <OfflineState />
            <PermissionDeniedState />
            <div className="space-y-3">
              <DegradedModeBanner />
              <BlockerCallout
                title="ورودی الزامی موجود نیست"
                detail="فایل بریف پروژه هنوز بارگذاری نشده است؛ اجرا تا تکمیل ورودی متوقف می‌ماند."
              />
            </div>
          </div>
        </Section>

        <Section id="controls" title="کنترل‌های فرم">
          <div className="flex flex-wrap items-center gap-3">
            <Button>ذخیره</Button>
            <Button variant="secondary">پیش‌نویس</Button>
            <Button variant="outline">انصراف</Button>
            <Button variant="destructive">حذف</Button>
            <Button disabled>غیرفعال</Button>
          </div>
          <div className="grid max-w-md gap-3">
            <Label htmlFor="g-name">عنوان برنامه</Label>
            <Input id="g-name" placeholder="مثلاً: پاتوقِ سلیقه — پاییز" />
            <Label htmlFor="g-desc">توضیح</Label>
            <Textarea id="g-desc" placeholder="توضیح کوتاه به فارسی…" />
            <div className="flex items-center gap-2">
              <Checkbox id="g-check" />
              <Label htmlFor="g-check">نمایش فقط موارد در انتظار تأیید</Label>
            </div>
            <RadioGroup defaultValue="a" aria-label="حالت نمایش">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="a" id="g-r1" />
                <Label htmlFor="g-r1">نمای فشرده</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="b" id="g-r2" />
                <Label htmlFor="g-r2">نمای کامل</Label>
              </div>
            </RadioGroup>
          </div>
        </Section>

        <Section id="structure" title="ساختار: زبانه، جدول، مسیر">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/studio">نمای کلی</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/studio/programs">برنامه‌ها</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{LONG_PERSIAN_TITLE.slice(0, 28)}…</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Tabs defaultValue="one" dir="rtl">
            <TabsList>
              <TabsTrigger value="one">رویدادها</TabsTrigger>
              <TabsTrigger value="two">مصنوعات</TabsTrigger>
              <TabsTrigger value="three">تأییدها</TabsTrigger>
            </TabsList>
            <TabsContent value="one" className="text-sm text-muted-foreground">
              فهرست رویدادهای اجرا این‌جا نمایش داده می‌شود.
            </TabsContent>
            <TabsContent value="two" className="text-sm text-muted-foreground">
              فهرست مصنوعات این‌جا نمایش داده می‌شود.
            </TabsContent>
            <TabsContent value="three" className="text-sm text-muted-foreground">
              فهرست تأییدها این‌جا نمایش داده می‌شود.
            </TabsContent>
          </Tabs>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>برنامه</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>آخرین اجرا</TableHead>
                <TableHead>شناسه</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">{LONG_PERSIAN_TITLE.slice(0, 40)}…</TableCell>
                <TableCell>
                  <ProgramStatusBadge status="IN_PIPELINE" />
                </TableCell>
                <TableCell>
                  <PersianDateTime value="2026-08-21T12:00:00.000Z" />
                </TableCell>
                <TableCell>
                  <BidiIdentifier value="prg_01J8ZK" withCopy={false} />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">لنز هفتهٔ ۳۴ — بازار پاییزی</TableCell>
                <TableCell>
                  <ProgramStatusBadge status="APPROVED" />
                </TableCell>
                <TableCell>
                  <PersianDateTime value="2026-03-20T20:31:00.000Z" />
                </TableCell>
                <TableCell>
                  <BidiIdentifier value="lens_01J8ZM" withCopy={false} />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div className="flex max-w-md items-center gap-4">
            <Skeleton className="h-10 w-full" />
            <Progress value={62} aria-label="پیشرفت اجرا" />
          </div>
          <Alert>
            <AlertTitle>توجه</AlertTitle>
            <AlertDescription>
              نسخهٔ منتشرشدهٔ جریان کار تغییرناپذیر است؛ برای هر تغییر، پیش‌نویس تازه بسازید.
            </AlertDescription>
          </Alert>
          <div className="flex flex-wrap gap-2">
            <Badge>نشان ساده</Badge>
            <Badge variant="secondary">ثانویه</Badge>
            <Badge variant="outline">خطی</Badge>
          </div>
        </Section>

        <Section id="pickers" title="انتخاب‌گرها و فرمان‌ها">
          <div className="flex max-w-md flex-col gap-3">
            <Field>
              <FieldLabel htmlFor="g-sel">وضعیت برنامه</FieldLabel>
              <Select dir="rtl">
                <SelectTrigger id="g-sel">
                  <SelectValue placeholder="انتخاب وضعیت" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">پیش‌نویس</SelectItem>
                  <SelectItem value="in-pipeline">در خط تولید</SelectItem>
                  <SelectItem value="approved">تأییدشده</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Command className="rounded-lg border" dir="rtl">
              <CommandInput placeholder="جست‌وجوی فرمان…" />
              <CommandList>
                <CommandEmpty>موردی یافت نشد.</CommandEmpty>
                <CommandItem>شروع اجرا</CommandItem>
                <CommandItem>توقف موقت اجرا</CommandItem>
                <CommandItem>ثبت تأیید</CommandItem>
              </CommandList>
            </Command>
            {/* Deterministic month so visual baselines never roll over (ticket P1). */}
            <Calendar mode="single" defaultMonth={new Date(2026, 7, 1)} dir="rtl" className="rounded-md border" />
          </div>
        </Section>

        <Section id="disclosure" title="بازشوها و آکاردئون">
          <Accordion type="single" collapsible defaultValue="a1" dir="rtl" className="max-w-md">
            <AccordionItem value="a1">
              <AccordionTrigger>شواهد ایرانی</AccordionTrigger>
              <AccordionContent>پوشش شواهد ایرانی/فارسی نباید صفر باشد.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="a2">
              <AccordionTrigger>شواهد بین‌المللی</AccordionTrigger>
              <AccordionContent>پوشش شواهد بین‌المللی نیز الزامی است.</AccordionContent>
            </AccordionItem>
          </Accordion>
          <Collapsible defaultOpen className="max-w-md space-y-2">
            <CollapsibleTrigger className="text-sm font-medium">جزئیات بیشتر</CollapsibleTrigger>
            <CollapsibleContent className="text-sm text-muted-foreground">
              نسخهٔ منتشرشده مرجع اجراست و ویرایش آن پیش‌نویس تازه می‌سازد.
            </CollapsibleContent>
          </Collapsible>
          <ScrollArea className="h-24 max-w-md rounded-md border p-2">
            <ul className="space-y-1 text-sm">
              {["رویداد ۱", "رویداد ۲", "رویداد ۳", "رویداد ۴", "رویداد ۵", "رویداد ۶", "رویداد ۷"].map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </ScrollArea>
          <ResizablePanelGroup orientation="horizontal" className="max-w-md rounded-lg border">
            <ResizablePanel defaultSize={50} className="p-3 text-sm">فهرست</ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} className="p-3 text-sm">جزئیات</ResizablePanel>
          </ResizablePanelGroup>
        </Section>

        <Section id="overlays" title="پنجره‌ها و منوها (نمایش بسته)">
          {/*
            Overlay open-states stay OUT of the full-page baselines — a portal over
            the page makes them nondeterministic, which is why P1 deferred them.
            They do now carry content, because AC-P1R.7 requires proving portal
            direction (V2 02 §1: "Set direction explicitly in sheets/popovers/dialog
            portals"), and an empty portal proves nothing. The e2e opens each one
            and asserts dir=rtl inside; the snapshots never open them.
          */}
          <div className="flex flex-wrap items-center gap-3">
            <Dialog>
              <DialogTrigger asChild><Button variant="outline">گفت‌وگو</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>عنوان گفت‌وگو</DialogTitle>
                  <DialogDescription>متن توضیحی کوتاه برای آزمون جهت.</DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="outline">تأیید حذف</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>حذف انجام شود؟</AlertDialogTitle>
                  <AlertDialogDescription>این کار بازگشت‌پذیر نیست.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>انصراف</AlertDialogCancel>
                  <AlertDialogAction>حذف</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Sheet>
              <SheetTrigger asChild><Button variant="outline">پنل کناری</Button></SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>پنل بررسی</SheetTitle>
                  <SheetDescription>پنل بازبینی در تیکت P4 پر می‌شود.</SheetDescription>
                </SheetHeader>
              </SheetContent>
            </Sheet>
            <Drawer>
              <DrawerTrigger asChild><Button variant="outline">کشو</Button></DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>کشوی موبایل</DrawerTitle>
                  <DrawerDescription>در نمایش موبایل جای پنل کناری را می‌گیرد.</DrawerDescription>
                </DrawerHeader>
              </DrawerContent>
            </Drawer>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline">منوی عملیات</Button></DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>بازبینی</DropdownMenuItem>
                <DropdownMenuItem>رد کردن</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Popover>
              <PopoverTrigger asChild><Button variant="outline">پاپ‌اور</Button></PopoverTrigger>
              <PopoverContent>محتوای پاپ‌اور برای آزمون جهت.</PopoverContent>
            </Popover>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost">راهنمای ابزار</Button></TooltipTrigger>
                <TooltipContent>توضیح کوتاه</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <HoverCard>
              <HoverCardTrigger asChild><Button variant="ghost">کارت شناور</Button></HoverCardTrigger>
            </HoverCard>
            <ContextMenu>
              <ContextMenuTrigger className="rounded-md border border-dashed px-3 py-2 text-sm">
                کلیک راست
              </ContextMenuTrigger>
            </ContextMenu>
          </div>
          <Pagination dir="rtl">
            <PaginationContent>
              <PaginationItem><PaginationPrevious href="#prev" /></PaginationItem>
              <PaginationItem><PaginationLink href="#1">۱</PaginationLink></PaginationItem>
              <PaginationItem><PaginationLink href="#2" isActive>۲</PaginationLink></PaginationItem>
              <PaginationItem><PaginationLink href="#3">۳</PaginationLink></PaginationItem>
              <PaginationItem><PaginationNext href="#next" /></PaginationItem>
            </PaginationContent>
          </Pagination>
          <Toaster />
        </Section>
      </main>
    </div>
  );
}
