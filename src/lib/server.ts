import {createClient} from '@supabase/supabase-js';
import {cookies} from 'next/headers';
export function client(token?:string){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!url||!key)throw new Error('Supabase pendiente de configuración');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:token?{headers:{Authorization:`Bearer ${token}`}}:undefined});}
export async function team(){const token=(await cookies()).get('mt-access')?.value;if(!token)throw new Error('Sesión requerida');const db=client(token);const {data,error}=await db.auth.getUser(token);if(error||!data.user)throw new Error('Sesión expirada');const member=await db.from('team_members').select('id').eq('id',data.user.id).maybeSingle();if(!member.data)throw new Error('Acceso restringido al equipo');return {db,user:data.user};}
export function sameOrigin(req:Request){return req.headers.get('origin')===new URL(req.url).origin;}
