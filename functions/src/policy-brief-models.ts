import { GoogleGenerativeAI } from '@google/generative-ai';
import { POLICY_BRIEF_RESEARCH_SYSTEM, POLICY_BRIEF_WRITING_SYSTEM, POLICY_BRIEF_REVIEW_SYSTEM } from './policy-brief-generation';
import { POLICY_BRIEF_PLANNING_SYSTEM } from './policy-brief-strategy';
import { preparePolicyResearchSources } from './policy-brief-sources';

/** Shared by the handler and live evaluations; at most seven bounded calls including repairs. */
export function createPolicyBriefModels(genAI: GoogleGenerativeAI) {
  const jsonModel = (systemInstruction: string, maxOutputTokens: number, thinkingBudget = 1024) => genAI.getGenerativeModel({
    model: 'gemini-2.5-flash', systemInstruction,
    generationConfig: { temperature: 0.1, maxOutputTokens, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget } } as any,
  });
  const planning = jsonModel(POLICY_BRIEF_PLANNING_SYSTEM, 9000);
  const researchModel = (model: string) => genAI.getGenerativeModel({
    model, systemInstruction: POLICY_BRIEF_RESEARCH_SYSTEM,
    generationConfig: { temperature: 0.15, maxOutputTokens: 6500 },
    tools: [{ google_search: {} }],
  } as any);
  const research = researchModel('gemini-2.5-flash');
  // A different supported model avoids simply repeating incomplete grounding metadata.
  const researchRetry = researchModel('gemini-3.8-flash');
  const writing = jsonModel(POLICY_BRIEF_WRITING_SYSTEM, 14000);
  // Use an independent, newer model for critical review rather than reinforcing
  // the writer's wording and unsupported assumptions in a second identical pass.
  const review = genAI.getGenerativeModel({
    model: 'gemini-3.8-flash', systemInstruction: POLICY_BRIEF_REVIEW_SYSTEM,
    generationConfig: { temperature: 0.1, maxOutputTokens: 16000, responseMimeType: 'application/json' },
  });
  return {
    plan: async (input: string) => (await planning.generateContent(input, { timeout: 45000 })).response.text(),
    research: async (input: string, retry = false) => preparePolicyResearchSources((await (retry ? researchRetry : research).generateContent(input, { timeout: retry ? 90000 : 65000 })).response),
    write: async (input: string) => (await writing.generateContent(input, { timeout: 65000 })).response.text(),
    review: async (input: string) => (await review.generateContent(input, { timeout: 65000 })).response.text(),
  };
}
