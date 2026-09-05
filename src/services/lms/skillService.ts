import { lmsApiClient } from "./lmsApiClient";

/**
 * Skill taxonomy and the per-skill breakdown of quiz results.
 *
 * A quiz result used to be a single total score, which cannot say where a
 * student is weak. Every question now carries the skill it measures, so a
 * submitted attempt can be split across skills. These screens are teacher-only.
 */

/** One entry of the skill tree. Roots have no parent_id. */
export interface SkillNode {
  id: number;
  code: string;
  name: string;
  description?: string;
  parent_id?: number;
  parent_name?: string;
}

/** Aggregate result on one skill. */
export interface SkillScore {
  skill_id: number;
  skill_name: string;
  parent_skill?: string;
  total_answers: number;
  correct_answers: number;
  points_earned: number;
  points_possible: number;
  percentage: number;
}

export interface StudentQuizSkillBreakdown {
  student_id: number;
  student_name: string;
  quiz_id: number;
  quiz_title: string;
  submitted_at?: string;
  /** Questions with no skill tag; the breakdown does not cover these. */
  untagged_questions: number;
  skills: SkillScore[];
}

export interface ClassQuizSkillBreakdown {
  quiz_id: number;
  quiz_title: string;
  student_count: number;
  untagged_questions: number;
  skills: SkillScore[];
}

export interface SkillTrendPoint {
  quiz_id: number;
  quiz_title: string;
  submitted_at?: string;
  total_answers: number;
  correct_answers: number;
  percentage: number;
}

export interface SkillTrendSeries {
  skill_id: number;
  skill_name: string;
  parent_skill?: string;
  points: SkillTrendPoint[];
}

export interface StudentSkillTrend {
  student_id: number;
  course_id: number;
  series: SkillTrendSeries[];
}

class SkillService {
  /** The whole skill tree, roots and children, ordered for grouped display. */
  async listSkills() {
    const response = await lmsApiClient.get("/skills");
    return response.data;
  }

  /** Class-wide breakdown for one quiz. */
  async getClassBreakdown(courseId: number, quizId: number) {
    const response = await lmsApiClient.get(
      `/courses/${courseId}/quizzes/${quizId}/skill-breakdown`
    );
    return response.data;
  }

  /** One student's breakdown for one quiz. */
  async getStudentBreakdown(courseId: number, quizId: number, studentId: number) {
    const response = await lmsApiClient.get(
      `/courses/${courseId}/quizzes/${quizId}/skill-breakdown/students/${studentId}`
    );
    return response.data;
  }

  /** One student's skill scores across every quiz of a course. */
  async getStudentTrend(courseId: number, studentId: number) {
    const response = await lmsApiClient.get(
      `/courses/${courseId}/skill-trend/students/${studentId}`
    );
    return response.data;
  }
}

const skillService = new SkillService();
export default skillService;
