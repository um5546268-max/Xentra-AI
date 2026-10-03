import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://new.xentraai.uk/',
      lastModified: new Date(),
    },
  ]
}