// Streamline waterTank.js / de1app vars.tcl: CAD-derived standard DE1 tank.
// Calibration identity must be established separately; refillKit=false alone
// does not identify a tank. The owner confirmed the standard removable tank
// for the DE1 Pro deployment; the preview passes its explicit fixture identity.
const standardDe1 = [
  0, 16, 43, 70, 97, 124, 151, 179, 206, 233, 261, 288, 316, 343, 371, 398, 426,
  453, 481, 509, 537, 564, 592, 620, 648, 676, 704, 732, 760, 788, 816, 844,
  872, 900, 929, 957, 985, 1013, 1042, 1070, 1104, 1138, 1172, 1207, 1242, 1277,
  1312, 1347, 1382, 1417, 1453, 1488, 1523, 1559, 1594, 1630, 1665, 1701, 1736,
  1772, 1808, 1843, 1879, 1915, 1951, 1986, 2022, 2058,
]
export type TankCalibration = "standard-de1" | null
export function tankMillilitres(
  mm: number | null,
  calibration: TankCalibration,
  connected: boolean
) {
  if (
    !connected ||
    calibration !== "standard-de1" ||
    mm === null ||
    !Number.isFinite(mm) ||
    mm < 0
  )
    return null
  return standardDe1[Math.min(Math.floor(mm), standardDe1.length - 1)]
}
