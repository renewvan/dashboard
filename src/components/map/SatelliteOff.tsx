import type { SVGProps } from 'react'

/**
 * A satellite with a slash through it: "no GPS". Lucide's `satellite-off`, which the installed
 * `lucide-react` does not ship yet. Same 24px grid and stroke as the rest of the icons, so it sizes
 * and colours (`currentColor`) like them.
 */
export function SatelliteOff(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m10 10-.648.648a1.205 1.205 0 000 1.704l2.296 2.296a1.205 1.205 0 001.704 0L14 14" />
      <path d="m12.828 7.172.82-.82a1.205 1.205 0 011.704 0l2.296 2.296a1.205 1.205 0 010 1.704l-.82.82" />
      <path d="m13.5 6.5-3.148-3.148a1.21 1.21 0 00-1.508-.165" />
      <path d="m17.5 10.5 3.148 3.148a1.2 1.2 0 01.157 1.5" />
      <path d="M17.92 17.92a1.2 1.2 0 01-1.272-.272L13.5 14.5" />
      <path d="m19 5-2.5 2.5" />
      <path d="m2 2 20 20" />
      <path d="M6.072 6.072a1.21 1.21 0 00.28 1.28L9.5 10.5" />
      <path d="M9 21a6 6 0 00-6-6" />
    </svg>
  )
}
