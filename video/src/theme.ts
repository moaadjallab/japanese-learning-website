/** Brand tokens (same palette as src/styles/global.css) and fonts for the promo video. */
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadArabic } from '@remotion/google-fonts/IBMPlexSansArabic';
import { loadFont as loadJp } from '@remotion/google-fonts/NotoSerifJP';

export const colors = {
  washi: '#FAF8F5',
  paper: '#FFFFFF',
  ink: '#1B1B1F',
  inkSoft: '#3F3F46',
  muted: '#5F5A52',
  vermilion: '#C8312B',
  vermilionDark: '#A3241F',
  sakura: '#F3D6DC',
  sakuraSoft: '#FBF0F2',
  petal: '#E8A6B4',
  stone: '#E2DCD2',
};

const inter = loadInter('normal', { weights: ['400', '600', '700', '800'], subsets: ['latin'] });
const arabic = loadArabic('normal', { weights: ['400', '600', '700'], subsets: ['arabic', 'latin'] });
const jp = loadJp('normal', { weights: ['600'], ignoreTooManyRequestsWarning: true });

export const fonts = {
  latin: inter.fontFamily,
  arabic: `${arabic.fontFamily}, ${inter.fontFamily}`,
  jp: jp.fontFamily,
};

export const textFont = (lang: 'en' | 'ar') => (lang === 'ar' ? fonts.arabic : fonts.latin);

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
