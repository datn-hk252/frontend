"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { lmsService } from "@/services/lms/lmsService";
import { analyticsService } from "@/services/lms/analyticsService";
import progressService, { type ProgressDetailItem } from "@/services/lms/progressService";
import { Enrollment } from "@/types";
import {
  getRecommendations,
  getLearningPreferenceProfile,
  trackRecommendationEvent,
  type LearningPreferenceProfile,
  type RecommendationItem,
} from "@/services/lms/recommendationService";

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
  const [courseSortOrder, setCourseSortOrder] = useState<"recommended" | "desc" | "asc">("recommended");
  const [courseRecommendations, setCourseRecommendations] = useState<RecommendationItem[]>([]);
  const [courseRecommendationSetId, setCourseRecommendationSetId] = useState<string | null>(null);

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
      const [accepted, profile] = await Promise.all([
        lmsService.getMyEnrollments("ACCEPTED"),
        getLearningPreferenceProfile().catch((): LearningPreferenceProfile => ({
          interested_categories: [],
          profile_available: false,
        })),
      ]);
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
        setCourseRecommendations([]);
        setCourseRecommendationSetId(null);
        setSelectedCourseId(null);
        return;
      }

      try {
        const recommendationSet = await getRecommendations({
          surface: "dashboard",
          limit: Math.min(50, Math.max(1, availableEnrollments.length)),
          goal: profile.target_career || undefined,
          interestedCategories: profile.interested_categories,
          experienceLevel: profile.experience_level || undefined,
          profileResolved: true,
          candidates: availableEnrollments.map((enrollment: Enrollment) => ({
            entity_id: enrollment.course_id,
            title: enrollment.course_title ?? `Khóa học #${enrollment.course_id}`,
            description: enrollment.course_description,
            category: enrollment.course_category,
            level: enrollment.course_level,
            enrolled: true,
            progress_percent: enrollment.progress_percent ?? 0,
            published_at: enrollment.course_published_at,
            updated_at: enrollment.course_updated_at,
            last_activity_at: enrollment.last_activity_at,
            new_content_count: enrollment.new_content_count ?? 0,
            href: `/lms/student/courses/${enrollment.course_id}/learn`,
          })),
        });
        setCourseRecommendations(recommendationSet.items);
        setCourseRecommendationSetId(recommendationSet.recommendation_set_id);
        const topItem = recommendationSet.items[0];
        if (topItem) {
          trackRecommendationEvent(topItem, recommendationSet.recommendation_set_id, "impression", "dashboard");
        }
      } catch (recommendationError) {
        // Enrollment rendering remains available when the ranking service is down.
        console.warn("Recommendation ranking unavailable, using enrollment order", recommendationError);
        setCourseRecommendations([]);
        setCourseRecommendationSetId(null);
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
        if (courseSortOrder === "recommended") {
          const rankByCourse = new Map(
            courseRecommendations.map((item) => [item.entity.course_id, item.rank])
          );
          return (rankByCourse.get(a.course_id) ?? Number.MAX_SAFE_INTEGER)
            - (rankByCourse.get(b.course_id) ?? Number.MAX_SAFE_INTEGER);
        }
        const dateA = new Date(a.accepted_at || a.enrolled_at || 0).getTime();
        const dateB = new Date(b.accepted_at || b.enrolled_at || 0).getTime();
        return courseSortOrder === "desc" ? dateB - dateA : dateA - dateB;
      });
  }, [acceptedEnrollments, courseSearchQuery, courseStatusFilter, courseSortOrder, courseRecommendations]);

  const completedCount = completedEnrollments.length;
  const inProgressCount = inProgressEnrollments.length;
  const notStartedCount = notStartedEnrollments.length;
  const totalCount = availableEnrollments.length;

  const completedPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const inProgressPercent = totalCount > 0 ? Math.round((inProgressCount / totalCount) * 100) : 0;
  const notStartedPercent = totalCount > 0 ? Math.max(0, 100 - completedPercent - inProgressPercent) : 0;

  const focusCourse = useMemo(() => {
    const recommendedCourseId = courseRecommendations[0]?.entity.course_id;
    const recommendedCourse = availableEnrollments.find((enrollment) => enrollment.course_id === recommendedCourseId);
    if (recommendedCourse) return recommendedCourse;
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
  }, [availableEnrollments, courseRecommendations, inProgressEnrollments, notStartedEnrollments]);

  const focusRecommendation = useMemo(
    () => courseRecommendations.find((item) => item.entity.course_id === focusCourse?.course_id) ?? null,
    [courseRecommendations, focusCourse]
  );

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
    focusRecommendation,
    courseRecommendationSetId,
    courseRecommendations,
    currentCourse,
  };
}
