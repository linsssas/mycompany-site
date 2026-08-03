"use client";

import { useProjectStore } from "@/store/useProjectStore";

const CONTACT_EMAIL = "linar.caser@gmail.com";

export default function LeadCTA() {
  const projectName = useProjectStore((s) => s.projectName);
  const geometry = useProjectStore((s) => s.geometry);
  const location = useProjectStore((s) => s.location);
  const results = useProjectStore((s) => s.results);

  const handleRequest = () => {
    const subject = `Заявка на расчет опор СЭС — ${projectName}`;
    const body = [
      "Здравствуйте! Прошу подготовить сертифицированный расчет и коммерческое предложение по проекту.",
      "",
      `Проект: ${projectName}`,
      `Регион: ${location.region || "—"}, ${location.city || "—"}`,
      `Габариты (Д×Ш×В): ${geometry.totalLength} × ${geometry.totalWidth} × ${geometry.totalHeight} мм`,
      `Угол наклона панелей: ${geometry.tiltAngle}°`,
      `Стоек: ${geometry.postCount}, пролетов: ${geometry.spanCount}`,
      `Макс. коэффициент использования (предварительный расчет): ${(results.maxUtilization * 100).toFixed(0)}% (${results.overallColor})`,
      "",
      "Пожалуйста, свяжитесь со мной для уточнения деталей.",
    ].join("\n");

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
      <h3 className="mb-1 text-sm font-semibold text-blue-900 dark:text-blue-200">
        Нужен сертифицированный расчет или изготовление конструкций под этот проект?
      </h3>
      <p className="mb-3 text-sm text-blue-800/80 dark:text-blue-300/80">
        Этот калькулятор дает предварительную оценку. Наши инженеры выполнят проверенный расчет по
        действующим нормам и подготовят коммерческое предложение на изготовление металлоконструкций
        по параметрам вашего проекта — с указанными выше данными в заявке.
      </p>
      <button
        onClick={handleRequest}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Отправить заявку по email
      </button>
    </div>
  );
}
