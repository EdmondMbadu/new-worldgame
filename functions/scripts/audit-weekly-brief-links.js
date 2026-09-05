#!/usr/bin/env node
// Read-only audit: reads cached sources, checks public destinations, writes only a local JSON report.
const fs = require('node:fs');
const admin = require('firebase-admin');
const { fetchSourcePage, pageProblem, normalizeSourceUrl } = require('../lib/brief-sources');
const args=process.argv.slice(2);
const arg=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const project=arg('--project','');
if(!project){console.error('Usage: node scripts/audit-weekly-brief-links.js --project PROJECT_ID [--limit 100] [--output report.json]');process.exit(1);}
const limit=Math.max(1,Math.min(200,Number(arg('--limit','100'))||100));
admin.initializeApp({projectId:project,credential:admin.credential.applicationDefault()});
(async()=>{
  const snapshot=await admin.firestore().collection('ai_insights_content_cache').orderBy('generatedAt','desc').limit(50).get();
  const candidates=new Map();
  for(const doc of snapshot.docs){
    const data=doc.data();
    const urls=Array.isArray(data.sources)?data.sources.map(s=>s.url):[...(String(data.fundersHtml||'')+String(data.newsHtml||'')).matchAll(/href=["']([^"']+)["']/g)].map(m=>m[1].replace(/&amp;/g,'&'));
    for(const raw of urls){const url=normalizeSourceUrl(raw);if(url&&!candidates.has(url)&&candidates.size<limit)candidates.set(url,doc.id);}
  }
  const results=[]; const entries=[...candidates];let index=0;
  await Promise.all(Array.from({length:3},async()=>{
    while(index<entries.length){const [url,cacheId]=entries[index++];
      try{const page=await fetchSourcePage(url);results.push({url,cacheId,finalUrl:page.url,httpStatus:page.status,title:page.title,result:pageProblem(page)||'reachable; editorial review required'});}
      catch(error){results.push({url,cacheId,result:'unverified',reason:error.message});}
    }
  }));
  const report={checkedAt:new Date().toISOString(),scope:'Cached source links only; delivered tracking redirects and editorial usefulness require separate review.',total:results.length,results};
  const output=arg('--output','');if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');else console.log(JSON.stringify(report,null,2));
  await admin.app().delete();
})().catch(error=>{console.error(error.message);process.exitCode=1;});
