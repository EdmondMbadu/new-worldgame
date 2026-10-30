import { StarterBrief } from '../../../functions/src/shared/starter-brief';
/** Vector text PDF; no screenshot rasterization, external fonts, or canvas dependency. */
export async function starterBriefPdf(brief:StarterBrief):Promise<Uint8Array> {
  const {jsPDF}=await import('jspdf');
  const doc=new jsPDF({unit:'pt',format:'a4'});
  const margin=44,width=doc.internal.pageSize.getWidth(),height=doc.internal.pageSize.getHeight(),column=width-margin*2;
  let y=52;
  const clean=(text:string)=>text.replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/…/g,'...').replace(/[^\x20-\x7E\n\u00a0-\u00ff]/g,'');
  function room(space:number){if(y+space>height-48){doc.addPage();y=48;}}
  function text(value:string,size=10,serif=false,color:[number,number,number]=[20,45,75]){
    doc.setFont(serif?'times':'helvetica','normal');doc.setFontSize(size);doc.setTextColor(...color);
    const lines=doc.splitTextToSize(clean(value),column) as string[];
    for(const line of lines){room(size*1.45);doc.text(line,margin,y);y+=size*1.4;}
    y+=6;
  }
  function section(label:string,value:string){room(47);y+=10;text(label.toUpperCase(),8,false,[51,119,119]);text(value);}
  doc.setDrawColor(181,78,50);doc.setLineWidth(3);doc.line(margin,32,width-margin,32);
  text('GLOBAL SOLUTIONS LAB  /  COMMUNITY STARTING BRIEF',8,false,[51,119,119]);y+=12;
  text(brief.title,29,true);text(brief.summary,11,false,[80,105,121]);
  section('The community challenge',brief.challenge);
  section('What success could look like',brief.success);
  section('Ideas to explore - suggestions',brief.approaches.map(idea=>`${idea.title}\n${idea.text}`).join('\n\n'));
  section('A possible first test',brief.firstTest);
  section('Questions to investigate',brief.questions.map(question=>`- ${question}`).join('\n'));
  section('Build this with us',brief.invitation);
  const pages=doc.getNumberOfPages();
  for(let i=1;i<=pages;i++){doc.setPage(i);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(110,127,139);doc.text('Prepared with AI Bucky. Starting draft; ideas and assumptions need testing.',margin,height-24);doc.text(`${i} / ${pages}`,width-margin,height-24,{align:'right'});}
  return new Uint8Array(doc.output('arraybuffer'));
}
