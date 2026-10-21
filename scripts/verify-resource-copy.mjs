import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const target=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const audit=JSON.parse(fs.readFileSync(path.join(target,'audit/resource-audit.json'),'utf8'));
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);
const size=dir=>files(dir).reduce((n,f)=>n+fs.statSync(f).size,0);
const baseline=path.join(target,'.cache','original-build');
const config=fs.readFileSync(path.join(audit.source,'vite.config.ts'),'utf8');
const inputs=[...config.matchAll(/\w+:\s*'([^']+\.html)'/g)].map(m=>path.join(audit.source,m[1]));
await build({configFile:false,root:audit.source,base:'./',logLevel:'silent',cacheDir:path.join(target,'.cache/vite-baseline'),build:{outDir:baseline,emptyOutDir:true,rolldownOptions:{input:inputs}}});
const originalBuildBytes=size(baseline);
const originalBuildFiles=files(baseline).length;
const originalChanged=audit.originalHashes.filter(f=>!fs.existsSync(path.join(audit.source,f.path)) || crypto.createHash('sha256').update(fs.readFileSync(path.join(audit.source,f.path))).digest('hex')!==f.sha256).map(f=>f.path);
const copiedMissing=audit.retained.filter(f=>!fs.existsSync(path.join(target,f.path))).map(f=>f.path);
const copiedChanged=audit.retained.filter(f=>{
  const file=path.join(target,f.path);
  return fs.existsSync(file) && !fs.readFileSync(file).equals(fs.readFileSync(path.join(audit.source,f.path)));
}).map(f=>f.path);
const summary={originalAssetFiles:audit.retained.length+audit.excluded.length,retainedAssetFiles:audit.retained.length,excludedAssetFiles:audit.excluded.length,originalAssetBytes:[...audit.retained,...audit.excluded].reduce((n,f)=>n+f.bytes,0),retainedAssetBytes:audit.retained.reduce((n,f)=>n+f.bytes,0),originalBuildBytes,originalBuildFiles,optimizedBuildBytes:size(path.join(target,'dist')),optimizedBuildFiles:files(path.join(target,'dist')).length,originalChanged,copiedMissing,copiedChanged};
fs.writeFileSync(path.join(target,'audit/verification.json'),JSON.stringify(summary,null,2)+'\n');
// Only delete the disposable build created above within this new project's cache.
if (!path.resolve(baseline).startsWith(path.resolve(target)+path.sep)) throw Error('Invalid baseline directory');
fs.rmSync(baseline,{recursive:true,force:true});
console.log(JSON.stringify(summary,null,2));
if(originalChanged.length||copiedMissing.length||copiedChanged.length) process.exitCode=1;
