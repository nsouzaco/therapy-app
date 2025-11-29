import type { PlanContent, Goal, Intervention, Homework, Strength } from "@/lib/types/plan";

export type DiffType = "added" | "removed" | "changed" | "unchanged";

export interface FieldDiff {
  field: string;
  type: DiffType;
  oldValue?: string;
  newValue?: string;
}

export interface ArrayItemDiff<T> {
  id: string;
  type: DiffType;
  oldItem?: T;
  newItem?: T;
  fieldChanges?: FieldDiff[];
}

export interface PlanDiff {
  presenting_concerns: {
    clinical: FieldDiff;
    client_facing: FieldDiff;
  };
  clinical_impressions: {
    clinical: FieldDiff;
    client_facing: FieldDiff;
  };
  goals: ArrayItemDiff<Goal>[];
  interventions: ArrayItemDiff<Intervention>[];
  homework: ArrayItemDiff<Homework>[];
  strengths: ArrayItemDiff<Strength>[];
  risk_factors: {
    level: FieldDiff;
    notes: FieldDiff;
  };
  summary: {
    added: number;
    removed: number;
    changed: number;
    unchanged: number;
  };
}

/**
 * Compare two strings and return diff type
 */
function compareStrings(oldVal: string | undefined, newVal: string | undefined): DiffType {
  if (oldVal === newVal) return "unchanged";
  if (!oldVal && newVal) return "added";
  if (oldVal && !newVal) return "removed";
  return "changed";
}

/**
 * Create a field diff object
 */
function createFieldDiff(field: string, oldVal?: string, newVal?: string): FieldDiff {
  return {
    field,
    type: compareStrings(oldVal, newVal),
    oldValue: oldVal,
    newValue: newVal,
  };
}

/**
 * Compare arrays of items with IDs
 */
function compareArrays<T extends { id: string }>(
  oldItems: T[] | undefined,
  newItems: T[] | undefined,
  compareItem: (oldItem: T, newItem: T) => FieldDiff[]
): ArrayItemDiff<T>[] {
  const diffs: ArrayItemDiff<T>[] = [];
  const oldMap = new Map((oldItems || []).map(item => [item.id, item]));
  const newMap = new Map((newItems || []).map(item => [item.id, item]));
  const allIds = Array.from(new Set([...Array.from(oldMap.keys()), ...Array.from(newMap.keys())]));

  for (const id of allIds) {
    const oldItem = oldMap.get(id);
    const newItem = newMap.get(id);

    if (!oldItem && newItem) {
      diffs.push({ id, type: "added", newItem });
    } else if (oldItem && !newItem) {
      diffs.push({ id, type: "removed", oldItem });
    } else if (oldItem && newItem) {
      const fieldChanges = compareItem(oldItem, newItem);
      const hasChanges = fieldChanges.some(f => f.type !== "unchanged");
      diffs.push({
        id,
        type: hasChanges ? "changed" : "unchanged",
        oldItem,
        newItem,
        fieldChanges,
      });
    }
  }

  return diffs;
}

/**
 * Compare two plan versions and generate a diff
 */
export function comparePlanVersions(
  oldPlan: PlanContent | null,
  newPlan: PlanContent
): PlanDiff {
  const diff: PlanDiff = {
    presenting_concerns: {
      clinical: createFieldDiff(
        "clinical",
        oldPlan?.presenting_concerns?.clinical,
        newPlan.presenting_concerns?.clinical
      ),
      client_facing: createFieldDiff(
        "client_facing",
        oldPlan?.presenting_concerns?.client_facing,
        newPlan.presenting_concerns?.client_facing
      ),
    },
    clinical_impressions: {
      clinical: createFieldDiff(
        "clinical",
        oldPlan?.clinical_impressions?.clinical,
        newPlan.clinical_impressions?.clinical
      ),
      client_facing: createFieldDiff(
        "client_facing",
        oldPlan?.clinical_impressions?.client_facing,
        newPlan.clinical_impressions?.client_facing
      ),
    },
    goals: compareArrays(oldPlan?.goals, newPlan.goals, (old, curr) => [
      createFieldDiff("goal", old.goal, curr.goal),
      createFieldDiff("type", old.type, curr.type),
      createFieldDiff("client_facing", old.client_facing, curr.client_facing),
      createFieldDiff("target_date", old.target_date, curr.target_date),
    ]),
    interventions: compareArrays(oldPlan?.interventions, newPlan.interventions, (old, curr) => [
      createFieldDiff("name", old.name, curr.name),
      createFieldDiff("description", old.description, curr.description),
      createFieldDiff("frequency", old.frequency, curr.frequency),
      createFieldDiff("client_facing", old.client_facing, curr.client_facing),
    ]),
    homework: compareArrays(oldPlan?.homework, newPlan.homework, (old, curr) => [
      createFieldDiff("task", old.task, curr.task),
      createFieldDiff("purpose", old.purpose, curr.purpose),
      createFieldDiff("due_date", old.due_date, curr.due_date),
    ]),
    strengths: compareArrays(oldPlan?.strengths, newPlan.strengths, (old, curr) => [
      createFieldDiff("strength", old.strength, curr.strength),
      createFieldDiff("how_to_leverage", old.how_to_leverage, curr.how_to_leverage),
    ]),
    risk_factors: {
      level: createFieldDiff(
        "level",
        oldPlan?.risk_factors?.level,
        newPlan.risk_factors?.level
      ),
      notes: createFieldDiff(
        "notes",
        oldPlan?.risk_factors?.notes,
        newPlan.risk_factors?.notes
      ),
    },
    summary: { added: 0, removed: 0, changed: 0, unchanged: 0 },
  };

  // Calculate summary
  const countDiffs = (items: ArrayItemDiff<unknown>[]) => {
    for (const item of items) {
      diff.summary[item.type]++;
    }
  };

  countDiffs(diff.goals);
  countDiffs(diff.interventions);
  countDiffs(diff.homework);
  countDiffs(diff.strengths);

  // Count field changes
  const countFieldDiff = (field: FieldDiff) => {
    if (field.type !== "unchanged") diff.summary[field.type]++;
  };

  countFieldDiff(diff.presenting_concerns.clinical);
  countFieldDiff(diff.presenting_concerns.client_facing);
  countFieldDiff(diff.clinical_impressions.clinical);
  countFieldDiff(diff.clinical_impressions.client_facing);
  countFieldDiff(diff.risk_factors.level);
  countFieldDiff(diff.risk_factors.notes);

  return diff;
}

/**
 * Get a human-readable summary of changes
 */
export function getDiffSummary(diff: PlanDiff): string {
  const parts: string[] = [];
  
  if (diff.summary.added > 0) {
    parts.push(`${diff.summary.added} added`);
  }
  if (diff.summary.removed > 0) {
    parts.push(`${diff.summary.removed} removed`);
  }
  if (diff.summary.changed > 0) {
    parts.push(`${diff.summary.changed} changed`);
  }
  
  if (parts.length === 0) {
    return "No changes";
  }
  
  return parts.join(", ");
}

