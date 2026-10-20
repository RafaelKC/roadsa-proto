// Curvas de nível decorativas (fundo do login): anéis deformados em volta de dois "morros".
const HILLS = [
  { cx: 260, cy: 300, rings: 14, step: 26, seed: 1 },
  { cx: 780, cy: 620, rings: 12, step: 30, seed: 2.3 },
];

function ring(cx: number, cy: number, r: number, seed: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= 72; i++) {
    const t = (i / 72) * Math.PI * 2;
    const wobble = 1 + 0.14 * Math.sin(3 * t + seed + r / 90) + 0.07 * Math.sin(5 * t + seed * 2);
    pts.push(`${(cx + r * wobble * 1.25 * Math.cos(t)).toFixed(1)},${(cy + r * wobble * Math.sin(t)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

export function TopoBackground() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1000 800"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 size-full text-primary opacity-25"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        {HILLS.flatMap((h) =>
          Array.from({ length: h.rings }, (_, i) => (
            <path key={`${h.seed}-${i}`} d={ring(h.cx, h.cy, 20 + i * h.step, h.seed)} />
          )),
        )}
      </g>
    </svg>
  );
}
