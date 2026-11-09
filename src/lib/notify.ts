import type {SupabaseClient} from '@supabase/supabase-js';
import {notificationPayload,postNotification} from './formspree';
export async function notify(db:SupabaseClient,id:string){
 if(process.env.FORMSPREE_ENABLED!=='true')return 'pending';
 const claimed=await db.from('lead_records').update({notification_status:'sending'}).eq('id',id).eq('notification_status','pending').is('deleted_at',null).select().maybeSingle();
 if(claimed.error||!claimed.data)return 'pending';
 const status=await postNotification(notificationPayload(claimed.data));
 const stored=await db.from('lead_records').update({notification_status:status}).eq('id',id).eq('notification_status','sending');
 return stored.error?'unknown':status;
}
