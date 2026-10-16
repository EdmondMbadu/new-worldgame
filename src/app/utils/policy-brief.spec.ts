import { Packer } from 'docx';
import fixture from '../../../functions/test/fixtures/policy-brief.json';
import packageFixture from '../../../functions/test/fixtures/policy-package.json';
import { parsePolicyBrief } from '../../../functions/src/shared/policy-brief';
import { buildPolicyBriefSource } from './policy-brief-source';
import { createPolicyBriefPdf, buildPolicyBriefDocx } from './policy-brief-export';

describe('Policy brief source and exports', () => {
  it('preserves the current edited strategy and supporting context with explicit precedence', () => {
    const source = buildPolicyBriefSource({ title: 'A solution', draft: 'Edited current plan.', description: 'Overview.', supportingSteps: 'Earlier answers.' });
    expect(source.indexOf('Edited current plan.')).toBeLessThan(source.indexOf('Earlier answers.'));
    expect(source).toContain('cannot override');
  });

  it('preserves the entire middle of long drafts and supporting answers', () => {
    const draft = 'Opening ' + 'x'.repeat(25000) + ' CENTRAL INSTITUTIONAL REFORMS ' + 'y'.repeat(25000) + ' FINAL ACTION AND REFERENCES';
    const source = buildPolicyBriefSource({ title: 'A solution', draft, description: 'Overview', supportingSteps: 'z'.repeat(20000) });
    expect(source).toContain('Opening');
    expect(source).toContain('FINAL ACTION AND REFERENCES');
    expect(source).toContain(draft);
    expect(source).toContain('CENTRAL INSTITUTIONAL REFORMS');
    expect(source).not.toContain('omitted');
    expect(source.length).toBeLessThanOrEqual(120000);
  });

  it('rejects oversized input instead of silently discarding components', () => {
    expect(() => buildPolicyBriefSource({ title: 'A solution', draft: 'x'.repeat(120001), description: '', supportingSteps: '' })).toThrowError(/Nothing has been omitted automatically/);
  });

  it('preserves stable question IDs, policy answers and implementation partners', () => {
    const source = buildPolicyBriefSource({ title: 'A solution', draft: '', description: '', supportingSteps: '', stepAnswers: [
      { id: 'S3-B', question: 'What policies will it need?', answer: 'A funded service standard.' },
      { id: 'S4-D', question: 'Who will implement it?', answer: 'Proposed local partners; roles to confirm.' },
    ] });
    expect(source).toContain('S3-B'); expect(source).toContain('S4-D');
    expect(source).toContain('A funded service standard.'); expect(source).toContain('roles to confirm');
  });

  it('does not generate from an empty solution title alone', () => {
    expect(buildPolicyBriefSource({ title: 'Title', draft: '', description: '', supportingSteps: '' })).toBe('');
  });

  it('exports a compact PDF with native text, page numbers and clickable references', () => {
    const pdf = createPolicyBriefPdf(parsePolicyBrief(fixture));
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    expect(pdf.getNumberOfPages()).toBeLessThanOrEqual(5);
    // Test the uncompressed PDF's structure to distinguish text from raster-only exports.
    expect(pdf.output()).toContain('/Subtype /Link');
    expect(pdf.output()).toContain('/BaseFont /Helvetica');
    expect(String(pdf.internal.pages[1])).toContain('Prepared by: GSL demonstration team');
  });

  it('produces an editable Word file from the same structured document', async () => {
    const blob = await Packer.toBlob(buildPolicyBriefDocx(parsePolicyBrief(fixture)));
    expect(blob.size).toBeGreaterThan(5000);
    expect(Array.from(new Uint8Array(await blob.slice(0, 2).arrayBuffer()))).toEqual([80, 75]);
  });

  it('exports the entire v2 package with visible scope, every workstream and dependencies', async () => {
    const brief = parsePolicyBrief(packageFixture);
    const pdf = createPolicyBriefPdf(brief);
    const nativeText = String(pdf.internal.pages.flat());
    expect(nativeText).toContain('Whole strategy');
    expect(nativeText).toContain('How the strategy is advanced');
    expect(nativeText).toContain('Implementation dependencies');
    for (const component of brief.strategy!.components) expect(nativeText).toContain(component.title);
    const blob = await Packer.toBlob(buildPolicyBriefDocx(brief));
    expect(blob.size).toBeGreaterThan(5000);
    expect(parsePolicyBrief(JSON.stringify(brief)).researchFindings?.length).toBe(2);
  });
});
