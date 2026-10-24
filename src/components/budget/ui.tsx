import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";

// ── Design tokens ─────────────────────────────────────────────────────────────
export const C = {
  bg: "#060a06",
  pitch: "#0d1f0d",
  surface: "#111811",
  card: "#182018",
  border: "#243024",
  green: "#3de06e",
  greenDim: "#2ab355",
  greenGlow: "#3de06e33",
  yellow: "#f5e642",
  red: "#f54242",
  text: "#e8f0e8",
  muted: "#5a7a5a",
  white: "#ffffff",
};

export const BEBAS = "'Bebas Neue', sans-serif";

export function fmt(n: number | string) {
  return "" + Math.abs(Number(n)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Pitch stripe background ───────────────────────────────────────────────────
export function PitchStripes() {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: `repeating-linear-gradient(
        180deg,
        ${C.pitch} 0px, ${C.pitch} 60px,
        ${C.bg} 60px, ${C.bg} 120px
      )`,
        opacity: 0.35,
        pointerEvents: "none",
      }}
    />
  );
}

// ── Animated number ───────────────────────────────────────────────────────────
export function AnimNum({ value, prefix = "$", style: s }: { value: number; prefix?: string; style?: React.CSSProperties }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const diff = value - prev.current;
    const steps = 20;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplay(prev.current + (diff * i) / steps);
      if (i >= steps) { clearInterval(id); prev.current = value; }
    }, 16);
    return () => clearInterval(id);
  }, [value]);
  const n = Math.abs(display);
  const str = prefix + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return <span style={s}>{display < 0 ? "-" : ""}{str}</span>;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ title, icon, onClose, children, zIndex = 200 }: { title: string; icon: string; onClose: () => void; children: ReactNode; zIndex?: number }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex,
        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 16, padding: 28, width: "min(500px, 96vw)",
          maxHeight: "90vh", overflowY: "auto",
          boxShadow: `0 0 60px ${C.greenGlow}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <span style={{ fontFamily: BEBAS, fontSize: 24, color: C.green, letterSpacing: "0.05em" }}>
            {icon} {title}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 22, lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { onFocus, onBlur, style, ...rest } = props;
  return (
    <input
      {...rest}
      style={{
        width: "100%", boxSizing: "border-box",
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 8, padding: "10px 14px",
        color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none",
        ...style,
      }}
      onFocus={(e) => { e.target.style.borderColor = C.green; onFocus?.(e); }}
      onBlur={(e) => { e.target.style.borderColor = C.border; onBlur?.(e); }}
    />
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { color?: string; textColor?: string; outline?: boolean };

export function Btn({ children, color = C.green, textColor = "#000", outline, style, ...props }: BtnProps) {
  return (
    <button
      {...props}
      style={{
        border: outline ? `1px solid ${color}` : "none",
        background: outline ? "transparent" : color,
        color: outline ? color : textColor,
        borderRadius: 8, padding: "10px 20px",
        cursor: props.disabled ? "default" : "pointer", fontFamily: BEBAS,
        fontSize: 15, letterSpacing: "0.08em",
        transition: "all 0.15s",
        opacity: props.disabled ? 0.5 : 1,
        ...style,
      }}
      onMouseEnter={(e) => { if (!props.disabled) e.currentTarget.style.opacity = "0.8"; }}
      onMouseLeave={(e) => { if (!props.disabled) e.currentTarget.style.opacity = "1"; }}
    >
      {children}
    </button>
  );
}

// ── Horizontal bar ────────────────────────────────────────────────────────────
export function Bar({ pct, color, height = 8 }: { pct: number; color: string; height?: number }) {
  return (
    <div style={{ background: C.border, borderRadius: 99, height, overflow: "hidden" }}>
      <div
        style={{
          height: "100%", borderRadius: 99,
          width: `${Math.min(pct, 100)}%`,
          background: pct > 90 ? C.red : pct > 70 ? C.yellow : color,
          transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
          boxShadow: pct > 0 ? `0 0 8px ${color}88` : "none",
        }}
      />
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div style={{ color: C.muted, textAlign: "center", padding: 32 }}>{children}</div>;
}
