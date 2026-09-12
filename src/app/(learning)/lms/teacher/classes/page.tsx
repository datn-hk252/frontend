"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GraduationCap, Users } from "lucide-react";
import {
  Alert,
  Badge,
  EmptyState,
  LmsPageHeader,
  SecondaryBtn,
} from "@/components/lms/shared";
import BaseModal from "@/components/lms/shared/BaseModal";
import classService, {
  type ClassSummary,
  type ClassDetail,
} from "@/services/lms/classService";

const STATUS_LABEL: Record<ClassSummary["status"], string> = {
  ACTIVE: "Đang học",
  FINISHED: "Đã kết thúc",
  CANCELLED: "Đã hủy",
};

const STATUS_VARIANT: Record<ClassSummary["status"], "green" | "gray" | "red"> = {
  ACTIVE: "green",
  FINISHED: "gray",
  CANCELLED: "red",
};

/**
 * The classes this teacher runs. FR-CLS-04.
 *
 * Read-only by design: who is in a class is the centre's decision, so every
 * write lives on the admin screen. The API already narrows the list to the
 * caller's own classes, so nothing is filtered here.
 *
 * Without this screen a teacher assigned to a class could not reach it at all -
 * the course list knows about authorship, and being given a class is not that.
 */
export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rosterOf, setRosterOf] = useState<number | null>(null);
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [loadingRoster, setLoadingRoster] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setClasses(await classService.list());
    } catch {
      setError("Không tải được danh sách lớp.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (rosterOf == null) return;
    setLoadingRoster(true);
    setDetail(null);
    classService
      .get(rosterOf)
      .then(setDetail)
      .catch(() => setError("Không tải được danh sách học viên."))
      .finally(() => setLoadingRoster(false));
  }, [rosterOf]);

  const active = useMemo(
    () => (detail?.students ?? []).filter((s) => s.status === "ACTIVE"),
    [detail]
  );
  const dropped = useMemo(
    () => (detail?.students ?? []).filter((s) => s.status === "DROPPED"),
    [detail]
  );

  return (
    <div className="space-y-6">
      <LmsPageHeader
        title="Lớp của tôi"
        description="Các lớp bạn phụ trách. Danh sách học viên do trung tâm xếp; liên hệ quản trị viên nếu cần thay đổi."
      />

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <p className="py-16 text-center text-sm text-slate-500">Đang tải...</p>
      ) : classes.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-12 h-12" />}
          title="Chưa được phân lớp nào"
          description="Khi trung tâm giao lớp cho bạn, lớp sẽ xuất hiện ở đây."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-left">
              <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Lớp</th>
                <th className="px-4 py-3">Khóa học</th>
                <th className="px-4 py-3">Thời khóa</th>
                <th className="px-4 py-3 text-center">Học viên</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {classes.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {item.course_title}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {item.schedule || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => setRosterOf(item.id)}
                      className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Users className="w-4 h-4" />
                      {item.student_count}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[item.status]}>
                      {STATUS_LABEL[item.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BaseModal
        isOpen={rosterOf !== null}
        onClose={() => setRosterOf(null)}
        title={detail ? `Học viên lớp ${detail.name}` : "Danh sách học viên"}
        description={detail ? `${detail.course_title} · ${active.length} đang học` : undefined}
        size="lg"
        footer={
          <div className="flex justify-end">
            <SecondaryBtn onClick={() => setRosterOf(null)}>Đóng</SecondaryBtn>
          </div>
        }
      >
        {loadingRoster ? (
          <p className="py-10 text-center text-sm text-slate-500">Đang tải...</p>
        ) : active.length === 0 && dropped.length === 0 ? (
          <EmptyState title="Lớp chưa có học viên" description="Trung tâm chưa xếp ai vào lớp này." />
        ) : (
          <div className="space-y-5">
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {active.map((s) => (
                <li
                  key={s.student_id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {s.full_name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{s.email}</p>
                </li>
              ))}
            </ul>

            {dropped.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Đã nghỉ ({dropped.length})
                </h4>
                <ul className="space-y-2">
                  {dropped.map((s) => (
                    <li
                      key={s.student_id}
                      className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 px-3 py-2"
                    >
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                        {s.full_name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{s.email}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </BaseModal>
    </div>
  );
}
