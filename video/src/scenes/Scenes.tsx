/** The seven promo scenes. Each one uses scene-local frames (TransitionSeries resets them). */
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Copy } from '../copy';
import { colors, fonts, textFont } from '../theme';
import { FallingPetals, LogoMark, Paper, SunAndTorii, useEnter } from '../components/Visuals';

type SceneProps = { copy: Copy };

const Frame: React.FC<React.PropsWithChildren<SceneProps & { tone?: 'light' | 'ink' }>> = ({
  copy,
  tone = 'light',
  children,
}) => (
  <AbsoluteFill
    dir={copy.dir}
    style={{ fontFamily: textFont(copy.lang), color: tone === 'ink' ? colors.washi : colors.ink }}
  >
    <Paper tone={tone} />
    <AbsoluteFill style={{ padding: '170px 96px', justifyContent: 'center' }}>{children}</AbsoluteFill>
  </AbsoluteFill>
);

const Eyebrow: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => (
  <div
    style={{
      ...useEnter(delay),
      display: 'flex',
      alignItems: 'center',
      gap: 22,
      fontSize: 34,
      fontWeight: 700,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: colors.vermilion,
    }}
  >
    <span style={{ width: 56, height: 4, borderRadius: 2, background: colors.vermilion }} />
    {children}
  </div>
);

const Heading: React.FC<{ children: React.ReactNode; delay?: number; size?: number }> = ({
  children,
  delay = 0,
  size = 96,
}) => (
  <h1 style={{ ...useEnter(delay), margin: '28px 0 0', fontSize: size, lineHeight: 1.12, fontWeight: 800 }}>
    {children}
  </h1>
);

/** 1 — Logo mark draws in, brand name and tagline follow. */
export const IntroScene: React.FC<SceneProps> = ({ copy }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const draw = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 50 });
  const pop = spring({ frame, fps, config: { damping: 12, mass: 0.7 } });
  return (
    <Frame copy={copy}>
      <FallingPetals count={10} seed="intro" opacity={0.7} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 56 }}>
        <div style={{ transform: `scale(${0.6 + pop * 0.4}) rotate(${(1 - draw) * -40}deg)` }}>
          <LogoMark size={300} progress={draw} />
        </div>
        <div style={{ ...useEnter(30), fontSize: 104, fontWeight: 800, textAlign: 'center' }}>{copy.brand}</div>
        <div
          style={{ ...useEnter(42), fontSize: 42, color: colors.muted, textAlign: 'center', maxWidth: 820, lineHeight: 1.4 }}
        >
          {copy.tagline}
        </div>
      </AbsoluteFill>
    </Frame>
  );
};

/** 2 — The website's hero: headline over the sun + torii illustration. */
export const HeroScene: React.FC<SceneProps> = ({ copy }) => (
  <Frame copy={copy}>
    <FallingPetals count={8} seed="hero" opacity={0.6} />
    <div style={{ ...useEnter(0), display: 'flex', justifyContent: 'center' }}>
      <SunAndTorii width={820} />
    </div>
    <Heading delay={12} size={92}>
      {copy.heroTitle}
    </Heading>
    <p style={{ ...useEnter(24), margin: '32px 0 0', fontSize: 44, lineHeight: 1.45, color: colors.inkSoft }}>
      {copy.heroSubtitle}
    </p>
  </Frame>
);

/** 3 — Beginner → N1 as a rising staircase of level chips. */
export const LevelsScene: React.FC<SceneProps> = ({ copy }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const line = interpolate(frame, [20, 110], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <Frame copy={copy}>
      <Eyebrow>JLPT</Eyebrow>
      <Heading delay={6}>{copy.levelsHeading}</Heading>
      <div style={{ position: 'relative', marginTop: 90, display: 'flex', flexDirection: 'column', gap: 26 }}>
        <div
          style={{
            position: 'absolute',
            insetInlineStart: 44,
            top: 40,
            width: 6,
            height: `calc((100% - 80px) * ${line})`,
            borderRadius: 3,
            background: colors.vermilion,
            opacity: 0.25,
          }}
        />
        {copy.levels.map((level, i) => {
          const p = spring({ frame: frame - 18 - i * 12, fps, config: { damping: 14, mass: 0.6 } });
          const last = i === copy.levels.length - 1;
          return (
            <div
              key={level}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 34,
                marginInlineStart: i * 54,
                opacity: Math.min(1, p),
                transform: `translateX(${(copy.dir === 'rtl' ? 1 : -1) * (1 - p) * 80}px)`,
              }}
            >
              <span
                style={{
                  width: 94,
                  height: 94,
                  borderRadius: 47,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 34,
                  fontWeight: 800,
                  background: last ? colors.vermilion : colors.paper,
                  color: last ? colors.washi : colors.ink,
                  boxShadow: `0 0 0 3px ${last ? colors.vermilion : colors.stone}`,
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontSize: 64, fontWeight: 700 }}>{level}</span>
            </div>
          );
        })}
      </div>
    </Frame>
  );
};

/** 4 — Course cards with their kanji glyphs, popping in a 2-column grid. */
export const CoursesScene: React.FC<SceneProps> = ({ copy }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Frame copy={copy}>
      <Heading>{copy.coursesHeading}</Heading>
      <div style={{ marginTop: 80, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36 }}>
        {copy.courses.map((course, i) => {
          const p = spring({ frame: frame - 12 - i * 8, fps, config: { damping: 15, mass: 0.7 } });
          const float = Math.sin((frame + i * 20) / 22) * 6;
          return (
            <div
              key={course.title}
              style={{
                height: 360,
                borderRadius: 40,
                background: colors.paper,
                boxShadow: `0 0 0 2px ${colors.stone}, 0 24px 48px -24px rgba(27,27,31,0.25)`,
                padding: 40,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                opacity: Math.min(1, p),
                transform: `translateY(${(1 - p) * 120 + float}px) scale(${0.85 + p * 0.15})`,
              }}
            >
              <span
                dir="ltr"
                style={{
                  fontFamily: fonts.jp,
                  fontSize: 120,
                  lineHeight: 1,
                  color: i % 2 === 0 ? colors.vermilion : colors.ink,
                  textAlign: 'start',
                }}
              >
                {course.glyph}
              </span>
              <span style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.25 }}>{course.title}</span>
            </div>
          );
        })}
      </div>
    </Frame>
  );
};

/** 5 — "Why us" list: each feature ticks in with a vermilion check. */
export const FeaturesScene: React.FC<SceneProps> = ({ copy }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Frame copy={copy} tone="ink">
      <FallingPetals count={9} seed="features" opacity={0.5} />
      <Heading>{copy.featuresHeading}</Heading>
      <div style={{ marginTop: 90, display: 'flex', flexDirection: 'column', gap: 44 }}>
        {copy.features.map((feature, i) => {
          const p = spring({ frame: frame - 16 - i * 11, fps, config: { damping: 200 }, durationInFrames: 26 });
          const check = spring({ frame: frame - 24 - i * 11, fps, config: { damping: 10, mass: 0.5 } });
          return (
            <div
              key={feature}
              style={{ display: 'flex', alignItems: 'center', gap: 36, opacity: p, transform: `translateY(${(1 - p) * 40}px)` }}
            >
              <svg width={84} height={84} viewBox="0 0 24 24" style={{ flexShrink: 0, transform: `scale(${check})` }}>
                <circle cx="12" cy="12" r="12" fill={colors.vermilion} />
                <path
                  d="M7 12.5l3.2 3.2L17 9"
                  fill="none"
                  stroke={colors.washi}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="16"
                  strokeDashoffset={16 * (1 - Math.min(1, check))}
                />
              </svg>
              <span style={{ fontSize: 60, fontWeight: 700 }}>{feature}</span>
            </div>
          );
        })}
      </div>
    </Frame>
  );
};

/** 6 — Plans (names and features only: prices are not announced yet). */
export const PlansScene: React.FC<SceneProps> = ({ copy }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Frame copy={copy}>
      <Heading>{copy.plansHeading}</Heading>
      <div style={{ marginTop: 80, display: 'flex', flexDirection: 'column', gap: 34 }}>
        {copy.plans.map((plan, i) => {
          const p = spring({ frame: frame - 12 - i * 12, fps, config: { damping: 16, mass: 0.7 } });
          const hi = plan.highlighted;
          return (
            <div
              key={plan.name}
              style={{
                position: 'relative',
                borderRadius: 40,
                padding: '44px 48px',
                background: hi ? colors.ink : colors.paper,
                color: hi ? colors.washi : colors.ink,
                boxShadow: hi
                  ? `0 0 0 4px ${colors.vermilion}, 0 30px 60px -28px rgba(200,49,43,0.55)`
                  : `0 0 0 2px ${colors.stone}`,
                opacity: Math.min(1, p),
                transform: `translateY(${(1 - p) * 90}px) scale(${hi ? 1 + 0.03 * Math.min(1, p) : 1})`,
              }}
            >
              {hi && (
                <span
                  style={{
                    position: 'absolute',
                    top: -28,
                    insetInlineEnd: 48,
                    padding: '10px 26px',
                    borderRadius: 999,
                    background: colors.vermilion,
                    color: colors.washi,
                    fontSize: 28,
                    fontWeight: 700,
                  }}
                >
                  {copy.mostPopular}
                </span>
              )}
              <div style={{ fontSize: 58, fontWeight: 800 }}>{plan.name}</div>
              <div style={{ marginTop: 16, fontSize: 36, opacity: 0.8, lineHeight: 1.4 }}>
                {plan.features.join('  ·  ')}
              </div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
};

/** 7 — Final call to action: the sun rises behind the title, the button lands. */
export const CtaScene: React.FC<SceneProps> = ({ copy }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sun = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 60 });
  const button = spring({ frame: frame - 34, fps, config: { damping: 11, mass: 0.6 } });
  const pulse = 1 + Math.max(0, Math.sin((frame - 60) / 9)) * 0.03 * (frame > 60 ? 1 : 0);
  return (
    <Frame copy={copy} tone="ink">
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 250,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 45%, #D9433C, ${colors.vermilionDark})`,
          transform: `translate(-50%, ${(1 - sun) * 260}px)`,
          opacity: 0.9 * sun,
        }}
      />
      <FallingPetals count={12} seed="cta" opacity={0.75} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', padding: '0 96px 300px', gap: 40 }}>
        <div style={{ ...useEnter(14), fontSize: 96, fontWeight: 800, lineHeight: 1.12, textAlign: 'center' }}>
          {copy.ctaTitle}
        </div>
        <div style={{ ...useEnter(24), fontSize: 44, opacity: 0.85, textAlign: 'center' }}>{copy.ctaSubtitle}</div>
        <div
          style={{
            marginTop: 30,
            padding: '34px 72px',
            borderRadius: 999,
            background: colors.washi,
            color: colors.ink,
            fontSize: 46,
            fontWeight: 700,
            opacity: Math.min(1, button),
            transform: `scale(${(0.7 + button * 0.3) * pulse})`,
          }}
        >
          {copy.cta}
        </div>
        <div style={{ ...useEnter(50), marginTop: 50, display: 'flex', alignItems: 'center', gap: 22 }}>
          <LogoMark size={72} />
          <span style={{ fontSize: 44, fontWeight: 700 }}>{copy.brand}</span>
        </div>
      </AbsoluteFill>
    </Frame>
  );
};
