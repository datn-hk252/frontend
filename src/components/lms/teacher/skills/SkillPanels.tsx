"use client";

import { useEffect, useState } from "react";
import skillService, {
  type ClassQuizSkillBreakdown,
  type StudentQuizSkillBreakdown,
  type StudentSkillTrend,
} from "@/services/lms/skillService";
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

/** Class-wide skill profile on one quiz. */
export function ClassSkillBreakdownPanel({
  courseId,
  quizId,
}: {
  courseId: number;
  quizId: number;
}) {
  const [data, setData] = useState<ClassQuizSkillBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    skillService
      .getClassBreakdown(courseId, quizId)
      .then((res) => !cancelled && setData(res?.data ?? null))
      .catch(() => !cancelled && setError("Không tải được phổ điểm theo kỹ năng"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [courseId, quizId]);

  return (
    <Frame
      title="Kỹ năng cả lớp còn yếu"
      subtitle={
        data ? `${data.student_count} học viên đã nộp · xếp từ yếu nhất` : undefined
      }
      loading={loading}
      error={error}
    >
      <SkillScoreBars
        skills={data?.skills ?? []}
        untaggedQuestions={data?.untagged_questions}
      />
    </Frame>
  );
}

/** One student's skill profile on one quiz. */
export function StudentSkillBreakdownPanel({
  courseId,
  quizId,
  studentId,
  studentName,
}: {
  courseId: number;
  quizId: number;
  studentId: number;
  studentName?: string;
}) {
  const [data, setData] = useState<StudentQuizSkillBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    skillService
      .getStudentBreakdown(courseId, quizId, studentId)
      .then((res) => !cancelled && setData(res?.data ?? null))
      .catch(() => !cancelled && setError("Không tải được phổ điểm theo kỹ năng"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [courseId, quizId, studentId]);

  return (
    <Frame
      title={studentName ? `Phổ kỹ năng của ${studentName}` : "Phổ kỹ năng của học viên"}
      subtitle="Bài kiểm tra này, xếp từ yếu nhất"
      loading={loading}
      error={error}
    >
      <SkillScoreBars
        skills={data?.skills ?? []}
        untaggedQuestions={data?.untagged_questions}
        emptyHint="Học viên chưa nộp bài, hoặc câu hỏi trong bài chưa được gắn kỹ năng."
      />
    </Frame>
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
