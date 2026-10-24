/** Shared visual building blocks for the promo (all original SVG, same motifs as the website). */
import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { colors } from '../theme';

/** Washi paper background with the low-opacity seigaiha wave pattern and a soft sakura glow. */
export const Paper: React.FC<{ tone?: 'light' | 'ink' }> = ({ tone = 'light' }) => {
  const stroke = tone === 'ink' ? '%23FAF8F5' : '%231B1B1F';
  const pattern = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='40' viewBox='0 0 80 40'%3E%3Cg fill='none' stroke='${stroke}' stroke-width='1.4'%3E%3Cpath d='M0 40a40 40 0 0 1 80 0M12 40a28 28 0 0 1 56 0M24 40a16 16 0 0 1 32 0'/%3E%3Cpath d='M-40 20a40 40 0 0 1 80 0M40 20a40 40 0 0 1 80 0'/%3E%3C/g%3E%3C/svg%3E")`;
  return (
    <AbsoluteFill style={{ backgroundColor: tone === 'ink' ? colors.ink : colors.washi }}>
      <AbsoluteFill style={{ backgroundImage: pattern, backgroundSize: '80px 40px', opacity: tone === 'ink' ? 0.06 : 0.045 }} />
      {tone === 'light' && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(60% 40% at 85% 8%, ${colors.sakura}AA, transparent 70%), radial-gradient(50% 35% at 10% 95%, ${colors.sakura}66, transparent 70%)`,
          }}
        />
      )}
    </AbsoluteFill>
  );
};

const PETAL = 'M0 0c-6-6-7-15-2-20l2 3 2-3c5 5 4 14-2 20z';

/** Deterministic falling sakura petals (same seed → identical render every time). */
export const FallingPetals: React.FC<{ count?: number; seed?: string; opacity?: number }> = ({
  count = 14,
  seed = 'petals',
  opacity = 0.85,
}) => {
  const frame = useCurrentFrame();
  const { height, width } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {Array.from({ length: count }, (_, i) => {
        const r = (k: string) => random(`${seed}-${i}-${k}`);
        const speed = 2.2 + r('speed') * 2.6; // px per frame
        const size = 26 + r('size') * 34;
        const startY = -100 - r('y') * height;
        const y = ((startY + frame * speed) % (height + 200)) + (startY + frame * speed < 0 ? 0 : -100);
        const x = r('x') * width + Math.sin((frame + r('phase') * 200) / (28 + r('w') * 30)) * (40 + r('amp') * 60);
        const rot = frame * (0.8 + r('rot') * 1.6) + r('r0') * 360;
        const flip = Math.cos((frame + i * 13) / 18);
        return (
          <svg
            key={i}
            viewBox="-8 -21 16 22"
            width={size}
            height={size * 1.35}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              opacity,
              transform: `rotate(${rot}deg) scaleX(${0.35 + Math.abs(flip) * 0.65})`,
            }}
          >
            <path d={PETAL} fill={colors.petal} />
          </svg>
        );
      })}
    </AbsoluteFill>
  );
};

/** The logo mark: vermilion sun with a five-petal sakura cut-out. `progress` 0→1 draws it in. */
export const LogoMark: React.FC<{ size: number; progress?: number }> = ({ size, progress = 1 }) => (
  <svg viewBox="0 0 40 40" width={size} height={size}>
    <circle cx="20" cy="20" r={19 * Math.min(1, progress * 1.4)} fill={colors.vermilion} />
    <g fill={colors.washi}>
      {[0, 72, 144, 216, 288].map((deg, i) => {
        const p = interpolate(progress, [0.25 + i * 0.1, 0.55 + i * 0.1], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <path
            key={deg}
            transform={`rotate(${deg} 20 20) translate(20 20) scale(${p}) translate(-20 -20)`}
            d="M20 19.2c-2.9-2.6-3.8-6.2-2.2-8.9l1.4 1.3.8-2 .8 2 1.4-1.3c1.6 2.7.7 6.3-2.2 8.9z"
          />
        );
      })}
    </g>
    <circle cx="20" cy="20" r={1.6 * progress} fill={colors.vermilion} />
  </svg>
);

/** Sun + torii illustration (same drawing as the website hero). `frame0` = scene-local start. */
export const SunAndTorii: React.FC<{ width: number }> = ({ width }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sun = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 40 });
  const gate = spring({ frame: frame - 14, fps, config: { damping: 14, mass: 0.8 } });
  return (
    <svg viewBox="0 0 500 440" width={width} height={(width * 440) / 500}>
      <defs>
        <radialGradient id="sun" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#D9433C" />
          <stop offset="100%" stopColor="#B92A24" />
        </radialGradient>
      </defs>
      <rect x="20" y="20" width="460" height="400" rx="36" fill={colors.sakura} fillOpacity="0.45" />
      <circle
        cx="300"
        cy={170 + (1 - sun) * 70}
        r={104 * (0.9 + sun * 0.1)}
        fill="url(#sun)"
        opacity={sun}
      />
      <path d="M20 330 L140 238 L210 286 L300 214 L420 316 L480 286 V420 H20 Z" fill="#E7DFD4" />
      <path d="M20 360 L120 300 L200 338 L290 288 L400 352 L480 330 V420 H20 Z" fill="#D9CFC1" />
      <g fill={colors.ink} opacity={gate} transform={`translate(0 ${(1 - gate) * 30})`}>
        <path d="M118 150 Q250 128 382 150 L386 166 Q250 148 114 166 Z" />
        <rect x="132" y="176" width="236" height="11" rx="2" />
        <rect x="160" y="160" width="14" height="230" rx="3" />
        <rect x="326" y="160" width="14" height="230" rx="3" />
        <rect x="244" y="160" width="12" height="27" />
      </g>
    </svg>
  );
};

/** Fade + rise entrance helper for text blocks, staggered by `delay` frames. */
export const useEnter = (delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: 28 });
  return { opacity: p, transform: `translateY(${(1 - p) * 40}px)` } as const;
};
