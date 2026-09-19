/* ==========================================================================
   MANILI — SEO МЕТА-ТЕГИ (ТЗ §29)
   Приложение — SPA, поэтому теги обновляются императивно при смене страницы.
   ========================================================================== */

import { useEffect } from 'react'
import { absoluteUrl, config } from '@/api/config'

export interface SeoOptions {
  title: string
  description?: string
  image?: string
  /** Канонический путь без домена: '/shop/hoodies'. */
  canonical?: string
  type?: 'website' | 'article' | 'product'
  noIndex?: boolean
}

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function setLink(rel: string, href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!tag) {
    tag = document.createElement('link')
    tag.rel = rel
    document.head.appendChild(tag)
  }
  tag.href = href
}

export function useSeo({ title, description, image, canonical, type = 'website', noIndex }: SeoOptions) {
  useEffect(() => {
    const fullTitle = title.includes('MANILI') ? title : `${title} — MANILI`
    document.title = fullTitle

    if (description) {
      setMeta('meta[name="description"]', 'name', 'description', description)
      setMeta('meta[property="og:description"]', 'property', 'og:description', description)
    }
    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle)
    setMeta('meta[property="og:type"]', 'property', 'og:type', type)
    if (image) setMeta('meta[property="og:image"]', 'property', 'og:image', image)

    // canonical приходит без подпапки сборки ('/shop'), а pathname — уже с ней.
    const url = canonical
      ? absoluteUrl(canonical)
      : `${new URL(config.site.url || window.location.origin).origin}${window.location.pathname}`
    setMeta('meta[property="og:url"]', 'property', 'og:url', url)
    setLink('canonical', url)

    setMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      noIndex ? 'noindex, nofollow' : 'index, follow',
    )
  }, [title, description, image, canonical, type, noIndex])
}
