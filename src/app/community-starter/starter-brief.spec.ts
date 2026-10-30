import { StarterBrief, assertBriefClaims, parseStarterBrief } from '../../../functions/src/shared/starter-brief';
import { newStarterDraft, readStarterDraft, mapStarterToPlayground } from './starter-model';
export const SAMPLE_BRIEF: StarterBrief = {version:1,title:'Fresh food, closer to home',summary:'A community idea to make fresh food easier to reach.',challenge:'Older residents report a long journey to reach fresh food.',success:'Residents could access food close to home.',approaches:[{title:'A pickup partnership',text:'Explore a weekly pickup with willing volunteers.'}],firstTest:'Speak with residents about what would help.',questions:['Which barriers matter most?'],invitation:'Bring your local knowledge and help us test the idea.'};
describe('AI starting brief contract',()=>{
  it('accepts structured content and strips foreign output fields',()=>{
    const result=parseStarterBrief({...SAMPLE_BRIEF,rawHtml:'unsafe',solutionId:'not-a-workspace'});
    expect(result).toEqual(SAMPLE_BRIEF);
  });
  it('rejects markup, missing sections, and oversized outputs',()=>{
    for(const value of [{...SAMPLE_BRIEF,title:'<script>bad()</script>'},{...SAMPLE_BRIEF,questions:[]},{...SAMPLE_BRIEF,summary:'x'.repeat(401)}]) expect(()=>parseStarterBrief(value)).toThrow();
  });
  it('rejects new numeric assertions but allows numbers supplied by the author',()=>{
    expect(()=>assertBriefClaims({...SAMPLE_BRIEF,challenge:'This affects 5000 people.'},{problem:'Food access'})).toThrow();
    expect(()=>assertBriefClaims({...SAMPLE_BRIEF,challenge:'The author reports 20 affected households.'},{problem:'20 households reported this.'})).not.toThrow();
  });
  it('preserves an incomplete manual edit through refresh but blocks export validation',()=>{
    const draft=newStarterDraft();draft.answers['problem']='Food access';
    draft.brief={document:{...SAMPLE_BRIEF,title:''},sourceKey:'{}',generatedAt:1,edited:true,accepted:{}};
    const restored=readStarterDraft(JSON.stringify(draft));
    expect(restored?.brief?.document.title).toBe('');
    expect(()=>parseStarterBrief(restored!.brief!.document)).toThrow();
  });
  it('never maps unaccepted generated suggestions into playground answers',()=>{
    const draft=newStarterDraft();draft.answers['problem']='Food access';
    draft.brief={document:SAMPLE_BRIEF,sourceKey:'{}',generatedAt:1,edited:false,accepted:{}};
    expect(Object.keys(mapStarterToPlayground(draft).status)).toEqual(['S1-A']);
  });
});
