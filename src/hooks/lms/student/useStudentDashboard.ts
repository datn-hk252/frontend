"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { lmsService } from "@/services/lms/lmsService";
import { analyticsService } from "@/services/lms/analyticsService";
import progressService, { type ProgressDetailItem } from "@/services/lms/progressService";
import { Enrollment } from "@/types";

/**
 * Rolls a flat list of lessons up into the per-type and per-section totals the
 * progress panel draws.
 *
 * The parked endpoint did this in SQL. Doing it here instead keeps the fix on
 * one side of the wire, and the lists involved are one course's worth of
 * lessons - small enough that where the grouping happens does not matter.
 */
function summariseProgress(items: ProgressDetailItem[]) {
  const roll = (key: keyof ProgressDetailItem) => {
    const buckets = new Map<string, { total: number; completed: number }>();
    for (const item of items) {
      const name = String(item[key] ?? "");
      const bucket = buckets.get(name) ?? { total: 0, completed: 0 };
      bucket.total += 1;
      if (item.is_completed) bucket.completed += 1;
      buckets.set(name, bucket);
    }
    return buckets;
  };

  const byType = roll("content_type");
  const bySection = roll("section_title");

  return {
    total_content: items.length,
    by_type: [...byType].map(([content_type, v]) => ({
      content_type,
      total: v.total,
      completed: v.completed,
    })),
    by_section: [...bySection].map(([section_title, v]) => ({
      section_title,
      total: v.total,
      completed: v.completed,
      percent: v.total === 0 ? 0 : Math.round((v.completed / v.total) * 100),
    })),
  };
}

export function useStudentDashboard() {
  const [mounted, setMounted] = useState(false);
  const [acceptedEnrollments, setAcceptedEnrollments] = useState<Enrollment[]>([]);
  const [loadingEnrolled, setLoadingEnrolled] = useState(true);
  const [error, setError] = useState("");
  
  // Filter & Search states
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [courseStatusFilter, setCourseStatusFilter] = useState<"ALL" | "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED">("ALL");
  // "recommended" went with the ranking service. Newest first is the honest
  // replacement: it is the one order this data can actually justify.
  const [courseSortOrder, setCourseSortOrder] = useState<"desc" | "asc">("desc");

  // Selected Course details for Analytics
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [quizScores, setQuizScores] = useState<any[]>([]);
  const [lessonProgress, setLessonProgress] = useState<any>(null);
  const [analyticsTab, setAnalyticsTab] = useState<"lessons" | "mastery">("lessons");

  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Load general enrollments data ─────────────────────────────────────────

  const loadAllData = useCallback(async () => {
    setLoadingEnrolled(true);
    setError("");
    try {
      const accepted = await lmsService.getMyEnrollments("ACCEPTED");
      // A course still in draft is material the centre is writing, not material
      // anyone was given. The enrolment row exists because the learner was put
      // in a class, but opening such a course answers 403 - so listing it shows
      // a card that cannot be clicked and explains nothing.
      const enrollList = (accepted || []).filter(
        (enrollment: Enrollment) => enrollment.course_status !== "DRAFT",
      );
      setAcceptedEnrollments(enrollList);

      const availableEnrollments = enrollList.filter(
        (enrollment: Enrollment) => enrollment.course_status !== "ARCHIVED",
      );

      if (availableEnrollments.length === 0) {
        setSelectedCourseId(null);
        return;
      }

      // Select first course by default for analytics
      setSelectedCourseId((prev) => {
        if (availableEnrollments.length > 0 && !prev) {
          return availableEnrollments[0].course_id;
        }
        if (prev && !availableEnrollments.some((enrollment) => enrollment.course_id === prev)) return availableEnrollments[0]?.course_id ?? null;
        return prev;
      });
    } catch (e) {
      console.error(e);
      setError("Không thể tải thông tin tiến độ học tập.");
    } finally {
      setLoadingEnrolled(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ── Load course-specific analytics ──────────────────────────────────────────

  const loadCourseAnalytics = useCallback(async (courseId: number) => {
    setLoadingAnalytics(true);
    try {
      // Was one call to /analytics/student-summary, which has not existed since
      // that handler was parked. The error was swallowed and the panel drew its
      // empty state, so for six days the screen said "no lessons in this course"
      // about courses that had them. These two endpoints are live and carry
      // between them everything the panel reads.
      const [items, scores] = await Promise.all([
        progressService.getMyCourseProgressDetail(courseId),
        analyticsService
          .getMyQuizScores(courseId)
          .then((r) => r.data)
          .catch(() => []),
      ]);

      setLessonProgress(summariseProgress(items));
      setQuizScores(scores || []);
    } catch (e) {
      console.error("Error loading course analytics:", e);
      setLessonProgress(null);
      setQuizScores([]);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadCourseAnalytics(selectedCourseId);
    }
  }, [selectedCourseId, loadCourseAnalytics]);

  // ── Computed properties (useMemo for optimal rendering) ─────────────────────

  const availableEnrollments = useMemo(
    () => acceptedEnrollments.filter((e) => e.course_status !== "ARCHIVED"),
    [acceptedEnrollments],
  );

  const completedEnrollments = useMemo(
    () => availableEnrollments.filter((e) => (e.progress_percent || 0) === 100),
    [availableEnrollments]
  );

  const inProgressEnrollments = useMemo(
    () => availableEnrollments.filter((e) => (e.progress_percent || 0) > 0 && (e.progress_percent || 0) < 100),
    [availableEnrollments]
  );

  const notStartedEnrollments = useMemo(
    () => availableEnrollments.filter((e) => (e.progress_percent || 0) === 0),
    [availableEnrollments]
  );

  const filteredAndSortedEnrollments = useMemo(() => {
    return acceptedEnrollments
      .filter((en) => {
        const matchesSearch = (en.course_title || "").toLowerCase().includes(courseSearchQuery.toLowerCase());
        if (!matchesSearch) return false;

        const progress = en.progress_percent || 0;
        if (courseStatusFilter === "NOT_STARTED") return progress === 0;
        if (courseStatusFilter === "IN_PROGRESS") return progress > 0 && progress < 100;
        if (courseStatusFilter === "COMPLETED") return progress === 100;
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.accepted_at || a.enrolled_at || 0).getTime();
        const dateB = new Date(b.accepted_at || b.enrolled_at || 0).getTime();
        return courseSortOrder === "desc" ? dateB - dateA : dateA - dateB;
      });
  }, [acceptedEnrollments, courseSearchQuery, courseStatusFilter, courseSortOrder]);

  const completedCount = completedEnrollments.length;
  const inProgressCount = inProgressEnrollments.length;
  const notStartedCount = notStartedEnrollments.length;
  const totalCount = availableEnrollments.length;

  const completedPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const inProgressPercent = totalCount > 0 ? Math.round((inProgressCount / totalCount) * 100) : 0;
  const notStartedPercent = totalCount > 0 ? Math.max(0, 100 - completedPercent - inProgressPercent) : 0;

  const focusCourse = useMemo(() => {
    // Was the ranking service's top pick, then this fallback. The fallback is
    // now the whole rule: the course they have got furthest into.
    if (inProgressEnrollments.length > 0) {
      return inProgressEnrollments.reduce(
        (max, curr) => ((curr.progress_percent || 0) > (max.progress_percent || 0) ? curr : max),
        inProgressEnrollments[0]
      );
    }
    if (notStartedEnrollments.length > 0) {
      return notStartedEnrollments[0];
    }
    return null;
  }, [inProgressEnrollments, notStartedEnrollments]);

  const currentCourse = useMemo(
    () => availableEnrollments.find((e) => e.course_id === selectedCourseId),
    [availableEnrollments, selectedCourseId]
  );

  return {
    mounted,
    acceptedEnrollments,
    loadingEnrolled,
    error,
    courseSearchQuery,
    setCourseSearchQuery,
    courseStatusFilter,
    setCourseStatusFilter,
    courseSortOrder,
    setCourseSortOrder,
    selectedCourseId,
    setSelectedCourseId,
    loadingAnalytics,
    quizScores,
    lessonProgress,
    analyticsTab,
    setAnalyticsTab,
    loadAllData,
    filteredAndSortedEnrollments,
    completedCount,
    inProgressCount,
    notStartedCount,
    totalCount,
    completedPercent,
    inProgressPercent,
    notStartedPercent,
    focusCourse,
    currentCourse,
  };
}
