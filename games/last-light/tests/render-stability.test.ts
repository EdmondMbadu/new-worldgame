import { describe, expect, it, vi } from 'vitest';
import { GameWorld } from '../src/world';
import { FrameHealth } from '../src/frame-health';

describe('frame presentation', () => {
  it('changes internal resolution without resizing the displayed canvas', () => {
    const world = Object.create(GameWorld.prototype);
    world.canvas = { clientWidth: 1280, clientHeight: 800 };
    world.pixelRatio = () => .6;
    world.renderer = { setPixelRatio: vi.fn(), setSize: vi.fn() };
    world.post = { setSize: vi.fn() };
    world.applyResolution();
    expect(world.post.setSize).toHaveBeenCalledWith(1280, 800, .6);
    expect(world.renderer.setPixelRatio).not.toHaveBeenCalled();
    expect(world.renderer.setSize).not.toHaveBeenCalled();
  });
  it.each(['scale', 'tier'] as const)('does not clear a presented frame when the governor requests a %s change', (change) => {
    // A browser canvas is not needed to exercise post-frame scheduling. Any
    // immediate resize/rebuild here would clear the frame the user just saw.
    const world = Object.create(GameWorld.prototype);
    world.frames = new FrameHealth();
    world.renderer = { info: { render: { calls: 10, triangles: 100 } } };
    world.governor = { sample: () => change, tier: 1 };
    world.pendingGraphics = null;
    world.applyResolution = vi.fn();
    world.applyTier = vi.fn();
    world.recordFrame(.03, 2, 20);
    expect(world.applyResolution).not.toHaveBeenCalled();
    expect(world.applyTier).not.toHaveBeenCalled();
    expect(world.pendingGraphics).toBe(change);
    // The queued change must be applied before any scene work on the next frame.
    const beginScene = vi.fn(() => { throw new Error('scene begins'); });
    Object.defineProperty(world, 'engine', { get: beginScene });
    expect(() => world.render(0)).toThrow('scene begins');
    expect(change === 'tier' ? world.applyTier : world.applyResolution).toHaveBeenCalledOnce();
    expect(world.pendingGraphics).toBeNull();
  });
  it('ignores duplicate ResizeObserver notifications without clearing the canvas', () => {
    const world = Object.create(GameWorld.prototype);
    world.canvas = { clientWidth: 1280, clientHeight: 800 };
    world.viewportWidth = 1280; world.viewportHeight = 800;
    world.renderer = { setSize: vi.fn() };
    expect(world.resize()).toBe(false);
    expect(world.renderer.setSize).not.toHaveBeenCalled();
  });
});
