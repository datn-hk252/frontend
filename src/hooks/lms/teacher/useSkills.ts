"use client";

import { useEffect, useMemo, useState } from "react";
import skillService, { type SkillNode } from "@/services/lms/skillService";
import type { SelectOption } from "@/components/lms/shared/Select";

/**
 * Loads the skill taxonomy once and shapes it for a picker.
 *
 * Sub-skill names carry their parent as a prefix ("Đọc – Ý chính") because the
 * database needs them globally unique. In a grouped picker that prefix is
 * redundant, so it is stripped from the label and used as the group heading
 * instead.
 */
export function useSkills() {
  const [skills, setSkills] = useState<SkillNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    skillService
      .listSkills()
      .then((res) => {
        if (cancelled) return;
        setSkills(res?.data ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Không tải được danh sách kỹ năng:", err);
        setError("Không tải được danh sách kỹ năng");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const options: SelectOption[] = useMemo(
    () =>
      skills.map((s) => {
        const group = s.parent_name || s.name;
        const label = s.parent_name
          ? s.name.replace(`${s.parent_name} – `, "")
          : s.name;
        return { value: String(s.id), label, group, description: s.description };
      }),
    [skills]
  );

  /** Look a skill up by id, for rendering a name next to a stored skill_id. */
  const byId = useMemo(() => {
    const map = new Map<number, SkillNode>();
    for (const s of skills) map.set(s.id, s);
    return map;
  }, [skills]);

  return { skills, options, byId, loading, error };
}
