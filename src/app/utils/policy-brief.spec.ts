import { Packer } from 'docx';
import fixture from '../../../functions/test/fixtures/policy-brief.json';
import { parsePolicyBrief } from '../../../functions/src/shared/policy-brief';
import { buildPolicyBriefSource } from './policy-brief-source';
import { createPolicyBriefPdf, buildPolicyBriefDocx } from './policy-brief-export';

describe('Policy brief source and exports', () => {
  it('preserves the current edited strategy and supporting context with explicit precedence', () => {
    const source = buildPolicyBriefSource({ title: 'A solution', draft: 'Edited current plan.', description: 'Overview.', supportingSteps: 'Earlier answers.' });
    expect(source.indexOf('Edited current plan.')).toBeLessThan(source.indexOf('Earlier answers.'));
    expect(source).toContain('cannot override');
  });

  it('retains the end of long drafts and discloses omissions within the input budget', () => {
    const source = buildPolicyBriefSource({ title: 'A solution', draft: 'Opening ' + 'x'.repeat(50000) + ' FINAL ACTION AND REFERENCES', description: 'Overview', supportingSteps: 'y'.repeat(20000) });
    expect(source).toContain('Opening');
    expect(source).toContain('FINAL ACTION AND REFERENCES');
    expect(source).toContain('middle omitted');
    expect(source.length).toBeLessThan(36000);
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
});
