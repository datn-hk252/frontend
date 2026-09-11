"use client";

import { useEffect, useState } from "react";
import BaseModal from "@/components/lms/shared/BaseModal";
import { Input, Select, PrimaryBtn, SecondaryBtn, Alert } from "@/components/lms/shared";
import classService, { type ClassSummary } from "@/services/lms/classService";

interface CourseOption {
  id: number;
  title: string;
}

interface TeacherOption {
  id: number | string;
  name: string;
}

/**
 * Create a class, or change one. FR-CLS-01 and FR-CLS-03.
 *
 * The course cannot be changed after creation: moving a class to another course
 * would leave its roster enrolled in material nobody assigned them, so a new
 * class is the honest way to make that change.
 */
export function ClassFormModal({
  open,
  editing,
  courses,
  teachers,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** null when creating. */
  editing: ClassSummary | null;
  courses: CourseOption[];
  teachers: TeacherOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [courseId, setCourseId] = useState("");
  const [name, setName] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [schedule, setSchedule] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setCourseId(String(editing.course_id));
      setName(editing.name);
      setTeacherId(editing.teacher_id ? String(editing.teacher_id) : "");
      setSchedule(editing.schedule ?? "");
      setStatus(editing.status);
    } else {
      setCourseId("");
      setName("");
      setTeacherId("");
      setSchedule("");
      setStatus("ACTIVE");
    }
  }, [open, editing]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Vui lòng nhập tên lớp.");
      return;
    }
    if (!editing && !courseId) {
      setError("Vui lòng chọn khóa học cho lớp này.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await classService.update(editing.id, {
          name: name.trim(),
          // 0 detaches the teacher; the API reads it that way rather than as a
          // user id, so "chưa gán" round-trips properly.
          teacher_id: teacherId ? Number(teacherId) : 0,
          schedule: schedule.trim(),
          status: status as ClassSummary["status"],
        });
      } else {
        await classService.create({
          course_id: Number(courseId),
          name: name.trim(),
          teacher_id: teacherId ? Number(teacherId) : undefined,
          schedule: schedule.trim() || undefined,
        });
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message ?? "Không lưu được lớp học.");
    } finally {
      setSaving(false);
    }
  };

  const teacherOptions = [
    { value: "", label: "Chưa gán giáo viên" },
    ...teachers.map((t) => ({ value: String(t.id), label: t.name })),
  ];

  return (
    <BaseModal
      isOpen={open}
      onClose={onClose}
      title={editing ? "Sửa lớp học" : "Tạo lớp học"}
      description={
        editing
          ? `Khóa học: ${editing.course_title}`
          : "Một lớp là một lần chạy của khóa học, có giáo viên và thời khóa riêng."
      }
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <SecondaryBtn onClick={onClose} disabled={saving}>
            Hủy
          </SecondaryBtn>
          <PrimaryBtn onClick={handleSave} disabled={saving}>
            {saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo lớp"}
          </PrimaryBtn>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}

        {!editing && (
          <Select
            label="Khóa học"
            required
            value={courseId}
            onValueChange={setCourseId}
            placeholder="Chọn khóa học làm giáo trình"
            options={courses.map((c) => ({ value: String(c.id), label: c.title }))}
          />
        )}

        <Input
          label="Tên lớp"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ca tối T2-4-6"
          hint="Dùng để phân biệt các lớp cùng một khóa học."
        />

        <Select
          label="Giáo viên phụ trách"
          value={teacherId}
          onValueChange={setTeacherId}
          placeholder="Chưa gán giáo viên"
          options={teacherOptions}
        />

        <Input
          label="Thời khóa"
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          placeholder="19:00 - 21:00, thứ 2/4/6"
        />

        {editing && (
          <Select
            label="Trạng thái"
            value={status}
            onValueChange={setStatus}
            options={[
              { value: "ACTIVE", label: "Đang học" },
              { value: "FINISHED", label: "Đã kết thúc" },
              { value: "CANCELLED", label: "Đã hủy" },
            ]}
          />
        )}
      </div>
    </BaseModal>
  );
}

export default ClassFormModal;
