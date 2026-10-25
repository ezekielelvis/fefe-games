// Simplified Adinkra-inspired glyphs, drawn inline so the game needs no image
// files and plays offline. 24x24 viewBox, currentColor.

export interface Glyph {
  name: string
  meaning: string
  path: JSX.Element
}

const s = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const

export const GLYPHS: Glyph[] = [
  {
    name: "Adinkrahene",
    meaning: "Greatness",
    path: (
      <g {...s}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5.5" />
        <circle cx="12" cy="12" r="2" />
      </g>
    ),
  },
  {
    name: "Akoma",
    meaning: "Patience",
    path: <path {...s} d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  },
  {
    name: "Nkyinkyim",
    meaning: "Adaptability",
    path: <path {...s} d="M4 4l4 4-4 4 4 4-4 4M12 4l4 4-4 4 4 4-4 4M20 4v16" />,
  },
  {
    name: "Nyame Dua",
    meaning: "Presence of God",
    path: (
      <g {...s}>
        <path d="M12 3v18M3 12h18" />
        <rect x="8" y="8" width="8" height="8" />
      </g>
    ),
  },
  {
    name: "Dwennimmen",
    meaning: "Humility & strength",
    path: (
      <g {...s}>
        <path d="M12 12c-3 0-6-2-6-5a3 3 0 0 1 6 0" />
        <path d="M12 12c3 0 6-2 6-5a3 3 0 0 0-6 0" />
        <path d="M12 12c-3 0-6 2-6 5a3 3 0 0 0 6 0" />
        <path d="M12 12c3 0 6 2 6 5a3 3 0 0 1-6 0" />
      </g>
    ),
  },
  {
    name: "Mframadan",
    meaning: "Resilience",
    path: (
      <g {...s}>
        <path d="M12 3l9 9-9 9-9-9z" />
        <path d="M12 8l4 4-4 4-4-4z" />
      </g>
    ),
  },
  {
    name: "Owo Foro Adobe",
    meaning: "Persistence",
    path: <path {...s} d="M12 12m-1 0a1 1 0 1 1 2 0a3 3 0 1 1-6 0a5 5 0 1 1 10 0a7 7 0 1 1-14 0" />,
  },
  {
    name: "Nsoromma",
    meaning: "Guardianship",
    path: <path {...s} d="M12 3l2.6 5.6 6 .6-4.5 4 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.5-4 6-.6z" />,
  },
  {
    name: "Fihankra",
    meaning: "Security",
    path: (
      <g {...s}>
        <rect x="4" y="4" width="16" height="16" rx="1" />
        <path d="M4 12h5v-5M20 12h-5v5" />
      </g>
    ),
  },
  {
    name: "Ese Ne Tekrema",
    meaning: "Friendship",
    path: (
      <g {...s}>
        <path d="M6 4v16M18 4v16" />
        <path d="M6 8h4M6 12h4M6 16h4M14 8h4M14 12h4M14 16h4" />
      </g>
    ),
  },
]
