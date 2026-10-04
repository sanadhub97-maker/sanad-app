const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const braceRoots=new Set([path.dirname(require.resolve('braces/package.json'))]);
for(const consumer of ['micromatch','chokidar']){
 const parent=path.dirname(require.resolve(consumer));
 braceRoots.add(path.dirname(require.resolve('braces/package.json',{paths:[parent]})));
}
const fingerprint=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for(const root of braceRoots){
 const braces=require(root);
 const label=path.relative(process.cwd(),root);
 test(`every consumer uses the tested local patch: ${label}`,()=>{
  assert.equal(require(path.join(root,'package.json')).version,'3.0.4');
  for(const file of ['lib/depth.js','lib/parse.js','lib/compile.js','lib/expand.js','lib/stringify.js'])assert.equal(fingerprint(path.join(root,file)),fingerprint(path.join(__dirname,'../vendor/braces',file)));
 });
 for(const method of ['compile','expand','stringify','parse'])test(`${method} rejects pathological nested input: ${label}`,()=>{
  const deep='{'.repeat(3000)+'a,b'+'}'.repeat(3000);
  assert.throws(()=>braces[method](deep),/safe depth/);
 });
 for(const method of ['compile','expand','stringify'])test(`${method} checks direct ASTs and cycles: ${label}`,()=>{
  let node={type:'text',value:'a'};
  for(let i=0;i<12000;i++)node={type:'root',nodes:[node]};
  assert.throws(()=>braces[method](node),/safe depth/);
  const cycle={type:'root',nodes:[]};cycle.nodes.push(cycle);
  assert.throws(()=>braces[method](cycle),/safe depth/);
 });
 test(`ordinary ranges, nesting and escaping remain compatible: ${label}`,()=>{
  assert.equal(braces.compile('a/{b,c}/d'),'a/(b|c)/d');
  assert.deepEqual(braces.expand('file-{001..003}.ts'),['file-001.ts','file-002.ts','file-003.ts']);
  assert.deepEqual(braces.expand('{a,{b,c}}'),['a','b','c']);
  assert.doesNotThrow(()=>braces.compile('\\{'.repeat(200)));
  assert.throws(()=>braces.parse('('.repeat(3000)+'a'+')'.repeat(3000)),/safe depth/);
 });
}
test('the glob consumer still matches the normal file patterns',()=>{
 const mm=require('micromatch');assert.equal(mm.isMatch('src/app.ts','src/*.{ts,tsx}'),true);assert.equal(mm.isMatch('src/app.png','src/*.{ts,tsx}'),false);
});

