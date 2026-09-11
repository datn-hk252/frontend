"use client";

import { useCallback, useEffect, useState } from "react";
import { GraduationCap, Pencil, Plus, Trash2, Users } from "lucide-react";
import {
  Alert,
  Badge,
  EmptyState,
  LmsPageHeader,
  PrimaryBtn,
} from "@/components/lms/shared";
import { ClassFormModal } from "@/components/lms/admin/classes/ClassFormModal";
import { ClassRosterModal } from "@/components/lms/admin/classes/ClassRosterModal";
import classService, { type ClassSummary } from "@/services/lms/classService";
import lmsService from "@/services/lms/lmsService";
import { fetchUsers } from "@/lib/users/api";

/** Server caps page_size at 100 (dto.PaginationRequest, binding max=100). */
const PICKER_PAGE_SIZE = 100;

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
 * Class management, FR-CLS-01..04.
 *
 * Admin-only: a centre places its learners rather than letting them enrol
 * themselves, so this screen is the only way a student gains access to course
 * material. Teachers see their own classes through the teacher area instead.
 */
export default function AdminClassesPage() {
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [courses, setCourses] = useState<{ id: number; title: string }[]>([]);
  const [teachers, setTeachers] = useState<{ id: number | string; name: string }[]>([]);
  const [students, setStudents] = useState<{ id: number | string; name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickerWarning, setPickerWarning] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClassSummary | null>(null);
  const [rosterOf, setRosterOf] = useState<number | null>(null);

  const loadClasses = useCallback(async () => {
    try {
      setClasses(await classService.list());
    } catch {
      setError("Không tải được danh sách lớp.");
    }
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await loadClasses();

      // The pickers need courses to open a class on, and the two rosters of
      // people. Each is allowed to fail on its own - a missing teacher list
      // should not stop an admin from reading the classes - but a failure has
      // to be visible: an empty dropdown looks exactly like "no data yet".
      const failed: string[] = [];

      try {
        // page_size is capped at 100 server-side; asking for more is a 400.
        const page = await lmsService.listAllCoursesForAdmin({ page_size: PICKER_PAGE_SIZE });
        setCourses((page?.items ?? []).map((c: { id: number; title: string }) => ({
          id: c.id,
          title: c.title,
        })));
      } catch {
        failed.push("khóa học");
      }

      try {
        const [teacherPage, studentPage] = await Promise.all([
          fetchUsers({ role: "ROLE_TEACHER", pageSize: PICKER_PAGE_SIZE }),
          fetchUsers({ role: "ROLE_STUDENT", pageSize: PICKER_PAGE_SIZE }),
        ]);
        setTeachers(teacherPage.items.map((u) => ({ id: u.id, name: u.name })));
        setStudents(studentPage.items.map((u) => ({ id: u.id, name: u.name, email: u.email })));
      } catch {
        failed.push("người dùng");
      }

      setPickerWarning(
        failed.length
          ? "Không tải được danh sách " + failed.join(" và ") +
            ". Các ô chọn tương ứng sẽ trống - hãy tải lại trang."
          : null
      );

      setLoading(false);
    };
    void loadAll();
  }, [loadClasses]);

  const handleDelete = async (item: ClassSummary) => {
    if (
      !confirm(
        `Xóa lớp "${item.name}"?\n\nDanh sách học viên của lớp sẽ mất. ` +
          "Học viên nào không còn ở lớp nào khác của khóa này sẽ mất quyền vào học liệu."
      )
    ) {
      return;
    }
    try {
      await classService.remove(item.id);
      await loadClasses();
    } catch {
      setError("Không xóa được lớp.");
    }
  };

  return (
    <div className="space-y-6">
      <LmsPageHeader
        title="Quản lý lớp"
        description="Một khóa học là giáo trình; mỗi lớp là một lần chạy giáo trình đó, có giáo viên và thời khóa riêng."
        actions={
          <PrimaryBtn onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-1.5" />
            Tạo lớp
          </PrimaryBtn>
        }
      />

      {error && <Alert type="error">{error}</Alert>}
      {pickerWarning && <Alert type="warning">{pickerWarning}</Alert>}

      {loading ? (
        <p className="py-16 text-center text-sm text-slate-500">Đang tải...</p>
      ) : classes.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-12 h-12" />}
          title="Chưa có lớp nào"
          description="Tạo lớp đầu tiên để xếp học viên và giao bài theo đơn vị lớp."
          action={
            <PrimaryBtn onClick={() => { setEditing(null); setFormOpen(true); }}>
              Tạo lớp
            </PrimaryBtn>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-left">
              <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Lớp</th>
                <th className="px-4 py-3">Khóa học</th>
                <th className="px-4 py-3">Giáo viên</th>
                <th className="px-4 py-3">Thời khóa</th>
                <th className="px-4 py-3 text-center">Học viên</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3" />
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
                    {item.teacher_name || (
                      <span className="italic text-slate-400">Chưa gán</span>
                    )}
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
                    <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABEL[item.status]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => { setEditing(item); setFormOpen(true); }}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg"
                        title="Sửa lớp"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                        title="Xóa lớp"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ClassFormModal
        open={formOpen}
        editing={editing}
        courses={courses}
        teachers={teachers}
        onClose={() => setFormOpen(false)}
        onSaved={loadClasses}
      />

      <ClassRosterModal
        open={rosterOf !== null}
        classId={rosterOf}
        allStudents={students}
        onClose={() => setRosterOf(null)}
        onChanged={loadClasses}
      />
    </div>
  );
}
