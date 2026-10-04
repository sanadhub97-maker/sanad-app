// Real HTTP authentication, RBAC and database checks in an owned temporary schema.
// Never runs schedulers, emails, WhatsApp or production restore/delete operations.
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');const assert=require('node:assert/strict');
const {Client}=require('pg');const request=require('supertest');
const base=process.env.SECURITY_TEST_DATABASE_URL;
if(!base)throw new Error('Set SECURITY_TEST_DATABASE_URL explicitly; there is no production fallback');
const schema='sanad_test_'+crypto.randomBytes(8).toString('hex');
const safeSchema=()=>{if(!/^sanad_test_[a-f0-9]{16}$/.test(schema))throw new Error('Unsafe test schema');return '"'+schema+'"'};
const url=new URL(base);url.searchParams.set('schema',schema);url.searchParams.set('options','-c search_path='+schema);if(!['localhost','127.0.0.1','::1'].includes(url.hostname))url.searchParams.set('sslmode','verify-full');
// Synthetic secrets override every real credential before importing application code.
Object.assign(process.env,{NODE_ENV:'test',DATABASE_URL:url.href,DIRECT_URL:url.href,CLIENT_URL:'https://security.example.invalid',TRUSTED_ORIGINS:'',TRUST_PROXY_HOPS:'0',JWT_ACCESS_SECRET:crypto.randomBytes(48).toString('hex'),JWT_REFRESH_SECRET:crypto.randomBytes(48).toString('hex'),SETTINGS_ENCRYPTION_KEY:crypto.randomBytes(48).toString('hex'),EMAIL_ENABLED:'false',WHATSAPP_ENABLED:'false',STORAGE_DRIVER:'local',UPLOAD_DIR:path.resolve('.security-audit',schema)});
const results=[];let prisma;let created=false;let stage="connect isolated database";
(async()=>{
 const c=new Client({connectionString:base,connectionTimeoutMillis:15000});await c.connect();
 try{
  await c.query('CREATE SCHEMA '+safeSchema());created=true;await c.query('SET search_path TO '+safeSchema());
  const dirs=fs.readdirSync('server/prisma/migrations').filter(n=>fs.existsSync('server/prisma/migrations/'+n+'/migration.sql')).sort();
  for(const dir of dirs){stage='migration '+dir;await c.query(fs.readFileSync('server/prisma/migrations/'+dir+'/migration.sql','utf8'));}
  results.push({check:'fresh ordered migration chain',passed:true,migrations:dirs.length});
  stage='tax baseline replay';
  const baseline=fs.readFileSync('server/prisma/migrations/20261004180000_tax_returns_baseline/migration.sql','utf8');
  await c.query(`INSERT INTO "TaxReturn" (id,kind,year,"dueDate","updatedAt","ownerName") VALUES ('preserve-fixture','VAT',2026,'2026-10-31',CURRENT_TIMESTAMP,'Synthetic owner')`);
  await c.query(baseline);
  assert.equal((await c.query(`SELECT "ownerName" FROM "TaxReturn" WHERE id='preserve-fixture'`)).rows[0].ownerName,'Synthetic owner');
  results.push({check:'baseline replay preserves existing tax records',passed:true});
  const cols=await c.query(`SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema=$1 AND table_name='TaxReturn'`,[schema]);assert.equal(cols.rows[0].n,32);
  const fk=await c.query(`SELECT count(*)::int AS n FROM pg_constraint WHERE conrelid='"TaxReturn"'::regclass AND contype='f' AND convalidated`);assert.equal(fk.rows[0].n,4);
  stage='verify application schema';
  prisma=require('../server/dist/lib/prisma').prisma;
  const current=await prisma.$queryRawUnsafe('SELECT current_schema() AS schema');assert.equal(current[0].schema,schema);assert.equal(await prisma.user.count(),0);
  require('../server/dist/lib/logger').logger.level='silent';
  const {createApp}=require('../server/dist/app');const app=createApp();
  stage='create synthetic role fixtures';
  const password='SyntheticPass123456';const {hashPassword}=require('../server/dist/lib/password');const hash=await hashPassword(password);
  const definitions={'Super Admin':['*'],Admin:['*'],Accountant:['payments.view','payments.create','payments.edit','payments.export','taxReturns.view','taxReturns.create','violations.view','violations.pay','files.view'],'HR':['employees.view','employeeDocuments.view','violations.view','users.edit','files.view','payments.view','taxReturns.view','violations.pay'],Manager:['*'],Viewer:['employees.view'],Employee:[]};
  const people={};const roles={};
  for(const [name,keys]of Object.entries(definitions)){
   const role=await prisma.role.create({data:{name}});roles[name]=role;
   for(const key of keys){const p=await prisma.permission.upsert({where:{key},create:{key,module:key.split('.')[0]},update:{}});await prisma.rolePermission.create({data:{roleId:role.id,permissionId:p.id}})}
   people[name]=await prisma.user.create({data:{fullName:'Synthetic '+name,email:name.toLowerCase().replaceAll(' ','-')+'@fixture.invalid',passwordHash:hash,userRoles:{create:{roleId:role.id}}}});
  }
  const login=async name=>{stage='login '+name;const r=await request(app).post('/api/auth/login').send({email:people[name].email,password,rememberMe:false});assert.equal(r.status,200,'login '+name);assert.equal(r.headers['cache-control'].includes('no-store'),true);return r.body.data.accessToken};
  const tokens={};for(const name of Object.keys(people))tokens[name]=await login(name);
  const check=async(name,method,route,status,body,token)=>{stage=name;let q=request(app)[method](route);if(token)q=q.set('Authorization','Bearer '+token);if(body)q=q.send(body);const r=await q;assert.equal(r.status,status,name+': '+r.status);results.push({check:name,passed:true});return r};
  for(const name of Object.keys(people)){
   const finance=['Super Admin','Admin','Accountant'].includes(name);
   await check(name+' payment visibility','get','/api/payments',finance?200:403,null,tokens[name]);
   await check(name+' tax visibility','get','/api/tax-returns',finance?200:403,null,tokens[name]);
   await check(name+' backup administration','get','/api/maintenance/backups',name==='Super Admin'?200:403,null,tokens[name]);
  }
  await check('unauthenticated private data','get','/api/payments',401);
  await check('forged bearer token','get','/api/payments',401,null,'invalid-fixture-token');
  await check('HR cannot self-promote','put','/api/users/'+people.HR.id,403,{roleIds:[roles['Super Admin'].id]},tokens.HR);
  assert.equal(await prisma.userRole.count({where:{userId:people.HR.id,roleId:roles['Super Admin'].id}}),0);
  await check('Admin wildcard cannot alter role definitions','post','/api/roles',403,{name:'Forbidden escalation',permissionKeys:['*']},tokens.Admin);
  const taxBody={kind:'VAT',year:2026,quarter:3,dueDate:'2026-10-31',ownerName:'Synthetic owner'};
  const newTax=await check('accountant can save owner name','post','/api/tax-returns',201,taxBody,tokens.Accountant);
  assert.equal(newTax.body.ownerName,taxBody.ownerName);
  await check('HR cannot create tax returns','post','/api/tax-returns',403,taxBody,tokens.HR);
  const file=await prisma.file.create({data:{originalName:'synthetic-private.pdf',storedName:'synthetic-private.pdf',mimeType:'application/pdf',size:9,module:'payment',uploadedById:people.Accountant.id}});
  await check('HR cannot download a financial attachment','get','/api/files/'+file.id+'/download',403,null,tokens.HR);
  await check('viewer cannot inspect a financial file','get','/api/files/'+file.id,403,null,tokens.Viewer);
  await check('anonymous cannot fetch private file via public route','get','/api/files/public/'+file.id,403);
  const employeeFile=await prisma.file.create({data:{originalName:'synthetic-employee.pdf',storedName:'synthetic-employee.pdf',mimeType:'application/pdf',size:9,module:'employee',uploadedById:people.HR.id}});
  await check('accountant cannot attach a staff file to a tax return','post','/api/tax-returns',400,{...taxBody,fileId:employeeFile.id},tokens.Accountant);
  // Current database permissions are authoritative even for an already-issued token.
  await prisma.rolePermission.deleteMany({where:{roleId:roles.Accountant.id}});
  await check('role revocation applies to existing token','get','/api/payments',403,null,tokens.Accountant);
  const {verifyAccessToken}=require('../server/dist/lib/jwt');
  await prisma.session.update({where:{id:verifyAccessToken(tokens.Viewer).sid},data:{revokedAt:new Date()}});
  await check('revoked session cannot fetch profile','get','/api/auth/me',401,null,tokens.Viewer);
  await prisma.user.update({where:{id:people.Admin.id},data:{isActive:false}});
  await check('deactivated account cannot use old token','get','/api/payments',401,null,tokens.Admin);
  await check('deactivated account cannot log in','post','/api/auth/login',401,{email:people.Admin.email,password});
  await prisma.session.update({where:{id:verifyAccessToken(tokens.Employee).sid},data:{expiresAt:new Date(0)}});
  await check('expired session cannot fetch profile','get','/api/auth/me',401,null,tokens.Employee);
  await new Promise(resolve=>setTimeout(resolve,200));
  const notifications=await prisma.notification.count();assert.equal(notifications,0);
  console.log(JSON.stringify({passed:results.length,results,noNotificationsSent:true,isolatedSchema:true}));
  fs.writeFileSync('.security-audit/authenticated-integration.json',JSON.stringify({passed:results.length,results,noNotificationsSent:true,isolatedSchema:true},null,2));
 }finally{
  if(prisma)await prisma.$disconnect();
  if(created){await c.query('RESET search_path');await c.query('DROP SCHEMA '+safeSchema()+' CASCADE')}
  await c.end();
 }
})().catch(e=>{const message=(stage+': '+(e.code||e.name)+': '+String(e.message)).replace(/postgres(?:ql)?:\/\/[^\s]+/gi,'[REDACTED]').replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A');console.error('::error title=Isolated security integration::'+message);process.exitCode=1});

