"use client";

import type { SkillTrendSeries } from "@/services/lms/skillService";

/**
 * One student's skill scores over time, as small multiples.
 *
 * A course can carry up to nineteen skills. Nineteen lines on one pair of axes
 * would need nineteen hues, well past the point where any palette stays
 * distinguishable, so each skill gets its own little chart instead. Every panel
 * is then a single series on a fixed 0-100 axis, which keeps one hue throughout
 * and makes the panels directly comparable to each other.
 */

interface Props {
  series: SkillTrendSeries[];
  emptyHint?: string;
  /** Force one column, for narrow containers such as a side panel. */
  compact?: boolean;
}

const W = 220;
const H = 56;
const PAD = 6;

function pathFor(values: number[]): string {
  if (values.length === 0) return "";
  const stepX = values.length > 1 ? (W - PAD * 2) / (values.length - 1) : 0;
  const y = (v: number) => PAD + (1 - Math.max(0, Math.min(100, v)) / 100) * (H - PAD * 2);
  return values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${PAD + i * stepX} ${y(v)}`)
    .join(" ");
}

export function SkillTrendSparklines({ series, emptyHint, compact = false }: Props) {
  if (!series.length) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
        {emptyHint ?? "Học viên chưa có bài nộp nào trong khóa học này."}
      </p>
    );
  }

  return (
    <div className={compact ? "grid gap-4" : "grid gap-5 sm:grid-cols-2 xl:grid-cols-3"}>
      {series.map((s) => {
        const values = s.points.map((p) => p.percentage);
        const last = values[values.length - 1] ?? 0;
        const first = values[0] ?? 0;
        const delta = last - first;
        const stepX = values.length > 1 ? (W - PAD * 2) / (values.length - 1) : 0;
        const yOf = (v: number) =>
          PAD + (1 - Math.max(0, Math.min(100, v)) / 100) * (H - PAD * 2);

        return (
          <figure
            key={s.skill_id}
            className="rounded-xl border border-slate-200 dark:border-slate-800 p-4"
          >
            <figcaption className="flex items-baseline justify-between gap-2 mb-2">
              <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                {s.skill_name}
              </span>
              <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {last.toFixed(0)}%
              </span>
            </figcaption>

            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full h-14"
              role="img"
              aria-label={`${s.skill_name}: ${values
                .map((v) => `${v.toFixed(0)}%`)
                .join(", ")}`}
            >
              {/* Recessive 50% guide, so a lone panel still has a reference */}
              <line
                x1={PAD} x2={W - PAD} y1={yOf(50)} y2={yOf(50)}
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeWidth={1}
              />
              <path
                d={pathFor(values)}
                fill="none"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-blue-600 dark:stroke-blue-500"
              />
              {values.map((v, i) => (
                <circle
                  key={i}
                  cx={PAD + i * stepX}
                  cy={yOf(v)}
                  r={3.5}
                  className="fill-blue-600 dark:fill-blue-500 stroke-white dark:stroke-slate-900"
                  strokeWidth={2}
                >
                  <title>
                    {s.points[i].quiz_title}
                    {s.points[i].submitted_at
                      ? ` · ${s.points[i].submitted_at!.slice(0, 10)}`
                      : ""}
                    {` · ${s.points[i].correct_answers}/${s.points[i].total_answers} câu đúng`}
                  </title>
                </circle>
              ))}
            </svg>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {values.length} bài
              {values.length > 1 && (
                <>
                  {" · "}
                  {delta > 0 ? "tăng" : delta < 0 ? "giảm" : "không đổi"}
                  {delta !== 0 && ` ${Math.abs(delta).toFixed(0)} điểm phần trăm`}
                </>
              )}
            </p>
          </figure>
        );
      })}
    </div>
  );
}

export default SkillTrendSparklines;
