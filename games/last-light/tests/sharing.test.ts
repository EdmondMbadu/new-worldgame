import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { shareChallenge, challengeCard } from '../src/sharing';
import { setLanguage } from '../src/locale';
beforeEach(() => { vi.stubGlobal('location', { origin: 'http://localhost:4200' }); setLanguage('en'); });
afterEach(() => { setLanguage('en'); vi.unstubAllGlobals(); });
it('shares the actual delivery, impact, attribution and a playable public URL from localhost', () => {
  const share = shareChallenge(1, 'standard', 0, 1520);
  expect(share.text).toContain('1,520 points driving solar panels and batteries to CEAC Nganga–Tsanga');
  expect(share.text).toContain('25,000'); expect(share.text).toContain('Nearly 1 billion');
  expect(share.text).toContain('Powered by Astra 6 and the Global Solutions Lab.');
  expect(share.xText.length + 24).toBeLessThanOrEqual(280);
  expect(new URL(share.url).origin).toBe('https://newworld-game.org');
  expect(new URL(share.links.WhatsApp).searchParams.get('text')).toBe(`${share.text}\n${share.url}`);
  expect(decodeURIComponent(share.links.Email)).toContain(share.text);
});
it('does not invent a score when inviting without a completed delivery', () => {
  const share = shareChallenge(0, 'relaxed', 1);
  expect(share.text).not.toContain('I scored'); expect(share.text).toContain('Try this Let There Be Light game');
});
it('renders the supplied driving screenshot into the downloadable score image', async () => {
  const drawImage = vi.fn(), fillText = vi.fn();
  const canvas = { width: 0, height: 0, getContext: () => ({ fillRect: vi.fn(), drawImage, fillText }), toBlob: (cb: (blob: Blob) => void) => cb(new Blob(['png'], { type: 'image/png' })) };
  vi.stubGlobal('document', { createElement: () => canvas });
  const decode = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('Image', class { width = 1230; height = 870; src = ''; decode = decode; });
  const card = await challengeCard(1, 1520);
  expect(card.type).toBe('image/png'); expect(decode).toHaveBeenCalled();
  expect(drawImage.mock.calls[0][0].src).toContain('story/share-drive.jpg');
  expect(fillText.mock.calls.some(c => c[0].includes('1,520'))).toBe(true);
  expect(fillText.mock.calls.some(c => c[0] === 'CEAC Nganga–Tsanga')).toBe(true);
});

it('keeps X invitations within its limit for every clinic in both languages', () => {
  for (const language of ['en', 'fr'] as const) {
    setLanguage(language);
    for (let mission = 0; mission < 5; mission++)
      expect(shareChallenge(mission, 'standard', 0, 9999).xText.length + 24).toBeLessThanOrEqual(280);
  }
});
