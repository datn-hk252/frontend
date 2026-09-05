"use client";

import type { SkillScore } from "@/services/lms/skillService";

/**
 * Per-skill results as a list of horizontal bars.
 *
 * One measure, one hue: length already carries magnitude, so colouring bars by
 * their own value would encode the same thing twice. The weakest skill is
 * ordered first instead, because that is the question the teacher opens this
 * panel to answer.
 *
 * Every value is labelled directly, so the panel doubles as its own table view.
 */

interface Props {
  skills: SkillScore[];
  /** Questions in the quiz that carry no skill; shown as a caveat. */
  untaggedQuestions?: number;
  emptyHint?: string;
}

export function SkillScoreBars({ skills, untaggedQuestions = 0, emptyHint }: Props) {
  if (!skills.length) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
        {emptyHint ?? "Chưa có dữ liệu. Câu hỏi cần được gắn kỹ năng và học viên cần nộp bài."}
      </p>
    );
  }

  // Weakest first — that is what the teacher is looking for.
  const ordered = [...skills].sort((a, b) => a.percentage - b.percentage);

  return (
    <div>
      <ul className="space-y-3">
        {ordered.map((s) => (
          <li key={s.skill_id} className="flex items-center gap-3">
            <span className="w-44 shrink-0 text-sm text-slate-700 dark:text-slate-300 truncate">
              {s.skill_name}
            </span>

            <span
              className="relative flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800"
              role="img"
              aria-label={`${s.skill_name}: ${s.correct_answers} trên ${s.total_answers} câu đúng`}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-blue-600 dark:bg-blue-500"
                style={{ width: `${Math.max(0, Math.min(100, s.percentage))}%` }}
              />
            </span>

            <span className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {s.percentage.toFixed(0)}%
            </span>
            <span className="w-16 shrink-0 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {s.correct_answers}/{s.total_answers}
            </span>
          </li>
        ))}
      </ul>

      {untaggedQuestions > 0 && (
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          {untaggedQuestions} câu hỏi chưa gắn kỹ năng nên không nằm trong bảng này.
        </p>
      )}
    </div>
  );
}

export default SkillScoreBars;
