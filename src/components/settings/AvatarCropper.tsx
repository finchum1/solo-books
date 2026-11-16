import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'

const VIEW = 260 // the circle you frame your face in, in CSS pixels
const OUT = 320 // the saved photo is a 320 x 320 square (shown round)

/**
 * Frame a photo for the headshot: drag to move it, slide to zoom. Nothing is uploaded here: "Use this photo"
 * hands back a small square JPEG, so what is stored is always the same size and a few dozen kilobytes.
 */
export function AvatarCropper({ file, onCancel, onSave, busy }: { file: File; onCancel: () => void; onSave: (blob: Blob) => void; busy: boolean }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [off, setOff] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    // A flag, because the page can run this effect twice in a row (and tear the first run down) before the image loads.
    let live = true
    const url = URL.createObjectURL(file)
    const el = new Image()
    el.onload = () => live && setImg(el)
    el.onerror = () => live && setError("That image couldn't be read. Try a JPG or PNG.")
    el.src = url
    return () => {
      live = false
      URL.revokeObjectURL(url)
    }
  }, [file])

  const base = img ? VIEW / Math.min(img.naturalWidth, img.naturalHeight) : 1 // scale at which the photo just covers the circle
  const scale = base * zoom
  const clamp = useCallback(
    (o: { x: number; y: number }, z = zoom) => {
      if (!img) return o
      const s = base * z
      const mx = Math.max(0, (img.naturalWidth * s - VIEW) / 2)
      const my = Math.max(0, (img.naturalHeight * s - VIEW) / 2)
      return { x: Math.max(-mx, Math.min(mx, o.x)), y: Math.max(-my, Math.min(my, o.y)) }
    },
    [img, base, zoom],
  )

  function onDown(e: PointerEvent<HTMLDivElement>) {
    drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (d) setOff(clamp({ x: d.ox + e.clientX - d.x, y: d.oy + e.clientY - d.y }))
  }
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 20 : 6
    const d = e.key === 'ArrowLeft' ? [step, 0] : e.key === 'ArrowRight' ? [-step, 0] : e.key === 'ArrowUp' ? [0, step] : e.key === 'ArrowDown' ? [0, -step] : null
    if (!d) return
    e.preventDefault()
    setOff((o) => clamp({ x: o.x + d[0], y: o.y + d[1] }))
  }
  function changeZoom(z: number) {
    setZoom(z)
    setOff((o) => clamp(o, z))
  }

  function save() {
    if (!img) return
    const canvas = document.createElement('canvas')
    canvas.width = OUT
    canvas.height = OUT
    const ctx = canvas.getContext('2d')
    if (!ctx) return setError('Your browser could not prepare the photo.')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, OUT, OUT)
    const side = VIEW / scale // how much of the original photo is inside the circle
    const sx = (img.naturalWidth * scale / 2 - VIEW / 2 - off.x) / scale
    const sy = (img.naturalHeight * scale / 2 - VIEW / 2 - off.y) / scale
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, sx, sy, side, side, 0, 0, OUT, OUT)
    canvas.toBlob((b) => (b ? onSave(b) : setError('Your browser could not prepare the photo.')), 'image/jpeg', 0.88)
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-sm text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      ) : !img ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      ) : (
        <>
          <div
            role="group"
            aria-label="Position your photo. Drag it, or use the arrow keys."
            tabIndex={0}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onKeyDown={onKey}
            className="relative mx-auto cursor-grab touch-none overflow-hidden rounded-full bg-slate-200 outline-none ring-2 ring-emerald-500/0 focus-visible:ring-emerald-500 active:cursor-grabbing dark:bg-slate-800"
            style={{ width: VIEW, height: VIEW }}
          >
            <img
              src={img.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none select-none"
              style={{
                width: img.naturalWidth * scale,
                height: img.naturalHeight * scale,
                left: VIEW / 2 + off.x - (img.naturalWidth * scale) / 2,
                top: VIEW / 2 + off.y - (img.naturalHeight * scale) / 2,
              }}
            />
          </div>
          <div className="mx-auto flex max-w-[260px] items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">Zoom</span>
            <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => changeZoom(Number(e.target.value))} aria-label="Zoom" className="flex-1 accent-emerald-600" />
          </div>
        </>
      )}
      <div className="flex justify-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!img || busy}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium px-4 py-2 text-sm transition"
        >
          {busy ? 'Saving…' : 'Use this photo'}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="rounded-lg px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition">
          Cancel
        </button>
      </div>
    </div>
  )
}
