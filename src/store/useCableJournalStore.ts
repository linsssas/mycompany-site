import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CableJournalProject, CableRow, createEmptyRow } from "@/lib/cable/types";

interface CableJournalState extends CableJournalProject {
  setProjectName: (name: string) => void;
  setReservePercent: (value: number) => void;
  addRow: () => void;
  duplicateRow: (id: string) => void;
  removeRow: (id: string) => void;
  updateRow: (id: string, patch: Partial<Omit<CableRow, "id">>) => void;
  moveRow: (id: string, direction: -1 | 1) => void;
  resetProject: () => void;
}

function initialRows(): CableRow[] {
  return [createEmptyRow()];
}

export const useCableJournalStore = create<CableJournalState>()(
  persist(
    (set, get) => ({
      projectName: "Кабельный журнал №1",
      reservePercent: 3,
      rows: initialRows(),

      setProjectName: (projectName) => set({ projectName }),
      setReservePercent: (reservePercent) => set({ reservePercent: Math.max(0, Math.min(50, reservePercent)) }),

      addRow: () => set({ rows: [...get().rows, createEmptyRow()] }),

      duplicateRow: (id) => {
        const rows = get().rows;
        const index = rows.findIndex((r) => r.id === id);
        if (index === -1) return;
        const copy: CableRow = { ...rows[index], id: crypto.randomUUID() };
        set({ rows: [...rows.slice(0, index + 1), copy, ...rows.slice(index + 1)] });
      },

      removeRow: (id) => {
        const rows = get().rows.filter((r) => r.id !== id);
        set({ rows: rows.length > 0 ? rows : initialRows() });
      },

      updateRow: (id, patch) =>
        set({ rows: get().rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) }),

      moveRow: (id, direction) => {
        const rows = [...get().rows];
        const index = rows.findIndex((r) => r.id === id);
        const target = index + direction;
        if (index === -1 || target < 0 || target >= rows.length) return;
        [rows[index], rows[target]] = [rows[target], rows[index]];
        set({ rows });
      },

      resetProject: () => set({ projectName: "Кабельный журнал №1", reservePercent: 3, rows: initialRows() }),
    }),
    { name: "cable-journal-project" },
  ),
);
