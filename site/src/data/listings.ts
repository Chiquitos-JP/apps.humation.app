import featuredSlugsJson from './featured.json'
import type { Locale } from '../i18n'
import type { Category, Platform } from '../lib/constants'

const featuredSlugs: string[] = featuredSlugsJson

const files = import.meta.glob('../../../apps/*/app.json', {
  eager: true,
  import: 'default',
}) as Record<string, AppJson>

export type HumationPackage =
  | '@humation/react'
  | '@humation/core'
  | '@humation/web-component'
  | '@humation/assets-humation-1'
  | 'humation-swift'

export type Pricing = 'free' | 'freemium' | 'paid'

export type ListingI18n = {
  tagline?: string
  description?: string
  usage?: string
  screenshots?: { file: string; alt: string }[]
}

export type Listing = {
  slug: string
  $schema?: string
  name: string
  tagline: string
  description: string
  url: string
  category: Category
  platforms: Platform[]
  pricing: Pricing
  humation: {
    packages: HumationPackage[]
    usage?: string
  }
  developer: {
    name: string
    github: string
    url?: string
  }
  icon: 'icon.png'
  screenshots: { file: string; alt: string }[]
  links?: {
    repo?: string
    appStore?: string
    playStore?: string
    x?: string
    discord?: string
  }
  addedAt: string
  i18n?: { ja?: ListingI18n }
}

type AppJson = Omit<Listing, 'slug'>

function slugFromPath(path: string): string {
  const match = path.match(/\/apps\/([^/]+)\/app\.json$/)
  if (!match) {
    throw new Error(`Cannot parse listing slug from ${path}`)
  }
  return match[1]
}

const listings: Listing[] = Object.entries(files).map(([path, data]) => ({
  slug: slugFromPath(path),
  ...data,
}))

export function localize(listing: Listing, locale: Locale): Listing {
  if (locale !== 'ja') return listing
  const ja = listing.i18n?.ja
  if (!ja) return listing

  const next: Listing = { ...listing }
  if (ja.tagline) next.tagline = ja.tagline
  if (ja.description) next.description = ja.description
  if (ja.usage) next.humation = { ...listing.humation, usage: ja.usage }
  if (ja.screenshots?.length) {
    const altByFile = new Map(
      ja.screenshots.filter((shot) => shot.file && shot.alt).map((shot) => [shot.file, shot.alt]),
    )
    next.screenshots = listing.screenshots.map((shot) => {
      const alt = altByFile.get(shot.file)
      return alt ? { ...shot, alt } : shot
    })
  }
  return next
}

function withoutI18n(listing: Listing): Listing {
  if (listing.i18n === undefined) return listing
  const { i18n: _i18n, ...rest } = listing
  return rest
}

export function localizeAll(listings: Listing[], locale: Locale): Listing[] {
  return listings.map((listing) => withoutI18n(localize(listing, locale)))
}

export function allListings(): Listing[] {
  return [...listings].sort((a, b) => a.name.localeCompare(b.name))
}

export function bySlug(slug: string): Listing | undefined {
  return listings.find((app) => app.slug === slug)
}

export function byCategory(category: string): Listing[] {
  return listings
    .filter((app) => app.category === category)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function newest(limit?: number): Listing[] {
  const sorted = [...listings].sort(
    (a, b) => b.addedAt.localeCompare(a.addedAt) || a.name.localeCompare(b.name),
  )
  return limit === undefined ? sorted : sorted.slice(0, limit)
}

export function featured(): Listing[] {
  const byId = new Map(listings.map((app) => [app.slug, app]))
  const out: Listing[] = []
  for (const slug of featuredSlugs) {
    const entry = byId.get(slug)
    if (!entry) {
      console.warn(`featured.json: unknown slug "${slug}" (ignored)`)
      continue
    }
    out.push(entry)
  }
  return out
}

export function categoryCounts(): { category: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const app of listings) {
    counts.set(app.category, (counts.get(app.category) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => a.category.localeCompare(b.category))
}
