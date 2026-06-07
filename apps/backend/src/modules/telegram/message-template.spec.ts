import { buildTemplateContext, renderTemplate } from './message-template';

describe('message-template', () => {
  const stats = {
    current: 2400,
    day: { changePercent: 1.2, changeAmount: 28, high: 2410, low: 2380, open: 2372 },
    week: { changePercent: -0.5 },
  };

  describe('buildTemplateContext', () => {
    it('formats gold values with sign and symbol', () => {
      const ctx = buildTemplateContext('XAU', stats, 80);
      expect(ctx.metalName).toBe('Gold');
      expect(ctx.symbol).toBe('XAU/USD');
      expect(ctx.price).toBe('2,400.00');
      expect(ctx.dayChangePercent).toBe('+1.20');
      expect(ctx.weekChangePercent).toBe('-0.50');
      expect(ctx.ratio).toBe('80.0');
    });

    it('falls back to em-dash for missing values', () => {
      const ctx = buildTemplateContext('XAG', { current: 30, day: {}, week: {} }, null);
      expect(ctx.metalName).toBe('Silver');
      expect(ctx.high).toBe('—');
      expect(ctx.ratio).toBe('—');
    });
  });

  describe('renderTemplate', () => {
    it('replaces known placeholders and leaves unknown ones intact', () => {
      const ctx = buildTemplateContext('XAG', { current: 30, day: {}, week: {} }, null);
      const out = renderTemplate('{emoji} {metalName} ${price} {bogus}', ctx);
      expect(out).toBe('🥈 Silver $30.00 {bogus}');
    });
  });
});
