import type { Metadata } from "next";
import SolarApp from "@/components/solar/SolarApp";

export const metadata: Metadata = {
  title: "Расчёт снеговой и ветровой нагрузки на опору солнечных панелей",
  description:
    "Параметрический расчёт опоры солнечных панелей: снеговая и ветровая нагрузка по СП РК EN 1991-1-3 / 1991-1-4, " +
    "проверки тонкостенных профилей по EN 1993-1-3, болтовые узлы, стойка в грунте, спецификация, экспорт в PDF и Excel.",
};

export default function SolarSupportPage() {
  return <SolarApp />;
}
