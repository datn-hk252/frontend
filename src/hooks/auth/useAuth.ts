"use client";

import { useUser } from "@/store/UserContext";

export function useAuth() {
  const { user } = useUser();

  const isAdmin = user?.role === "ROLE_ADMIN";
  const isTeacher = user?.role === "ROLE_TEACHER";
  const isAuthenticated = !!user;

  function checkAdminAccess(action: string = "thực hiện hành động này"): boolean {
    if (!isAdmin) {
      alert(`Chỉ admin mới được ${action}.`);
      return false;
    }
    return true;
  }

  return {
    user,
    isAdmin,
    isTeacher,
    isAuthenticated,
    checkAdminAccess,
  };
}