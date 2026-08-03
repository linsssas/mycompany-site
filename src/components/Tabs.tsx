"use client";

import { useState } from "react";

interface TabsProps {
  tabs: { key: string; label: string; content: React.ReactNode }[];
}

export default function Tabs({ tabs }: TabsProps) {
  const [active, setActive] = useState(tabs[0].key);
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`rounded-t-md px-3 py-2 text-sm font-medium transition-colors ${
              active === t.key
                ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.key} className={t.key === active ? "block" : "hidden"}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
