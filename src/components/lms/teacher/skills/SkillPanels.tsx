"use client";

import { useEffect, useState } from "react";
import skillService, {
  type ClassQuizSkillBreakdown,
  type StudentQuizSkillBreakdown,
  type StudentSkillTrend,
} from "@/services/lms/skillService";
import { analyticsService, type CourseStudentProgress } from "@/services/lms/analyticsService";
import { Select } from "@/components/lms/shared";
import SkillScoreBars from "./SkillScoreBars";
import SkillTrendSparklines from "./SkillTrendSparklines";

/**
 * Data-loading wrappers around the per-skill views.
 *
 * All three are teacher-only; the API rejects anyone who does not own the
 * course, so these components never render for a student.
 */

function Frame({
  title,
  subtitle,
  loading,
  error,
  children,
}: {
  title: string;
  subtitle?: string;
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
      <header className="mb-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </header>

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">Đang tải...</p>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400 py-6 text-center">{error}</p>
      ) : (
        children
      )}
    </section>
  );
}

/**
 * Skill profile for one quiz, for the whole class or for one student.
 *
 * The two views share a quiz and differ only in scope, so they share a panel
 * with a scope picker rather than sitting in two places. An earlier version tied
 * the per-student view to the manual-grading list, which is empty whenever a
 * quiz is fully auto-graded - the view was then unreachable for exactly the
 * quizzes teachers run most.
 */
export function QuizSkillBreakdownPanel({
  courseId,
  quizId,
}: {
  courseId: number;
  quizId: number;
}) {
  const [scope, setScope] = useState<string>("");     // "" = whole class
  const [students, setStudents] = useState<CourseStudentProgress[]>([]);
  const [classData, setClassData] = useState<ClassQuizSkillBreakdown | null>(null);
  const [studentData, setStudentData] = useState<StudentQuizSkillBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Enrolled students, so the picker can offer them by name.
  useEffect(() => {
    let cancelled = false;
    analyticsService
      .getCourseStudentProgressOverview(courseId)
      .then((res) => !cancelled && setStudents(res?.data ?? []))
      .catch(() => {
        /* The picker degrades to "whole class" only; not worth an error. */
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const request = scope
      ? skillService
          .getStudentBreakdown(courseId, quizId, Number(scope))
          .then((res) => !cancelled && setStudentData(res?.data ?? null))
      : skillService
          .getClassBreakdown(courseId, quizId)
          .then((res) => !cancelled && setClassData(res?.data ?? null));

    request
      .catch(() => !cancelled && setError("Không tải được phổ điểm theo kỹ năng"))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [courseId, quizId, scope]);

  const data = scope ? studentData : classData;
  const subtitle = scope
    ? "Bài kiểm tra này, xếp từ yếu nhất"
    : classData
      ? `${classData.student_count} học viên đã nộp · xếp từ yếu nhất`
      : undefined;

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {scope ? "Phổ kỹ năng của học viên" : "Kỹ năng cả lớp còn yếu"}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>

        <Select
          size="sm"
          value={scope}
          onValueChange={setScope}
          placeholder="Cả lớp"
          options={[
            { value: "", label: "Cả lớp" },
            ...students.map((st) => ({
              value: String(st.student_id),
              label: st.student_name,
            })),
          ]}
          containerClassName="w-56 shrink-0"
        />
      </header>

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">Đang tải...</p>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400 py-6 text-center">{error}</p>
      ) : (
        <SkillScoreBars
          skills={data?.skills ?? []}
          untaggedQuestions={data?.untagged_questions}
          emptyHint={
            scope
              ? "Học viên chưa nộp bài, hoặc câu hỏi trong bài chưa được gắn kỹ năng."
              : undefined
          }
        />
      )}
    </section>
  );
}

/** One student's skill scores across the quizzes of a course. */
export function StudentSkillTrendPanel({
  courseId,
  studentId,
  compact = false,
}: {
  courseId: number;
  studentId: number;
  compact?: boolean;
}) {
  const [data, setData] = useState<StudentSkillTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    skillService
      .getStudentTrend(courseId, studentId)
      .then((res) => !cancelled && setData(res?.data ?? null))
      .catch(() => !cancelled && setError("Không tải được tiến trình theo kỹ năng"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [courseId, studentId]);

  return (
    <Frame
      title="Tiến trình theo kỹ năng"
      subtitle="So sánh qua các bài kiểm tra trong khóa học"
      loading={loading}
      error={error}
    >
      <SkillTrendSparklines series={data?.series ?? []} compact={compact} />
    </Frame>
  );
}
