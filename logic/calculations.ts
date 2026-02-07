// lib/calculations.ts

export interface BallisticData {
  r: number;
  elev: number;
  tof: number;
}

export const ballisticData: BallisticData[] = [
  { r: 3000, elev: 1271, tof: 52.2 },
  { r: 3100, elev: 1258, tof: 52.0 },
  { r: 3200, elev: 1244, tof: 51.8 },
  { r: 3300, elev: 1230, tof: 51.5 },
  { r: 3400, elev: 1216, tof: 51.3 },
  { r: 3500, elev: 1202, tof: 51.0 },
  { r: 3600, elev: 1187, tof: 50.7 },
  { r: 3700, elev: 1172, tof: 50.4 },
  { r: 3800, elev: 1156, tof: 50.1 },
  { r: 3900, elev: 1140, tof: 49.8 },
  { r: 4000, elev: 1124, tof: 49.4 },
  { r: 4100, elev: 1107, tof: 49.0 },
  { r: 4200, elev: 1089, tof: 48.6 },
  { r: 4300, elev: 1071, tof: 48.2 },
  { r: 4400, elev: 1052, tof: 47.7 },
  { r: 4500, elev: 1032, tof: 47.2 },
  { r: 4600, elev: 1011, tof: 46.7 },
  { r: 4700, elev: 989, tof: 46.1 },
  { r: 4800, elev: 966, tof: 45.5 },
  { r: 4900, elev: 941, tof: 44.7 },
  { r: 5000, elev: 913, tof: 44.0 },
  { r: 5100, elev: 883, tof: 43.1 },
  { r: 5200, elev: 850, tof: 42.0 },
  { r: 5300, elev: 809, tof: 40.7 },
];

export function parseGrid(val: string): number | null {
  if (!val) return null;
  let num = parseInt(val, 10);
  if (isNaN(num)) return null;
  if (val.length === 3) num *= 100;
  if (val.length === 4) num *= 10;
  return num;
}

export interface CalculationResult {
  range: string;
  azimuth: string;
  degrees: string;
  elev: string;
  tof: string;
  status: string;
  statusClass: string;
  adjustedGrid: string;
}

function lerp(start: number, end: number, t: number): number {
  return start * (1 - t) + end * t;
}

export function calculateBallistics(
  batX: string,
  batY: string,
  tgtX: string,
  tgtY: string,
  corrRange: number = 0,
  corrLat: number = 0
): CalculationResult {
  const bx = parseGrid(batX);
  const by = parseGrid(batY);
  const tx = parseGrid(tgtX);
  const ty = parseGrid(tgtY);

  if (bx === null || by === null || tx === null || ty === null) {
    return {
      range: "---- m",
      azimuth: "----",
      degrees: "(--°)",
      elev: "----",
      tof: "--.- s",
      status: "AWAITING COORDINATES...",
      statusClass: "text-yellow-500",
      adjustedGrid: "",
    };
  }

  // 1. Calculate Initial Vector (Gun to Original Target)
  const dx = tx - bx;
  const dy = ty - by;

  // Initial Azimuth (Radians, CW from North)
  let initialTheta = Math.atan2(dx, dy);

  // 2. Apply Corrections
  // "Add/Drop" moves along the Initial Azimuth vector
  // "Left/Right" moves Perpendicular (Initial Azimuth + 90 deg)
  const shiftX = corrRange * Math.sin(initialTheta) + corrLat * Math.cos(initialTheta);
  const shiftY = corrRange * Math.cos(initialTheta) - corrLat * Math.sin(initialTheta);

  const finalTx = tx + shiftX;
  const finalTy = ty + shiftY;

  // Show adjusted grid if corrections exist
  let adjustedGrid = "";
  if (corrRange !== 0 || corrLat !== 0) {
    adjustedGrid = `Adjusted Grid: ${Math.round(finalTx)} / ${Math.round(finalTy)}`;
  }

  // 3. Calculate Final Firing Solution
  const finalDx = finalTx - bx;
  const finalDy = finalTy - by;
  const dist = Math.sqrt(finalDx * finalDx + finalDy * finalDy);
  const range = `${Math.round(dist)} m`;

  // Final Azimuth
  let finalThetaRad = Math.atan2(finalDx, finalDy);
  let finalThetaDeg = finalThetaRad * (180 / Math.PI);
  if (finalThetaDeg < 0) finalThetaDeg += 360;

  const milsTotal = 6400;
  const azimuthMils = Math.round((finalThetaDeg / 360) * milsTotal);
  const azimuth = azimuthMils.toString().padStart(4, "0");
  const degrees = `(${Math.round(finalThetaDeg)}°)`;

  // 4. Interpolate Ballistics
  if (dist < 3000) {
    return {
      range,
      azimuth,
      degrees,
      elev: "MIN RNG",
      tof: "---",
      status: "TARGET TOO CLOSE (<3000m)",
      statusClass: "text-red-500",
      adjustedGrid,
    };
  }

  if (dist > 5300) {
    return {
      range,
      azimuth,
      degrees,
      elev: "MAX RNG",
      tof: "---",
      status: "TARGET OUT OF RANGE (>5300m)",
      statusClass: "text-red-500",
      adjustedGrid,
    };
  }

  // Find rows for interpolation
  let lower = null;
  let upper = null;

  for (let i = 0; i < ballisticData.length - 1; i++) {
    if (dist >= ballisticData[i].r && dist <= ballisticData[i + 1].r) {
      lower = ballisticData[i];
      upper = ballisticData[i + 1];
      break;
    }
  }

  let elev = "----";
  let tof = "--.- s";

  if (lower && upper) {
    const rangeDelta = upper.r - lower.r;
    const distOffset = dist - lower.r;
    const ratio = distOffset / rangeDelta;

    const elevValue = lerp(lower.elev, upper.elev, ratio);
    const tofValue = lerp(lower.tof, upper.tof, ratio);

    elev = Math.round(elevValue).toString();
    tof = tofValue.toFixed(1) + " s";
  }

  return {
    range,
    azimuth,
    degrees,
    elev,
    tof,
    status: "SOLUTION COMPUTED",
    statusClass: "text-green-500",
    adjustedGrid,
  };
}

