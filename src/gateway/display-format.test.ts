import { expect, it } from "vitest"
import { conciseNumber, elapsedTime } from "@/skin/format"

it("formats elapsed telemetry without changing its precision or wrapping minutes", () => {
  for (const [seconds, display] of [
    [0, "00:00"],
    [9, "00:09"],
    [30, "00:30"],
    [65, "01:05"],
    [100, "01:40"],
    [120, "02:00"],
    [59.999, "00:59"],
    [6000, "100:00"],
  ] as const)
    expect(elapsedTime(seconds)).toBe(display)
  for (const value of [undefined, null, NaN, Infinity, -1])
    expect(elapsedTime(value)).toBe("—")
})
it("trims display zeros without rounding supported setting precision", () => {
  expect(conciseNumber(18)).toBe("18")
  expect(conciseNumber(18.5)).toBe("18.5")
  expect(conciseNumber(18.125)).toBe("18.125")
  expect(conciseNumber(93)).toBe("93")
  expect(conciseNumber(92.5, 1)).toBe("92.5")
  expect(conciseNumber(NaN)).toBe("—")
})
