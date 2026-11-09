export const endpoint='https://formspree.io/f/mwllgpag';
type Answer=string|string[]|boolean;
export function notificationPayload(row:{id:string;created_at:string;answers:Record<string,Answer>}){
 const a=row.answers;const fields=[['fullName','Nombre completo'],['company','Empresa'],['role','Puesto'],['phone','Teléfono'],['email','Correo electrónico'],['location','Ubicación de la planta'],['machineCount','Número de máquinas'],['machineTypes','Tipo de máquinas que utilizan'],['monitoring','¿Actualmente cuentan con algún sistema de monitoreo?'],['productionLog','¿Cómo monitorean actualmente su producción?'],['problems','¿Qué problemas buscan resolver?'],['moldtechInterest','¿Qué les interesó más de MoldTech?'],['demoInterest','¿Les gustaría agendar una demostración?']];
 const payload:Record<string,string>={};for(const [key,label] of fields){const value=a[key];payload[label]=Array.isArray(value)?value.join(', '):String(value??'');if(a[key+'Other'])payload[label]+=` · ${a[key+'Other']}`;}return {...payload,'Fecha y hora':row.created_at,'Identificador':row.id,'Origen':'MoldTech Leads — Plastimagen',subject:`Nuevo prospecto MoldTech — ${a.company}`,...(a.email?{email:String(a.email)}:{})};
}
export async function postNotification(payload:Record<string,string>,send:typeof fetch=fetch):Promise<'sent'|'pending'|'unknown'>{
 try{const response=await send(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(12000)});if(response.ok){const data=await response.json();return data.ok===true?'sent':'unknown';}return response.status>=400&&response.status<500?'pending':'unknown';}catch{return 'unknown';}
}
