import { ProfileAssignment, SectionProperties } from "./types";
import { findProfile } from "./profiles";

export function resolveSection(assignment: ProfileAssignment): SectionProperties {
  if (assignment.sectionKey) {
    const s = findProfile(assignment.sectionKey);
    if (s) return s;
  }
  if (assignment.custom) return assignment.custom;
  throw new Error(`Профиль не назначен для роли ${assignment.role}`);
}
