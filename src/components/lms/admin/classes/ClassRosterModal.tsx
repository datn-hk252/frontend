"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2, UserPlus, UserMinus, RotateCcw, Search } from "lucide-react";
import BaseModal from "@/components/lms/shared/BaseModal";
import { Alert, EmptyState, PrimaryBtn, SecondaryBtn } from "@/components/lms/shared";
import classService, {
  type ClassDetail,
  type RosterStatus,
} from "@/services/lms/classService";

interface StudentOption {
  id: number | string;
  name: string;
  email: string;
}

/**
 * The roster of one class. FR-CLS-02 and FR-CLS-04.
 *
 * Adding somebody here also gives them the course: the API writes the enrolment
 * in the same transaction, so this screen is the single place a learner gains
 * access to material.
 *
 * Two ways off a roster, and they mean opposite things. Marking someone as
 * having left keeps their row, so the centre can still answer which class they
 * attended and what they scored. Removing says they were never in this class -
 * an admin undoing a mis-assignment.
 */
export function ClassRosterModal({
  open,
  classId,
  allStudents,
  onClose,
  onChanged,
}: {
  open: boolean;
  classId: number | null;
  allStudents: StudentOption[];
  onClose: () => void;
  /** Lets the list behind refresh its student counts. */
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = async () => {
    if (classId == null) return;
    setLoading(true);
    setError(null);
    try {
      setDetail(await classService.get(classId));
    } catch {
      setError("Không tải được danh sách lớp.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setQuery("");
      setNotice(null);
      void load();
    }
    // load closes over classId, which is the only thing that should retrigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, classId]);

  const enrolled = useMemo(
    () => new Set((detail?.students ?? []).map((s) => s.student_id)),
    [detail]
  );

  // The head count, here and on the list behind, means people still attending.
  const activeCount = (detail?.students ?? []).filter((s) => s.status === "ACTIVE").length;

  // Only offer people who are not already on this roster.
  const candidates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return allStudents
      .filter((s) => !enrolled.has(Number(s.id)))
      .filter(
        (s) =>
          !needle ||
          s.name.toLowerCase().includes(needle) ||
          s.email.toLowerCase().includes(needle)
      )
      .slice(0, 25);
  }, [allStudents, enrolled, query]);

  const addStudent = async (studentId: number) => {
    setBusy(true);
    setError(null);
    try {
      await classService.addStudent(classId!, studentId);
      await load();
      onChanged();
    } catch {
      setError("Không thêm được học viên.");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (studentId: number, fullName: string, status: RosterStatus) => {
    if (
      status === "DROPPED" &&
      !confirm(
        `Đánh dấu ${fullName} đã nghỉ lớp này?` +
          "\n\nTên vẫn ở lại danh sách cùng điểm các bài đã làm, " +
          "nhưng quyền vào học liệu sẽ được thu hồi."
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await classService.setStudentStatus(classId!, studentId, status);
      await load();
      onChanged();
      setNotice(
        status === "DROPPED"
          ? `Đã đánh dấu ${fullName} nghỉ lớp. Nếu học viên không còn ở lớp nào khác ` +
            "của khóa này, quyền vào học liệu cũng được thu hồi."
          : `${fullName} đã học lại lớp này.`
      );
    } catch {
      setError("Không cập nhật được trạng thái học viên.");
    } finally {
      setBusy(false);
    }
  };

  const removeStudent = async (studentId: number, fullName: string) => {
    if (
      !confirm(
        `Gỡ hẳn ${fullName} khỏi lớp này?` +
          "\n\nDùng khi xếp nhầm người. Học viên có học rồi mới nghỉ thì nên " +
          "đánh dấu nghỉ để giữ lại hồ sơ."
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await classService.removeStudent(classId!, studentId);
      await load();
      onChanged();
      setNotice(
        `Đã gỡ ${fullName}. Nếu học viên không còn ở lớp nào khác của khóa này, ` +
          "quyền vào học liệu cũng được thu hồi."
      );
    } catch {
      setError("Không gỡ được học viên.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BaseModal
      isOpen={open}
      onClose={onClose}
      title={detail ? `Học viên lớp ${detail.name}` : "Danh sách học viên"}
      description={detail ? `${detail.course_title} · ${activeCount} đang học` : undefined}
      size="2xl"
      footer={
        <div className="flex justify-end">
          <SecondaryBtn onClick={onClose}>Đóng</SecondaryBtn>
        </div>
      }
    >
      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500">Đang tải...</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Roster */}
          <section>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
              Trong lớp ({activeCount})
            </h4>
            {error && <Alert type="error">{error}</Alert>}
            {notice && <Alert type="info">{notice}</Alert>}

            {detail && detail.students.length === 0 ? (
              <EmptyState
                title="Lớp chưa có học viên"
                description="Thêm từ danh sách bên phải."
              />
            ) : (
              <ul className="space-y-2 max-h-80 overflow-y-auto">
                {detail?.students.map((s) => {
                  const dropped = s.status === "DROPPED";
                  return (
                    <li
                      key={s.student_id}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
                        dropped
                          ? "border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40"
                          : "border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            dropped
                              ? "text-slate-500 dark:text-slate-400"
                              : "text-slate-900 dark:text-slate-100"
                          }`}
                        >
                          {s.full_name}
                          {dropped && (
                            <span className="ml-2 text-[10px] uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400">
                              đã nghỉ
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{s.email}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {dropped ? (
                          <button
                            type="button"
                            onClick={() => setStatus(s.student_id, s.full_name, "ACTIVE")}
                            disabled={busy}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg disabled:opacity-50"
                            title={`Cho ${s.full_name} học lại`}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setStatus(s.student_id, s.full_name, "DROPPED")}
                            disabled={busy}
                            className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg disabled:opacity-50"
                            title={`Đánh dấu ${s.full_name} nghỉ lớp`}
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeStudent(s.student_id, s.full_name)}
                          disabled={busy}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg disabled:opacity-50"
                          title={`Gỡ hẳn ${s.full_name} khỏi lớp`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Candidates */}
          <section>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
              Thêm học viên
            </h4>
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo tên hoặc email..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {candidates.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">
                {query ? "Không tìm thấy học viên phù hợp." : "Mọi học viên đều đã ở trong lớp."}
              </p>
            ) : (
              <ul className="space-y-2 max-h-72 overflow-y-auto">
                {candidates.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {s.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{s.email}</p>
                    </div>
                    <PrimaryBtn
                      onClick={() => addStudent(Number(s.id))}
                      disabled={busy}
                      className="!px-2.5 !py-1.5"
                    >
                      <UserPlus className="w-4 h-4" />
                    </PrimaryBtn>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </BaseModal>
  );
}

export default ClassRosterModal;
