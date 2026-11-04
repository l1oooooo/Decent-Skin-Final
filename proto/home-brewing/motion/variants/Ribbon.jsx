import {
  Panel,
  Heading,
  stages,
  progress,
  stageStatus,
  processDetails,
} from "../shared"
export default function Ribbon({ s, onAdjust }) {
  const { fraction, index } = progress(s)
  const position = (index + fraction) / stages.length
  return (
    <Panel s={s} name="Ribbon" onAdjust={onAdjust}>
      <Heading s={s} label="Extraction path" />
      <div className="relative my-5 min-h-0 flex-1 overflow-hidden">
        <div
          className="absolute inset-y-3 left-5 w-[3px] overflow-hidden rounded-full bg-border"
          aria-hidden="true"
        >
          <div
            className="motion-transform h-full origin-top bg-foreground"
            style={{ transform: `scaleY(${position})` }}
          />
        </div>
        <div
          className="motion-transform absolute inset-x-0 inset-y-3"
          style={{ transform: `translateY(${position * 100}%)` }}
          aria-hidden="true"
        >
          <span className="absolute -top-1.5 left-[15px] size-3 rounded-full bg-foreground ring-4 ring-card" />
        </div>
        <ol aria-label="Shot stages" className="relative ml-12 h-full">
          {stages.map((stage, i) => (
            <li
              key={stage.name}
              aria-label={`${stage.name}: ${stageStatus(s, stage, i, index)}`}
              aria-current={!s.complete && i === index ? "step" : undefined}
              className={`absolute inset-x-0 border-t border-border pt-3 ${i === index ? "text-foreground" : "text-muted-foreground"}`}
              style={{ top: `${(i / stages.length) * 100}%` }}
            >
              <span className="text-[20px] tracking-[-.025em]">
                {stage.name}
              </span>
              <p className="mt-2 max-w-[25ch] text-[13px] leading-snug text-muted-foreground">
                {processDetails[i].description}
              </p>
              <p className="mt-2 text-[12px] text-muted-foreground tabular-nums">
                {processDetails[i].reference}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </Panel>
  )
}
