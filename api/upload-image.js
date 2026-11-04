import { randomUUID } from 'node:crypto';
const json=(res,status,body)=>res.status(status).setHeader('Cache-Control','no-store').json(body);
const url=process.env.SUPABASE_URL||process.env.SUPABASE_SUPABASE_URL;
const service=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SUPABASE_SERVICE_ROLE_KEY;
const pub=process.env.SUPABASE_ANON_KEY||process.env.SUPABASE_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_SUPABASE_ANON_KEY;
async function authorized(req){
 const jwt=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(!jwt||!url||!pub||!process.env.ADMIN_EMAIL)return false;
 const r=await fetch(url.replace(/\/$/,'')+'/auth/v1/user',{headers:{apikey:pub,Authorization:'Bearer '+jwt}});
 if(!r.ok)return false;
 const u=await r.json();
 return !!u.email_confirmed_at&&u.email?.toLowerCase()===process.env.ADMIN_EMAIL.toLowerCase();
}
export default async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 if(!url||!service)return json(res,503,{error:'Storage not configured'});
 if(!await authorized(req))return json(res,403,{error:'Unauthorized'});
 try{
  const {filename,base64}=req.body||{};
  if(typeof filename!=='string'||typeof base64!=='string'||base64.length>4000000||!/^[a-zA-Z0-9._-]{1,120}$/.test(filename))return json(res,400,{error:'Invalid file'});
  const data=Buffer.from(base64,'base64');
  if(!data.length||data.length>2500000)return json(res,400,{error:'Max image size is 2.5 MB'});
  let mime='',ext='';
  if(data.length>8&&data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){mime='image/png';ext='png'}
  else if(data.length>3&&data[0]===255&&data[1]===216&&data[2]===255){mime='image/jpeg';ext='jpg'}
  else if(data.length>12&&data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP'){mime='image/webp';ext='webp'}
  else return json(res,400,{error:'Only PNG, JPG and WebP are supported'});
  const base=url.replace(/\/$/,'')+'/storage/v1';
  const headers={apikey:service,Authorization:'Bearer '+service};
  const bucket='nocturne-media';
  let check=await fetch(base+'/bucket/'+bucket,{headers});
  if(check.status===404){
   const created=await fetch(base+'/bucket',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({id:bucket,name:bucket,public:true,file_size_limit:2500000,allowed_mime_types:['image/png','image/jpeg','image/webp']})});
   if(!created.ok&&created.status!==409)return json(res,502,{error:'Unable to create media bucket'});
  }else if(!check.ok)return json(res,502,{error:'Storage bucket unavailable'});
  const objectName=Date.now()+'-'+randomUUID()+'.'+ext;
  const put=await fetch(base+'/object/'+bucket+'/'+objectName,{method:'POST',headers:{...headers,'Content-Type':mime,'x-upsert':'false'},body:data});
  if(!put.ok)return json(res,502,{error:'Image upload failed'});
  return json(res,200,{url:base+'/object/public/'+bucket+'/'+objectName});
 }catch(e){return json(res,500,{error:'Unable to upload image'})}
}
