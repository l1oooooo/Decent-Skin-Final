import { Eyebrow } from "./common"
export function Preparation({ s }) {
  return (
    <div className="grid grid-cols-[1fr_1fr] gap-8">
      <div>
        <Eyebrow>Brew ratio</Eyebrow>
        <p className="mt-3 text-[56px] leading-none font-medium tracking-[-.06em] tabular-nums">
          1<span className="text-muted-foreground">:</span>
          {(s.yieldTarget / s.dose).toFixed(1)}
        </p>
      </div>
      <div className="flex flex-col justify-end">
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          {s.dose.toFixed(1)} g of coffee
          <br />
          <span className="text-foreground">
            {s.yieldTarget.toFixed(1)} g in your cup
          </span>
        </p>
      </div>
    </div>
  )
}
export function SmallReading({ label, value, unit }) {
  return (
    <div>
      <p className="mb-2 text-[12px] text-muted-foreground">{label}</p>
      <p className="text-[28px] leading-none tracking-[-.04em] tabular-nums">
        {value}
        <span className="ml-1.5 text-[13px] text-muted-foreground">{unit}</span>
      </p>
    </div>
  )
}
