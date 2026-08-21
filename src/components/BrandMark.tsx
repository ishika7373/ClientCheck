/* One off mark drawn at the Phosphor regular stroke weight (16 units on a 256
   grid) so it sits correctly beside the icon set. Four rotors around a hub:
   the only place the brand orange appears outside a CTA, the active nav
   indicator and focus rings. */
export function BrandMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      stroke="currentColor"
      strokeWidth={16}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <rect x="96" y="96" width="64" height="64" />
      <circle cx="48" cy="48" r="28" />
      <circle cx="208" cy="48" r="28" />
      <circle cx="48" cy="208" r="28" />
      <circle cx="208" cy="208" r="28" />
      <line x1="68" y1="68" x2="96" y2="96" />
      <line x1="188" y1="68" x2="160" y2="96" />
      <line x1="68" y1="188" x2="96" y2="160" />
      <line x1="188" y1="188" x2="160" y2="160" />
    </svg>
  );
}
