import "server-only";
import { BLOG_POSTS, type BlogPost } from "./blog";
import { SERVICE_POSTS } from "./service-articles";
import { PACKAGES, type Pkg } from "./packages";
import { mergeSettings, type SiteSettings } from "./settings-core";
import { getContent, setContent } from "./store";

const POSTS_KEY = "posts";
const HIDDEN_KEY = "hidden_posts";
const PACKAGES_KEY = "packages";
const SETTINGS_KEY = "settings";

/* ───────────── blog posts (static seed + developer-managed) ─────────────
   Developer edits live in the store as "dynamic" posts that override the
   static seed by slug. Deleting a static post records its slug in a hidden
   list so it disappears from the live site. */

export async function getDynamicPosts(): Promise<BlogPost[]> {
  return getContent<BlogPost[]>(POSTS_KEY, []);
}

async function getHiddenSlugs(): Promise<string[]> {
  return getContent<string[]>(HIDDEN_KEY, []);
}

/** All live posts: dynamic overrides first, then static seed, deduped by
    slug, with hidden slugs removed. */
export async function getAllPosts(): Promise<BlogPost[]> {
  const [dyn, hidden] = await Promise.all([getDynamicPosts(), getHiddenSlugs()]);
  const hiddenSet = new Set(hidden);
  const seen = new Set<string>();
  const out: BlogPost[] = [];
  for (const p of [...dyn, ...SERVICE_POSTS, ...BLOG_POSTS]) {
    if (seen.has(p.slug) || hiddenSet.has(p.slug)) continue;
    seen.add(p.slug);
    out.push(p);
  }
  return out;
}

export async function getPostBySlug(slug: string): Promise<BlogPost | undefined> {
  return (await getAllPosts()).find((p) => p.slug === slug);
}

export async function addPost(post: BlogPost): Promise<void> {
  const dyn = await getDynamicPosts();
  await setContent(POSTS_KEY, [post, ...dyn.filter((p) => p.slug !== post.slug)]);
  // un-hide if this slug had been deleted before
  const hidden = await getHiddenSlugs();
  if (hidden.includes(post.slug)) await setContent(HIDDEN_KEY, hidden.filter((s) => s !== post.slug));
}

export async function deletePost(slug: string): Promise<void> {
  const dyn = await getDynamicPosts();
  if (dyn.some((p) => p.slug === slug)) {
    await setContent(POSTS_KEY, dyn.filter((p) => p.slug !== slug));
  }
  // if it also (or only) exists as a static seed post, hide it
  if ([...SERVICE_POSTS, ...BLOG_POSTS].some((p) => p.slug === slug)) {
    const hidden = await getHiddenSlugs();
    if (!hidden.includes(slug)) await setContent(HIDDEN_KEY, [...hidden, slug]);
  }
}

/* ───────────── packages (defaults + developer edits) ───────────── */
export async function getPackagesMerged(): Promise<Pkg[]> {
  const stored = await getContent<Pkg[] | null>(PACKAGES_KEY, null);
  return stored && stored.length ? stored : PACKAGES;
}

export async function savePackagesList(list: Pkg[]): Promise<void> {
  await setContent(PACKAGES_KEY, list);
}

/* ───────────── site settings (contact, socials, discount, bank) ───────────── */
export async function getSiteSettings(): Promise<SiteSettings> {
  const stored = await getContent<Partial<SiteSettings> | null>(SETTINGS_KEY, null);
  return mergeSettings(stored);
}

export async function saveSiteSettings(s: Partial<SiteSettings>): Promise<void> {
  await setContent(SETTINGS_KEY, s);
}
