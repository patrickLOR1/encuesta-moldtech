import test from 'node:test';import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://localhost:3100';
test('private records require authorization',async()=>{const r=await fetch(base+'/api/leads');assert.equal(r.status,401)});
test('session requires authentication',async()=>{const r=await fetch(base+'/api/session');assert.equal(r.status,401)});
test('cross-origin login denied',async()=>{const r=await fetch(base+'/api/session',{method:'POST',headers:{Origin:'https://invalid.example','Content-Type':'application/json'},body:JSON.stringify({email:'qa@example.com',password:'invalid'})});assert.equal(r.status,403)});
test('six incorrect passwords do not impose waiting period',async()=>{for(let i=0;i<6;i++){const r=await fetch(base+'/api/session',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:'jl.rangel@moldtech.mx',password:'QA-wrong-password'})});assert.equal(r.status,401)}});
test('root route serves application',async()=>{const r=await fetch(base);assert.equal(r.status,200);assert.match(await r.text(),/MoldTech/)});
