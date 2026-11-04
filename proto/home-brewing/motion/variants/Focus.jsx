import { Panel } from "../shared"
import Rolling from "../rolling"
export default function Focus({ s, onAdjust }) {
  return (
    <Panel s={s} name="Focus" onAdjust={onAdjust}>
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <Rolling s={s} />
      </div>
    </Panel>
  )
}
