"use client";

import { useProjectStore } from "@/store/useProjectStore";
import { COUNTRIES, regionsByCountry, citiesByRegion } from "@/lib/calc/region";
import NumberField from "./NumberField";
import SelectField from "./SelectField";
import Card from "../Card";

export default function LocationForm() {
  const location = useProjectStore((s) => s.location);
  const setLocation = useProjectStore((s) => s.setLocation);
  const climate = useProjectStore((s) => s.results.climate);

  const regions = regionsByCountry(location.country);
  const cities = citiesByRegion(location.country, location.region);

  return (
    <Card title="4. Район строительства">
      <div className="mb-3 flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={location.useGps} onChange={(e) => setLocation({ useGps: e.target.checked })} />
          Задать GPS-координатами
        </label>
      </div>

      {location.useGps ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumberField label="Широта" step={0.0001} value={location.lat ?? 0} onChange={(v) => setLocation({ lat: v })} />
          <NumberField label="Долгота" step={0.0001} value={location.lon ?? 0} onChange={(v) => setLocation({ lon: v })} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <SelectField label="Страна" value={location.country} options={COUNTRIES.map((c) => ({ value: c, label: c }))} onChange={(v) => setLocation({ country: v, region: regionsByCountry(v)[0], city: "" })} />
          <SelectField label="Область" value={location.region} options={regions.map((r) => ({ value: r, label: r }))} onChange={(v) => setLocation({ region: v, city: citiesByRegion(location.country, v)[0]?.city ?? "" })} />
          <SelectField label="Город" value={location.city} options={cities.map((c) => ({ value: c.city, label: c.city }))} onChange={(v) => setLocation({ city: v })} />
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-md bg-zinc-50 p-3 text-sm dark:bg-zinc-800/50 sm:grid-cols-3 lg:grid-cols-5">
        <div>
          <div className="text-zinc-500">Снеговой район</div>
          <div className="font-mono font-semibold">{climate.snowRegion}</div>
        </div>
        <div>
          <div className="text-zinc-500">Ветровой район</div>
          <div className="font-mono font-semibold">{climate.windRegion}</div>
        </div>
        <div>
          <div className="text-zinc-500">S0</div>
          <div className="font-mono font-semibold">{climate.s0.toFixed(2)} кПа</div>
        </div>
        <div>
          <div className="text-zinc-500">W0</div>
          <div className="font-mono font-semibold">{climate.w0.toFixed(2)} кПа</div>
        </div>
        <div>
          <div className="text-zinc-500">Категория местности</div>
          <div className="font-mono font-semibold">{climate.terrainCategory}</div>
        </div>
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        Значения приведены по справочной базе для демонстрации методики расчета. Перед выпуском РД уточните S0/W0 по действующей карте районирования СП РК.
      </p>
    </Card>
  );
}
