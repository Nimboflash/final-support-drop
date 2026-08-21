// FORBIDDEN (09 §1; AC-P1.3): physical direction utility — must FAIL the
// drop/no-physical-direction-classes rule. Asserted by logical-properties.test.ts.
export function Bad() {
  return <div className="ml-4 text-left">فیزیکی</div>;
}

// F5 blind spots: leading-minus offsets and float must also fail.
export const BadF5 = () => <div className="after:-right-1 float-left" />;
