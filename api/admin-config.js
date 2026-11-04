export default function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const url=process.env.SUPABASE_URL||'',key=process.env.SUPABASE_ANON_KEY||'';
 if(!url||!key)return res.status(503).json({error:'Configure SUPABASE_URL and SUPABASE_ANON_KEY in Vercel'});
 res.status(200).json({url,key});
}
