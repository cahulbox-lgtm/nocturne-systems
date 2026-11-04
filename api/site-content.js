const ALLOWED = new Set(['products','changelog','faq','support','announcements','media','settings']);
const json = (res,status,body) => {res.status(status).setHeader('Content-Type','application/json; charset=utf-8').setHeader('Cache-Control','no-store');res.end(JSON.stringify(body));};
const config=()=>({url:((process.env.SUPABASE_URL||process.env.SUPABASE_SUPABASE_URL)||process.env.SUPABASE_SUPABASE_URL),key:(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SUPABASE_SERVICE_ROLE_KEY)});
async function db(method,path,body){
 const {url,key}=config();if(!url||!key)throw new Error('Database not configured');
 const r=await fetch(url.replace(/\/$/,'')+'/rest/v1/'+path,{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=representation'},body:body?JSON.stringify(body):undefined});
 if(!r.ok)throw new Error('Database request failed ('+r.status+')');return r.json();
}
async function isAdmin(req){
 const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(!token||!process.env.ADMIN_EMAIL||!(process.env.SUPABASE_URL||process.env.SUPABASE_SUPABASE_URL)||!(process.env.SUPABASE_ANON_KEY||process.env.SUPABASE_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_SUPABASE_ANON_KEY))return false;
 const r=await fetch((process.env.SUPABASE_URL||process.env.SUPABASE_SUPABASE_URL).replace(/\/$/,'')+'/auth/v1/user',{headers:{apikey:(process.env.SUPABASE_ANON_KEY||process.env.SUPABASE_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_SUPABASE_ANON_KEY),Authorization:'Bearer '+token}});
 if(!r.ok)return false;const u=await r.json();return !!u.email&&u.email.toLowerCase()===process.env.ADMIN_EMAIL.toLowerCase()&&!!u.email_confirmed_at;
}
export default async function handler(req,res){
 if(req.method==='OPTIONS'){res.setHeader('Allow','GET, PUT, OPTIONS');return res.status(204).end();}
 try{
 if(req.method==='GET'){
  const rows=await db('GET','site_content?select=section,data');return json(res,200,{content:Object.fromEntries(rows.filter(x=>ALLOWED.has(x.section)).map(x=>[x.section,x.data]))});
 }
 if(req.method==='PUT'){
  if(!await isAdmin(req))return json(res,403,{error:'Unauthorized'});
  const {section,data}=req.body||{};
  if(!ALLOWED.has(section)||data===undefined||JSON.stringify(data).length>150000)return json(res,400,{error:'Invalid section or data'});
  await db('POST','site_content?on_conflict=section',[{section,data,updated_at:new Date().toISOString()}]);
  return json(res,200,{ok:true});
 }
 res.setHeader('Allow','GET, PUT');return json(res,405,{error:'Method not allowed'});
 }catch(e){return json(res,503,{error:'Content service unavailable. Check Vercel environment variables and Supabase setup.'});}
}
