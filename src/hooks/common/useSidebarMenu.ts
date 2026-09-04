"use client";

import { useEffect, useState } from "react";
import { sidebarSections } from "@/constants";
import type { SidebarSection } from "@/constants/dashboard";
import { useUser } from "@/store/UserContext";
import { useAuth } from "@/hooks/auth/useAuth";
import lmsService from "@/services/lms/lmsService";
import { getSelectedLmsRole, hasLmsRole, type LmsRole } from "@/lib/lms-navigation";

const ALL: LmsRole[] = ["ADMIN", "TEACHER", "STUDENT"];

/**
 * Lọc menu theo vai trò của người đang đăng nhập.
 *
 * Sidebar và MobileNav trước đây mỗi bên tự lọc, bằng cách so nhãn với chuỗi
 * cứng. Hai đoạn logic gần giống nhau nhưng không hoàn toàn, và sửa một bên
 * thì bên kia âm thầm sai. Gộp về một chỗ để chuyện đó không xảy ra nữa.
 */
export function useSidebarMenu(): { sections: SidebarSection[]; roles: LmsRole[] } {
  const { user } = useUser();
  const { isAdmin } = useAuth();
  const [lmsRoles, setLmsRoles] = useState<string[] | null>(null);

  useEffect(() => {
    if (!user) return;
    lmsService
      .getMyRoles()
      .then((roles) => setLmsRoles(roles ?? []))
      .catch((err) => console.error("Không lấy được vai trò LMS cho menu:", err));
  }, [user]);

  const roles: LmsRole[] = [];
  if (isAdmin) roles.push("ADMIN");
  for (const role of ALL) {
    if (hasLmsRole(lmsRoles, role) && !roles.includes(role)) roles.push(role);
  }
  // Trong lúc chờ getMyRoles trả về, tạm dùng vai trò người dùng đã chọn ở màn
  // /lms, và cuối cùng mới rơi về STUDENT. Nếu để rỗng thì menu chớp một nhịp
  // trống mỗi lần tải trang.
  if (roles.length === 0) roles.push(getSelectedLmsRole() ?? "STUDENT");

  const sections = sidebarSections
    .map((section) => ({
      ...section,
      links: section.links.filter((link) => link.roles.some((r) => roles.includes(r))),
    }))
    .filter((section) => section.links.length > 0);

  return { sections, roles };
}
