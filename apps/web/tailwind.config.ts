import type { Config } from 'tailwindcss'

// Tailwind v4 — all theme config lives in globals.css via @theme inline.
// This file is kept for IDE tooling compatibility only.
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
}

export default config
