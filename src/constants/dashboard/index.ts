import { Users, GraduationCap, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { LmsRole } from "@/lib/lms-navigation";

/**
 * Menu của Sidebar và MobileNav.
 *
 * Sidebar chỉ lo việc đi lại giữa khu học tập và khu quản trị. Điều hướng bên
 * trong LMS do thanh riêng của từng vai trò lo, xem các tệp layout.tsx trong
 * app/(learning)/lms/{admin,teacher,student}.
 *
 * Quyền xem nằm ngay trong dữ liệu, ở trường `roles`. Trước đây Sidebar và
 * MobileNav lọc bằng cách so nhãn với chuỗi cứng (`link.label === "BDCourse"`),
 * nên đổi tên một mục là lặng lẽ làm hỏng bộ lọc ở hai tệp khác mà không có
 * lỗi biên dịch nào. Mọi thứ phụ thuộc vào mục nào đều phải khai ở đây.
 */
export interface SidebarLink {
  label: string;
  route: string;
  icon: LucideIcon;
  iconColor: string;
  /** Vai trò LMS được nhìn thấy mục này. */
  roles: LmsRole[];
  /** Tô hai tông cho tên thương hiệu: phần đầu thường, phần sau nhấn màu. */
  brand?: { lead: string; accent: string };
  /** Huy hiệu số hiển thị bên phải nhãn. */
  badge?: "alerts";
}

export interface SidebarSection {
  title: string;
  links: SidebarLink[];
}

const ALL_ROLES: LmsRole[] = ["ADMIN", "TEACHER", "STUDENT"];

export const sidebarSections: SidebarSection[] = [
  {
    title: "Học tập",
    links: [
      {
        label: "BDCourse",
        route: "/lms",
        icon: GraduationCap,
        iconColor: "text-blue-500",
        roles: ALL_ROLES,
        brand: { lead: "BD", accent: "Course" },
        badge: "alerts",
      },
    ],
  },
  {
    title: "Quản trị",
    links: [
      {
        label: "Người dùng",
        route: "/users",
        icon: Users,
        iconColor: "text-blue-500",
        roles: ["ADMIN"],
      },
      {
        label: "Phân quyền",
        route: "/settings/roles",
        icon: ShieldCheck,
        iconColor: "text-blue-500",
        roles: ["ADMIN"],
      },
    ],
  },
];
