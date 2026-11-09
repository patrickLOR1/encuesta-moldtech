import {readFile} from 'node:fs/promises';import pg from 'pg';
const client=new pg.Client({connectionString:process.env.DATABASE_URL});try{await client.connect();await client.query(await readFile(new URL('../db/001-neon.sql',import.meta.url),'utf8'));console.log('Migration applied');}catch{console.error('Migration failed');process.exitCode=1;}finally{await client.end();}
