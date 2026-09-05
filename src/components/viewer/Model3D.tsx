"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import { useMemo } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { ElementRole } from "@/lib/calc/types";
import { Node } from "@/lib/calc/geometry";

const MM = 0.001; // мм -> м

const ROLE_COLOR: Record<ElementRole, string> = {
  post: "#3b82f6",
  beam: "#f59e0b",
  purlin: "#10b981",
  brace: "#a855f7",
  diagonal: "#ef4444",
};

const ROLE_THICKNESS: Record<ElementRole, number> = {
  post: 0.08,
  beam: 0.07,
  purlin: 0.05,
  brace: 0.05,
  diagonal: 0.03,
};

function toVec(n: Node): THREE.Vector3 {
  // В модели: X=длина, Y=ширина, Z=высота. В three.js: Y — вверх.
  return new THREE.Vector3(n.x * MM, n.z * MM, n.y * MM);
}

function MemberMesh({ a, b, role }: { a: Node; b: Node; role: ElementRole }) {
  const { position, quaternion, length } = useMemo(() => {
    const va = toVec(a);
    const vb = toVec(b);
    const dir = new THREE.Vector3().subVectors(vb, va);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(va, vb).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { position: mid, quaternion: quat, length: len };
  }, [a, b]);

  const t = ROLE_THICKNESS[role];

  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[t / 2, t / 2, length, 8]} />
      <meshStandardMaterial color={ROLE_COLOR[role]} />
    </mesh>
  );
}

function PanelMesh({ corners }: { corners: [number, number, number][] }) {
  const geometry = useMemo(() => {
    const pts = corners.map(([x, y, z]) => new THREE.Vector3(x * MM, z * MM, y * MM));
    const geom = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      pts[0].x, pts[0].y, pts[0].z,
      pts[1].x, pts[1].y, pts[1].z,
      pts[2].x, pts[2].y, pts[2].z,
      pts[0].x, pts[0].y, pts[0].z,
      pts[2].x, pts[2].y, pts[2].z,
      pts[3].x, pts[3].y, pts[3].z,
    ]);
    geom.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geom.computeVertexNormals();
    return geom;
  }, [corners]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#1e293b" side={THREE.DoubleSide} metalness={0.3} roughness={0.4} />
    </mesh>
  );
}

function FootingMesh({ x, y }: { x: number; y: number }) {
  return (
    <mesh position={[x * MM, -0.15, y * MM]}>
      <boxGeometry args={[0.5, 0.3, 0.5]} />
      <meshStandardMaterial color="#9ca3af" />
    </mesh>
  );
}

export default function Model3D() {
  const geom = useProjectStore((s) => s.results.geom);
  const panelQuads = useProjectStore((s) => s.results.panelQuads);
  const totalLength = useProjectStore((s) => s.geometry.totalLength);

  const camDist = Math.max(4, (totalLength * MM) * 0.9);

  return (
    <div className="h-[520px] w-full overflow-hidden rounded-none border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950">
      <Canvas shadows camera={{ position: [camDist, camDist * 0.7, camDist], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 15, 8]} intensity={1.1} castShadow />
        <Grid args={[50, 50]} cellColor="#94a3b8" sectionColor="#64748b" position={[0, 0, 0]} />
        {geom.members.map((m) => (
          <MemberMesh key={m.id} a={m.a} b={m.b} role={m.role} />
        ))}
        {geom.footings.map((f) => (
          <FootingMesh key={f.id} x={f.x} y={f.y} />
        ))}
        {panelQuads.map((q, i) => (
          <PanelMesh key={i} corners={q.corners} />
        ))}
        <OrbitControls makeDefault />
      </Canvas>
      <div className="flex flex-wrap gap-3 border-t border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900">
        <Legend color="#3b82f6" label="Стойки" />
        <Legend color="#f59e0b" label="Балки" />
        <Legend color="#10b981" label="Прогоны" />
        <Legend color="#a855f7" label="Подкосы" />
        <Legend color="#ef4444" label="Связи" />
        <Legend color="#1e293b" label="Панели" />
        <Legend color="#9ca3af" label="Фундамент" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
      <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
