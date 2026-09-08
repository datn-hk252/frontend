"use client";

import { Sparkles } from "lucide-react";

/**
 * Onboarding banner for a student with no progress yet.
 *
 * Lifted out of SkillMasteryOverview when that component was parked: the
 * overview needed the personalised-learning API, this banner is plain markup
 * and still earns its place on the dashboard.
 */
export function StartLearningBanner() {
  return (
    <div className="bg-white dark:bg-[#0F1E35] border border-slate-200 dark:border-blue-500/10 rounded-2xl p-8 text-center shadow-sm">
      <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
        <Sparkles className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 leading-tight">
        Bắt đầu hành trình học tập!
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Hoàn thành bài học đầu tiên để theo dõi tiến độ kỹ năng của bạn.
      </p>
    </div>
  );
}

export default StartLearningBanner;
