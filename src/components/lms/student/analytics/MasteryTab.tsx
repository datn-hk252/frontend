"use client";

import { Award } from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

interface MasteryTabProps {
  quizScores: any[];
  mounted: boolean;
}

export function MasteryTab({
  quizScores,
  mounted,
}: MasteryTabProps) {

  return (
    <div className="space-y-6" role="tabpanel">
      {/* Hàng 2: Concept check & SM-2 Quiz (Split Metrics Row) */}

      {/* Hàng 3: Quiz results (Split Panel) */}
      <div className="bg-white dark:bg-[#0F1E35] border border-slate-200 dark:border-blue-500/12 rounded-2xl p-5 shadow-sm dark:shadow-none hover:shadow-md dark:hover:border-blue-500/25 transition-all duration-300">
        <div className="flex flex-col h-[320px] justify-between">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 dark:bg-amber-955/40 rounded-xl">
              <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h4 className="font-bold text-slate-855 dark:text-slate-200 text-sm">
                Điểm thi & Quiz cao nhất đạt được
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Kết quả tốt nhất của bạn qua các bài kiểm tra</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col md:flex-row gap-6 items-stretch min-h-0">
            {/* Chart Area */}
            <div className="flex-1 min-h-0">
              {quizScores.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <Award className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-xs text-slate-500">Chưa làm bài trắc nghiệm nào trong khóa học này.</p>
                </div>
              ) : (
                <div className="h-full overflow-auto pr-1 w-full relative scrollbar-thin">
                  {mounted && (
                    <ResponsiveContainer width="100%" height={Math.max(160, quizScores.length * 40)}>
                      <BarChart
                        layout="vertical"
                        data={quizScores.map((q) => ({
                          name: q.quiz_title,
                          "Điểm (%)": q.best_percentage || 0,
                        }))}
                        margin={{ left: 10, right: 10, top: 0, bottom: 0 }}
                      >
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: "#64748b" }} width={120} />
                        <Tooltip formatter={(value) => `${value}%`} contentStyle={{ fontSize: "12px", borderRadius: "16px", background: "rgba(15, 30, 53, 0.95)", backdropFilter: "blur(12px)", border: "1px solid rgba(59,130,246,0.2)", color: "#fff" }} />
                        <Bar dataKey="Điểm (%)" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}
            </div>

            {/* List Detail Area */}
            {quizScores.length > 0 && (
              <div className="w-full md:w-[280px] flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-200/60 dark:border-blue-500/10 pt-3 md:pt-0 md:pl-4">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 block uppercase">Chi tiết điểm trắc nghiệm</span>
                <div className="space-y-1.5 overflow-y-auto max-h-[160px] pr-1 scrollbar-thin">
                  {quizScores.slice(0, 4).map((q) => (
                    <div key={q.quiz_id} className="group flex items-center justify-between text-xs py-1.5 px-2 border-b border-slate-200/40 dark:border-blue-500/5 transition-colors hover:bg-slate-100/30 dark:hover:bg-[#12223a]/25 rounded-lg">
                      <span className="font-semibold text-slate-700 dark:text-slate-350 truncate max-w-[140px] group-hover:text-amber-600 dark:group-hover:text-cyan-405 transition-colors" title={q.quiz_title}>{q.quiz_title}</span>
                      <span className={`font-bold text-xs ${
                        q.best_percentage === null 
                          ? "text-slate-400 dark:text-slate-550" 
                          : q.is_passed 
                            ? "text-emerald-605 dark:text-emerald-400" 
                            : "text-red-500 dark:text-red-450"
                      }`}>
                        {q.best_percentage !== null ? `${Math.round(q.best_percentage)}%` : "Chưa làm"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
