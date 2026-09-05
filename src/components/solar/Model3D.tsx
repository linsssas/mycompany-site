"use client";

import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import { useSolarStore } from "@/store/useSolarStore";
import { Card } from "./ui/layout";
import { MemberRole, MEMBER_ROLE_LABELS, MEMBER_ROLES } from "@/lib/solar/types";
import { fmt } from "@/lib/solar/units";

const MM = 0.001; // мм → м

/** Цвет по коэффициенту использования: зелёный → жёлтый → красный. */
function utilizationColor(u: number): string {
  if (!isFinite(u)) return "#71717a";
  const t = Math.max(0, Math.min(1, u));
  if (u > 1) return "#dc2626";
  // 0 → зелёный, 0.85 → жёлтый, 1 → оранжевый
  if (t < 0.85) {
    const k = t / 0.85;
    return mix("#16a34a", "#eab308", k);
  }
  return mix("#eab308", "#f97316", (t - 0.85) / 0.15);
}

function mix(a: string, b: string, k: number): string {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  return `#${ca.lerp(cb, Math.max(0, Math.min(1, k))).getHexString()}`;
}

function Member({
  a,
  b,
  size,
  color,
}: {
  a: [number, number, number];
  b: [number, number, number];
  size: number;
  color: string;
}) {
  const { position, quaternion, length } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = new THREE.Vector3().subVectors(vb, va);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(va, vb).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { position: mid, quaternion: q, length: len };
  }, [a, b]);
  if (length < 1e-6) return null;
  return (
    <mesh position={position} quaternion={quaternion}>
      <boxGeometry args={[size, length, size]} />
      <meshStandardMaterial color={color} metalness={0.2} roughness={0.7} />
    </mesh>
  );
}

/**
 * 3D-модель каркаса всего стола.
 * Оси three.js: X — вдоль ската (разнос стоек), Y — вверх, Z — вдоль стола.
 */
export default function Model3D() {
  const results = useSolarStore((s) => s.results);
  const [showPanels, setShowPanels] = useState(true);
  const [showHeat, setShowHeat] = useState(true);
  const geom = results.geom;
  const g = results.project.geometry;

  // Максимальный коэффициент использования по каждому элементу — для тепловой карты
  const utilByRole = useMemo(() => {
    const map = {} as Record<MemberRole, number>;
    for (const role of MEMBER_ROLES) map[role] = 0;
    for (const c of results.checks) {
      if ((MEMBER_ROLES as string[]).includes(c.role)) {
        const r = c.role as MemberRole;
        map[r] = Math.max(map[r], c.utilization);
      }
    }
    return map;
  }, [results.checks]);

  const colorOf = (role: MemberRole) => (showHeat ? utilizationColor(utilByRole[role]) : "#94a3b8");

  const frames = Array.from({ length: g.frameCount }, (_, i) => i * g.framePitch * MM);
  const zStart = -g.edgeOverhang * MM;
  const zEnd = (geom.tableLength - g.edgeOverhang) * MM;

  const center: [number, number, number] = [
    (geom.postSpacing * MM) / 2,
    (geom.rearTopHeight * MM) / 2,
    ((zStart + zEnd) / 2) as number,
  ];

  return (
    <Card
      title="3D-модель каркаса"
      right={
        <div className="flex gap-3 text-[11px] text-zinc-500">
          <label className="flex cursor-pointer items-center gap-1">
            <input type="checkbox" checked={showPanels} onChange={(e) => setShowPanels(e.target.checked)} className="h-3 w-3 accent-blue-600" />
            панели
          </label>
          <label className="flex cursor-pointer items-center gap-1">
            <input type="checkbox" checked={showHeat} onChange={(e) => setShowHeat(e.target.checked)} className="h-3 w-3 accent-blue-600" />
            тепловая карта
          </label>
        </div>
      }
    >
      <div className="h-[62vh] min-h-80 overflow-hidden rounded border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
        <Canvas camera={{ position: [9, 6, 14], fov: 45 }} dpr={[1, 2]}>
          <ambientLight intensity={0.75} />
          <directionalLight position={[10, 20, 10]} intensity={1.1} />
          <directionalLight position={[-10, 8, -12]} intensity={0.4} />
          <group position={[-center[0], -center[1], -center[2]]}>
            {frames.map((z, i) => (
              <group key={i}>
                {/* Стойки */}
                <Member
                  a={[0, -geom.embedDepth * MM, z]}
                  b={[0, geom.rearTopHeight * MM, z]}
                  size={0.09}
                  color={colorOf("rearPost")}
                />
                <Member
                  a={[geom.postSpacing * MM, -geom.embedDepth * MM, z]}
                  b={[geom.postSpacing * MM, geom.frontTopHeight * MM, z]}
                  size={0.09}
                  color={colorOf("frontPost")}
                />
                {/* Балка */}
                <Member
                  a={[geom.beamLowerTip.x * MM, geom.beamLowerTip.y * MM, z]}
                  b={[geom.beamUpperTip.x * MM, geom.beamUpperTip.y * MM, z]}
                  size={0.075}
                  color={colorOf("beam")}
                />
                {/* Подпорка */}
                {geom.brace.enabled ? (
                  <Member
                    a={[geom.brace.from.x * MM, geom.brace.from.y * MM, z]}
                    b={[geom.brace.to.x * MM, geom.brace.to.y * MM, z]}
                    size={0.055}
                    color={colorOf("brace")}
                  />
                ) : null}
              </group>
            ))}

            {/* Прогоны */}
            {geom.purlins.map((p, i) => (
              <Member
                key={`p${i}`}
                a={[p.point.x * MM, p.point.y * MM, zStart]}
                b={[p.point.x * MM, p.point.y * MM, zEnd]}
                size={0.05}
                color={colorOf("purlin")}
              />
            ))}

            {/* Ветровые связи по торцам */}
            {[frames[0], frames[frames.length - 1]].map((z, i) => {
              const z2 = i === 0 ? frames[Math.min(1, frames.length - 1)] : frames[Math.max(0, frames.length - 2)];
              return (
                <group key={`b${i}`}>
                  <Member a={[0, 0, z]} b={[0, geom.rearTopHeight * MM, z2]} size={0.035} color={colorOf("windBrace")} />
                  <Member a={[0, geom.rearTopHeight * MM, z]} b={[0, 0, z2]} size={0.035} color={colorOf("windBrace")} />
                </group>
              );
            })}

            {/* Панели */}
            {showPanels ? <Panels /> : null}
          </group>
          <Grid args={[60, 60]} cellSize={1} sectionSize={5} infiniteGrid fadeDistance={70} position={[0, -center[1], 0]} cellColor="#a1a1aa" sectionColor="#71717a" />
          <OrbitControls makeDefault enablePan enableZoom enableRotate />
        </Canvas>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
        <span>Вращение — левая кнопка, панорама — правая, зум — колесо.</span>
        {showHeat ? (
          <span className="flex items-center gap-2">
            Тепловая карта:
            {MEMBER_ROLES.map((role) => (
              <span key={role} className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: utilizationColor(utilByRole[role]) }} />
                {MEMBER_ROLE_LABELS[role]} {fmt(utilByRole[role])}
              </span>
            ))}
          </span>
        ) : null}
      </div>
    </Card>
  );
}

function Panels() {
  const results = useSolarStore((s) => s.results);
  const geom = results.geom;
  const g = results.project.geometry;
  const slope = geom.slopeDir;
  const rows = Array.from({ length: g.panelRows });
  const panelAlongSlope = g.panelOrientation === "portrait" ? results.project.panel.length : results.project.panel.width;

  return (
    <>
      {rows.map((_, r) => {
        const s0 = geom.panelOffset + r * (panelAlongSlope + g.panelGap);
        const sMid = s0 + panelAlongSlope / 2;
        const cx = (geom.beamLowerTip.x + slope.x * sMid) * MM;
        const cy = (geom.beamLowerTip.y + slope.y * sMid) * MM;
        const cz = (geom.tableLength / 2 - g.edgeOverhang) * MM;
        // Поворот плоскости панели вокруг оси стола на угол наклона
        const rot = -Math.atan2(slope.y, -slope.x);
        return (
          <mesh key={r} position={[cx, cy + 0.04, cz]} rotation={[0, 0, rot]}>
            <boxGeometry args={[panelAlongSlope * MM, 0.035, geom.panelFieldLength * MM]} />
            <meshStandardMaterial color="#1e3a8a" metalness={0.35} roughness={0.35} transparent opacity={0.55} />
          </mesh>
        );
      })}
    </>
  );
}
