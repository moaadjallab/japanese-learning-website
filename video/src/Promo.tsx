/** Full promo: seven scenes chained with fade / slide transitions. */
import { linearTiming, springTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { getCopy, type Lang } from './copy';
import {
  CoursesScene,
  CtaScene,
  FeaturesScene,
  HeroScene,
  IntroScene,
  LevelsScene,
  PlansScene,
} from './scenes/Scenes';

export const SCENES = [IntroScene, HeroScene, LevelsScene, CoursesScene, FeaturesScene, PlansScene, CtaScene];
const DURATIONS = [110, 160, 170, 180, 160, 150, 150];
const TRANSITION = 20;

/** Total length: scene durations minus the overlap of each transition. */
export const PROMO_FRAMES = DURATIONS.reduce((a, b) => a + b, 0) - TRANSITION * (DURATIONS.length - 1);

export const Promo: React.FC<{ lang: Lang }> = ({ lang }) => {
  const copy = getCopy(lang);
  // Slides follow reading direction: content enters from the end side.
  const forward = lang === 'ar' ? 'from-left' : 'from-right';
  return (
    <TransitionSeries>
      {SCENES.map((Scene, i) => [
        <TransitionSeries.Sequence key={`s${i}`} durationInFrames={DURATIONS[i]!}>
          <Scene copy={copy} />
        </TransitionSeries.Sequence>,
        i < SCENES.length - 1 && (
          <TransitionSeries.Transition
            key={`t${i}`}
            presentation={i % 2 === 0 ? fade() : slide({ direction: forward })}
            timing={
              i % 2 === 0
                ? linearTiming({ durationInFrames: TRANSITION })
                : springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION })
            }
          />
        ),
      ])}
    </TransitionSeries>
  );
};
