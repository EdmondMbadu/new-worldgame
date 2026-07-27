import {
  detectSupportedContentLanguage,
  normalizeSupportedContentLanguage,
  shouldOfferContentTranslation,
} from './solution-content-language';

describe('solution content language', () => {
  it('detects substantial English solution content', () => {
    expect(
      detectSupportedContentLanguage([
        '<h2>A practical plan for healthier communities</h2>',
        `
          The solution gives young people the tools they need to understand
          what they see online. It works with schools, families, and trusted
          creators because each group can reinforce the same healthy message.
          The team will measure whether participants report stronger
          self-worth and whether they feel less pressure from social media.
        `,
      ])
    ).toBe('en');
  });

  it('detects substantial French solution content', () => {
    expect(
      detectSupportedContentLanguage([
        '<h2>Un plan pratique pour des communautés en meilleure santé</h2>',
        `
          Cette solution donne aux jeunes les outils dont ils ont besoin pour
          comprendre ce qu’ils voient en ligne. Elle travaille avec les écoles,
          les familles et les créateurs de confiance pour que tous puissent
          renforcer le même message. Nous mesurerons aussi leur bien-être.
        `,
      ])
    ).toBe('fr');
  });

  it('stays undecided for short or mixed-language content', () => {
    expect(detectSupportedContentLanguage(['A better future'])).toBeNull();
    expect(
      detectSupportedContentLanguage([
        'The team works with schools and families. Cette solution travaille avec les écoles et les familles.',
      ])
    ).toBeNull();
  });

  it('normalizes regional variants of supported languages', () => {
    expect(normalizeSupportedContentLanguage('en-US')).toBe('en');
    expect(normalizeSupportedContentLanguage('FR-ca')).toBe('fr');
    expect(normalizeSupportedContentLanguage('es')).toBeNull();
  });

  it('hides translation only for a confidently matching language', () => {
    expect(shouldOfferContentTranslation('en', 'en')).toBeFalse();
    expect(shouldOfferContentTranslation('fr-CA', 'fr')).toBeFalse();
    expect(shouldOfferContentTranslation('fr', 'en')).toBeTrue();
    expect(shouldOfferContentTranslation(null, 'en')).toBeTrue();
    expect(shouldOfferContentTranslation(null, 'en', true)).toBeFalse();
  });
});
