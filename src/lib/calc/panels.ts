import { GeometryInput, PanelInput, PanelDerived } from "./types";

export function derivePanelValues(g: GeometryInput, p: PanelInput): PanelDerived {
  const count = p.count > 0 ? p.count : g.panelRowCount * g.panelsPerRow;
  const areaM2 = p.area > 0 ? p.area : (p.length / 1000) * (p.width / 1000);
  const totalAreaM2 = areaM2 * count;
  const totalWeightKg = p.weight * count;

  // Центр тяжести массива панелей относительно базовой точки (передний нижний угол конструкции)
  const cx = g.totalLength / 2;
  const cy = g.totalWidth / 2;
  const cz = g.frontPostHeight + ((g.rearPostHeight - g.frontPostHeight) * 0.5);

  return {
    totalAreaM2,
    totalWeightKg,
    centerOfGravity: { x: cx, y: cy, z: cz },
  };
}

export interface PanelQuad {
  corners: [number, number, number][]; // 4 угла в мм (x,y,z)
}

/** Строит прямоугольники панелей на плоскости ската для 3D-визуализации и схемы раскладки */
export function buildPanelQuads(g: GeometryInput, p: PanelInput): PanelQuad[] {
  const quads: PanelQuad[] = [];
  const cols = Math.max(1, g.panelsPerRow);
  const rows = Math.max(1, g.panelRowCount);

  const panelW = p.orientation === "portrait" ? p.width : p.length; // размер вдоль длины конструкции (X)
  const panelH = p.orientation === "portrait" ? p.length : p.width; // размер вдоль ската (Y-Z)
  const gap = p.gap;

  const arrayLenX = cols * panelW + (cols - 1) * gap;
  const arrayLenSlope = rows * panelH + (rows - 1) * gap;
  const startX = Math.max(0, (g.totalLength - arrayLenX) / 2);
  const slopeLength = Math.sqrt(g.totalWidth ** 2 + (g.rearPostHeight - g.frontPostHeight) ** 2);
  const startSlope = Math.max(0, (slopeLength - arrayLenSlope) / 2);

  const dirY = g.totalWidth / (slopeLength || 1);
  const dirZ = (g.rearPostHeight - g.frontPostHeight) / (slopeLength || 1);

  for (let r = 0; r < rows; r++) {
    const s0 = startSlope + r * (panelH + gap);
    const s1 = s0 + panelH;
    for (let c = 0; c < cols; c++) {
      const x0 = startX + c * (panelW + gap);
      const x1 = x0 + panelW;
      const y0 = s0 * dirY;
      const z0 = g.frontPostHeight + s0 * dirZ;
      const y1 = s1 * dirY;
      const z1 = g.frontPostHeight + s1 * dirZ;
      quads.push({
        corners: [
          [x0, y0, z0],
          [x1, y0, z0],
          [x1, y1, z1],
          [x0, y1, z1],
        ],
      });
    }
  }
  return quads;
}
