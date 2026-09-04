import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.APP_PUBLIC_URL || 'http://localhost:3000';

  // Chỉ còn trang gốc. Các đường dẫn cũ (/hackathon2025, /forms/survey/*) thuộc
  // phần câu lạc bộ, đã chuyển vào _parked/. Mọi màn hình còn lại đều nằm sau
  // đăng nhập nên không đưa vào sitemap.
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];
}
