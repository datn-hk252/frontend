import { lmsApiClient } from "./lmsApiClient";

/**
 * Classes: FR-CLS-01..04.
 *
 * A course is the syllabus; a class is one run of it, with its own teacher,
 * timetable and roster. Two classes of the same course are how a centre offers
 * "evenings" and "mornings" without duplicating the material.
 *
 * Every write here is the admin's. A teacher may read, and the API narrows the
 * list to the classes they run, so no filtering is needed on this side.
 */

export type ClassStatus = "ACTIVE" | "FINISHED" | "CANCELLED";

export interface ClassSummary {
  id: number;
  course_id: number;
  course_title: string;
  name: string;
  teacher_id?: number;
  teacher_name?: string;
  schedule?: string;
  status: ClassStatus;
  student_count: number;
  created_at: string;
  updated_at: string;
}

/** A learner who left part-way keeps their place on the roster, marked DROPPED. */
export type RosterStatus = "ACTIVE" | "DROPPED";

export interface ClassStudent {
  student_id: number;
  full_name: string;
  email: string;
  joined_at: string;
  status: RosterStatus;
  left_at?: string;
}

export interface ClassDetail extends ClassSummary {
  students: ClassStudent[];
}

export interface CreateClassPayload {
  course_id: number;
  name: string;
  teacher_id?: number;
  schedule?: string;
}

export interface UpdateClassPayload {
  name?: string;
  /** 0 detaches the class from its teacher rather than pointing at user 0. */
  teacher_id?: number;
  schedule?: string;
  status?: ClassStatus;
}

export interface AddStudentsResult {
  added: number;
  skipped: number;
  errors?: string[];
}

class ClassService {
  async list(): Promise<ClassSummary[]> {
    const response = await lmsApiClient.get("/classes");
    return response.data?.data ?? [];
  }

  async get(classId: number): Promise<ClassDetail> {
    const response = await lmsApiClient.get(`/classes/${classId}`);
    return response.data?.data;
  }

  async create(payload: CreateClassPayload): Promise<ClassSummary> {
    const response = await lmsApiClient.post("/classes", payload);
    return response.data?.data;
  }

  async update(classId: number, payload: UpdateClassPayload): Promise<ClassSummary> {
    const response = await lmsApiClient.put(`/classes/${classId}`, payload);
    return response.data?.data;
  }

  async remove(classId: number): Promise<void> {
    await lmsApiClient.delete(`/classes/${classId}`);
  }

  async addStudent(classId: number, studentId: number): Promise<void> {
    await lmsApiClient.post(`/classes/${classId}/students`, { student_id: studentId });
  }

  /** Fills a roster in one call; a bad id is reported, not fatal to the rest. */
  async addStudents(classId: number, studentIds: number[]): Promise<AddStudentsResult> {
    const response = await lmsApiClient.post(`/classes/${classId}/students/bulk`, {
      student_ids: studentIds,
    });
    return response.data?.data;
  }

  /** Removing says the learner was never in this class - a mis-assignment. */
  async removeStudent(classId: number, studentId: number): Promise<void> {
    await lmsApiClient.delete(`/classes/${classId}/students/${studentId}`);
  }

  /**
   * Dropping says they were, and left. The row stays so the centre can still
   * answer which class they attended; only course access follows the change.
   */
  async setStudentStatus(
    classId: number,
    studentId: number,
    status: RosterStatus
  ): Promise<void> {
    await lmsApiClient.put(`/classes/${classId}/students/${studentId}/status`, { status });
  }
}

const classService = new ClassService();
export default classService;
