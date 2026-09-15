"use client";

import { useEffect, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { Badge } from "@drop/ui";
import { useDemoSession } from "../../lib/demo/providers";

/**
 * What the machine is doing right now (ticket P10, slice 2).
 *
 * The panel had no answer to that, and the gap was widest exactly where it hurt
 * most. Approving a concept fires two machine calls — record the approval, then
 * build the research portfolio — and the build reaches a model, so it takes
 * tens of seconds to minutes and spends money while it runs. During all of it
 * the panel looked idle. A person with no signal reasonably concludes nothing
 * happened and presses again, which is the one response that costs twice.
 *
 * Three states, and the distinction between the last two is the point:
 *
 *   کار    a write is in flight. Something is running and being paid for.
 *   تازه‌سازی  a read is in flight. The panel is catching up; nothing is spent.
 *   زنده   neither. What is on screen is what the machine last said.
 *
 * STALLED is not a fourth state here, and deliberately. A write that outlives
 * its request is not stalled — the service has no cancellation, so it is still
 * running, and `refetchInterval` in `queries.ts` re-reads every ten seconds, so
 * the result arrives on its own. What a "stalled" badge would actually mean is
 * "this has been running a while", which is why the elapsed seconds are shown
 * beside the working state instead. A number that keeps climbing is honest
 * about a long job in a way a static word is not.
 */
export function MachineActivity() {
  const live = useDemoSession().mode === "REAL";
  const writing = useIsMutating() > 0;
  const reading = useIsFetching() > 0;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!writing) {
      setElapsed(0);
      return;
    }
    // A second's granularity, and it stops the moment the write settles. The
    // interval is created only while something is actually running, so an idle
    // panel schedules nothing.
    const started = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.round((Date.now() - started) / 1000));
    }, 1_000);
    return () => {
      clearInterval(timer);
    };
  }, [writing]);

  // MOCK mode has nothing to report: its world is local, deterministic and
  // instant, so an activity light would only ever be off.
  if (!live) return null;

  if (writing) {
    return (
      <Badge
        variant="outline"
        data-testid="machine-activity"
        data-state="working"
        className="gap-1.5 font-normal"
      >
        <span
          aria-hidden="true"
          className="size-1.5 animate-pulse rounded-full bg-selected"
        />
        <span>
          ماشین در حال کار است
          {elapsed > 0 ? ` — ${toFaSeconds(elapsed)}` : null}
        </span>
      </Badge>
    );
  }

  if (reading) {
    return (
      <Badge
        variant="outline"
        data-testid="machine-activity"
        data-state="reading"
        className="gap-1.5 font-normal text-muted-foreground"
      >
        <span aria-hidden="true" className="size-1.5 rounded-full bg-muted-foreground" />
        <span>در حال تازه‌سازی</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      data-testid="machine-activity"
      data-state="idle"
      className="gap-1.5 font-normal text-muted-foreground"
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
      <span>زنده</span>
    </Badge>
  );
}

/** Persian digits, and a unit that reads naturally rather than «۹۰ ثانیه». */
function toFaSeconds(seconds: number): string {
  const fa = (value: number): string =>
    String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)] ?? digit);
  if (seconds < 60) return `${fa(seconds)} ثانیه`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${fa(minutes)} دقیقه` : `${fa(minutes)} دقیقه و ${fa(rest)} ثانیه`;
}
