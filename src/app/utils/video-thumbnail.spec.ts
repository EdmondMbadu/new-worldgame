import { customVideoThumbnail, drawVideoThumbnail } from './video-thumbnail';

describe('video thumbnails', () => {
  it('produces an email-sized JPEG with a visible play affordance', async () => {
    const source = document.createElement('canvas'); source.width = 640; source.height = 480;
    const context = source.getContext('2d')!; context.fillStyle = '#ef4444'; context.fillRect(0, 0, 640, 480);
    const url = drawVideoThumbnail(source, 640, 480);
    expect(url.startsWith('data:image/jpeg;base64,')).toBeTrue();
    const image = new Image(); image.src = url; await image.decode();
    expect(image.naturalWidth).toBe(1200); expect(image.naturalHeight).toBe(675);
    expect(url.length).toBeLessThan(275000);
    const check = document.createElement('canvas'); check.width=1200; check.height=675;
    const ctx=check.getContext('2d')!; ctx.drawImage(image,0,0);
    const center=ctx.getImageData(600,337,1,1).data;
    expect(center[0]).toBeGreaterThan(230); expect(center[1]).toBeGreaterThan(230);
  });

  it('rejects unsupported custom thumbnails before decoding', async () => {
    await expectAsync(customVideoThumbnail(new File(['<svg/>'],'image.svg',{type:'image/svg+xml'}))).toBeRejectedWithError(/JPG, PNG, or WebP/);
  });
});
