/**
 * Kieu du lieu cho bieu mau soan noi dung khoa hoc trong LMS.
 *
 * Tach ra tu types/forms/form.ts khi chuyen phan khao sat cua cau lac bo vao
 * _parked/. Hai nhom kieu nay truoc day nam chung mot tep nhung khong lien quan.
 */

import { ContentType, FileInfo } from "./course";

// ─── Content Form ─────────────────────────────────────────────────────────────

export interface ContentFormState {
  type: ContentType;
  title: string;
  description: string;
  order_index: number;
  is_mandatory: boolean;
  metadata: Record<string, any>;
}

export interface ContentFormProps {
  /** Full form state owned by ContentModal */
  formData: ContentFormState;
  /** Called whenever a field changes */
  onChange: (updates: Partial<ContentFormState>) => void;
  /** Called when a file upload completes successfully */
  onFileUploaded: (fileInfo: FileInfo) => void;
  /** Disable all inputs while a submission is in progress */
  disabled?: boolean;
}
