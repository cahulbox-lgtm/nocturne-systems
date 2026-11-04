export default function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const url=process.env.SUPABASE_URL||process.env.SUPABASE_SUPABASE_URL||'';
 const key=process.env.SUPABASE_ANON_KEY||process.env.SUPABASE_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_SUPABASE_ANON_KEY||'';
 if(!url||!key)return res.status(503).json({error:'Supabase environment configuration incomplete',missing:[...(!url?['Supabase project URL']:[]),...(!key?['Supabase publishable key']:[])],deployment:process.env.VERCEL_ENV||'unknown'});
 res.status(200).json({url,key});
}
