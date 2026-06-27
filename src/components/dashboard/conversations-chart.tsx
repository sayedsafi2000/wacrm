"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import type { ConversationsSeriesPoint } from '@/lib/dashboard/types'
import { EmptyState } from './empty-state'
import { Skeleton } from './skeleton'
import { cn } from '@/lib/utils'

type RangeDays = 7 | 30 | 90

interface ConversationsChartProps {
  /** Per-range data, so switching tabs never re-fetches. */
  series: Record<RangeDays, ConversationsSeriesPoint[] | null>
  loading: boolean
  range: RangeDays
  onRangeChange: (r: RangeDays) => void
}

// ------------------------------------------------------------
// Layout constants. The SVG renders into a fixed viewBox and scales
// via CSS (preserveAspectRatio default). Everything inside uses
// viewBox coordinates so the drawing math stays simple even as the
// container resizes.
// ------------------------------------------------------------
const VB_W = 760
const VB_H = 240
const PADDING = { top: 16, right: 16, bottom: 28, left: 40 }

export function ConversationsChart({ series, loading, range, onRangeChange }: ConversationsChartProps) {
  const data = series[range]

  // Memoise the max so per-day hover math doesn't recompute it.
  const { maxY, niceTicks } = useMemo(() => {
    const arr = data ?? []
    const max = arr.reduce(
      (m, p) => Math.max(m, p.incoming, p.outgoing),
      0,
    )
    const ceil = niceCeil(max)
    const ticks = [0, ceil / 4, ceil / 2, (3 * ceil) / 4, ceil].map((v) =>
      Math.round(v),
    )
    // De-dupe when the series is flat 0.
    return { maxY: ceil, niceTicks: Array.from(new Set(ticks)) }
  }, [data])

  return (
    <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Conversations Over Time</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Daily message volume by direction</p>
        </div>
        <div className="flex w-full shrink-0 items-center gap-1 self-start rounded-lg bg-muted/60 p-1 sm:w-auto">
          {[7, 30, 90].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r as RangeDays)}
              className={cn(
                'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors sm:flex-none sm:px-2.5',
                range === r
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="sm:hidden">{r}d</span>
              <span className="hidden sm:inline">{r} days</span>
            </button>
          ))}
        </div>
      </header>

      <div className="min-w-0 p-4 sm:p-5">
        {loading || !data ? (
          <Skeleton className="h-[200px] w-full sm:h-[240px]" />
        ) : data.every((p) => p.incoming === 0 && p.outgoing === 0) ? (
          <EmptyState
            icon={MessageSquare}
            title="No message activity in this range"
            hint="Send or receive messages to start populating this chart."
          />
        ) : (
          <LineSvg data={data} maxY={maxY} ticks={niceTicks} />
        )}
      </div>

      <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:px-5">
        <LegendDot color="#3b82f6" label="Incoming" />
        <LegendDot color="#7c3aed" label="Outgoing" />
      </footer>
    </section>
  )
}

// ------------------------------------------------------------
// The actual SVG. Two polylines + per-day hit targets for hover.
// ------------------------------------------------------------

function LineSvg({
  data,
  maxY,
  ticks,
}: {
  data: ConversationsSeriesPoint[]
  maxY: number
  ticks: number[]
}) {
  // Hover state: both the snapped index AND the tooltip's pixel
  // offset inside the wrapper div. They're stored together so the
  // tooltip positions against the chart's actual rendered pixels,
  // not against a raw viewBox percentage. See the precision note on
  // the onMove handler below.
  const [hover, setHover] = useState<{ idx: number; tooltipLeftPx: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(VB_W)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width)
    })
    ro.observe(el)
    setContainerWidth(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])

  const maxLabels =
    containerWidth < 360 ? 3 : containerWidth < 480 ? 4 : containerWidth < 640 ? 5 : 6
  const labelStride = Math.max(1, Math.ceil(data.length / maxLabels))
  const rotateLabels = containerWidth < 420 && data.length > 7
  const paddingBottom = rotateLabels ? 44 : 28
  const padding = { ...PADDING, bottom: paddingBottom }
  const chartW = VB_W - padding.left - padding.right
  const chartH = VB_H - padding.top - padding.bottom

  // x step can be fractional for 90-day views; points are positioned
  // at the center of each "slot" so the first and last points don't
  // sit right on the axis.
  const stepX = data.length > 1 ? chartW / (data.length - 1) : 0
  const yFor = (v: number) =>
    maxY === 0 ? padding.top + chartH : padding.top + chartH - (v / maxY) * chartH
  const xFor = (i: number) => padding.left + i * stepX

  const incomingPath = data.map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i)},${yFor(p.incoming)}`).join(' ')
  const outgoingPath = data.map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i)},${yFor(p.outgoing)}`).join(' ')

  // Mouse-move: use the SVG's current screen-CTM to map clientX
  // back to viewBox coordinates. The previous rect-based math
  // assumed the viewBox filled the SVG DOM box linearly, but
  // `preserveAspectRatio="xMidYMid meet"` (the SVG default)
  // letterboxes the content horizontally when the container is
  // wider than the viewBox aspect — so hover snapped hundreds of
  // pixels off on wide layouts. CTM-inverse correctly accounts for
  // letterboxing, scaling, and any future transform changes.
  useEffect(() => {
    const svg = svgRef.current
    const wrap = wrapRef.current
    if (!svg || !wrap) return
    const onMove = (e: MouseEvent) => {
      const ctm = svg.getScreenCTM()
      if (!ctm) return
      const pt = svg.createSVGPoint()
      pt.x = e.clientX
      pt.y = e.clientY
      const local = pt.matrixTransform(ctm.inverse())
      const xVb = local.x
      if (xVb < padding.left - 8 || xVb > VB_W - padding.right + 8) {
        setHover(null)
        return
      }
      const relative = xVb - padding.left
      const idx = Math.max(
        0,
        Math.min(data.length - 1, Math.round(stepX === 0 ? 0 : relative / stepX)),
      )
      // Map the snapped data-point's viewBox x back to screen, then
      // subtract the wrapper's left edge — that pixel offset is what
      // the absolutely-positioned tooltip div consumes. `xFor` is
      // inlined here so the effect deps stay stable (it's a closure
      // that'd otherwise be a new reference every render).
      const dataPointVbX = padding.left + idx * stepX
      const dataPointPt = svg.createSVGPoint()
      dataPointPt.x = dataPointVbX
      dataPointPt.y = 0
      const screen = dataPointPt.matrixTransform(ctm)
      const wrapRect = wrap.getBoundingClientRect()
      setHover({ idx, tooltipLeftPx: screen.x - wrapRect.left })
    }
    const onLeave = () => setHover(null)
    svg.addEventListener('mousemove', onMove)
    svg.addEventListener('mouseleave', onLeave)
    return () => {
      svg.removeEventListener('mousemove', onMove)
      svg.removeEventListener('mouseleave', onLeave)
    }
    // xFor + yFor close over stepX, so stepX covers them.
  }, [data, stepX, padding.left, padding.right])

  const hovered = hover !== null ? data[hover.idx] : null
  const hoverX = hover !== null ? xFor(hover.idx) : 0

  return (
    <div ref={wrapRef} className="relative min-w-0 w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-[200px] w-full sm:h-[240px]"
        role="img"
        aria-label="Conversations per day"
      >
        {/* Y-axis gridlines + labels */}
        {ticks.map((t) => {
          const y = yFor(t)
          return (
            <g key={t}>
              <line
                x1={padding.left}
                x2={VB_W - padding.right}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeDasharray="3 3"
              />
              <text
                x={padding.left - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {t}
              </text>
            </g>
          )
        })}

        {/* X-axis labels — fewer on narrow screens; rotate when cramped */}
        {data.map((p, i) =>
          i % labelStride === 0 ? (
            <text
              key={p.day}
              x={xFor(i)}
              y={VB_H - (rotateLabels ? 6 : 8)}
              textAnchor={rotateLabels ? 'end' : 'middle'}
              transform={rotateLabels ? `rotate(-35, ${xFor(i)}, ${VB_H - 6})` : undefined}
              className="fill-muted-foreground text-[10px]"
            >
              {shortDayLabel(p.day, containerWidth < 480)}
            </text>
          ) : null,
        )}

        {/* Outgoing polyline (violet) */}
        <path
          d={outgoingPath}
          fill="none"
          stroke="#7c3aed"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Incoming polyline (blue) */}
        <path
          d={incomingPath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hover crosshair */}
        {hover !== null && (
          <g pointerEvents="none">
            <line
              x1={hoverX}
              x2={hoverX}
              y1={padding.top}
              y2={padding.top + chartH}
              stroke="var(--muted-foreground)"
              strokeDasharray="3 3"
            />
            <circle cx={hoverX} cy={yFor(data[hover.idx].incoming)} r={3.5} fill="#3b82f6" />
            <circle cx={hoverX} cy={yFor(data[hover.idx].outgoing)} r={3.5} fill="#7c3aed" />
          </g>
        )}
      </svg>

      {/* Tooltip — absolute-positioned div so we get crisp text, not
          SVG-rendered text. The left offset comes from the CTM-based
          mapping so it lines up with the actual crosshair pixel, not a
          letterboxed viewBox percentage. */}
      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-md border border-border bg-popover px-2.5 py-1.5 text-[11px] shadow-lg"
          style={{ left: `${hover.tooltipLeftPx}px` }}
        >
          <div className="font-medium text-popover-foreground">{longDayLabel(hovered.day)}</div>
          <div className="mt-1 flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-blue-300">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
              {hovered.incoming} incoming
            </span>
            <span className="flex items-center gap-1.5 text-primary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              {hovered.outgoing} outgoing
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

function shortDayLabel(key: string, compact = false): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (compact) {
    return date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function longDayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

/**
 * Round `max` up to a "nice" number so Y-axis ticks feel natural
 * (1, 2, 5, 10, 20, 50, …). Keeps the chart readable even when the
 * series is small (max=3 becomes ceil=4, not 3).
 */
function niceCeil(max: number): number {
  if (max <= 0) return 4
  const pow = Math.pow(10, Math.floor(Math.log10(max)))
  const normalised = max / pow
  let nice: number
  if (normalised <= 1) nice = 1
  else if (normalised <= 2) nice = 2
  else if (normalised <= 5) nice = 5
  else nice = 10
  return nice * pow
}
