import { describe, expect, it } from 'vitest';
import { chooseTooltipPlacement } from './placement';

describe('tooltip placement', () => {
  it('prefers bottom when there is room', () => {
    expect(
      chooseTooltipPlacement({
        targetTop: 80,
        targetBottom: 140,
        tooltipHeight: 160,
        viewportHeight: 800,
        preferred: 'bottom',
      }),
    ).toBe('bottom');
  });

  it('falls back to top when the bottom is tight', () => {
    expect(
      chooseTooltipPlacement({
        targetTop: 520,
        targetBottom: 760,
        tooltipHeight: 180,
        viewportHeight: 800,
        preferred: 'bottom',
      }),
    ).toBe('top');
  });
});
