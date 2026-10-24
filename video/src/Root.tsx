import { Composition } from 'remotion';
import { Promo, PROMO_FRAMES } from './Promo';
import { FPS, HEIGHT, WIDTH } from './theme';

export const RemotionRoot: React.FC = () => (
  <>
    {(['en', 'ar'] as const).map((lang) => (
      <Composition
        key={lang}
        id={`promo-${lang}`}
        component={Promo}
        defaultProps={{ lang }}
        durationInFrames={PROMO_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    ))}
  </>
);
