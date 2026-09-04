import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.APP_PUBLIC_URL || 'http://localhost:3000';

  // Toàn bộ hệ thống nằm sau đăng nhập, chỉ mở trang gốc cho công cụ tìm kiếm.
  // Các đường dẫn công khai cũ của câu lạc bộ đã chuyển vào _parked/.
  return {
    rules: {
      userAgent: '*',
      allow: ['/'],
      disallow: [
        '/lms/',
        '/users/',
        '/settings/',
        '/myaccount/',
        '/api/',
        '/_next/',
        '/static/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
