import Ribbon from "./variants/Ribbon"
import Focus from "./variants/Focus"
import Frame from "./frame"
const direction = (id, name, axis, Status) => ({
  id,
  name,
  axis,
  accent: "oklch(1 0 0)",
  theme: "r2-grid r3-monochrome",
  component: ({ s }) => <Frame s={s} Status={Status} />,
})
export default [
  direction(
    3,
    "Focus",
    "Selected for Revision · rolling status and dot wave.",
    Focus
  ),
  direction(
    2,
    "Ribbon",
    "Study reference · follow each stage along the path.",
    Ribbon
  ),
]
