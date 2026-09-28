import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return new Response(JSON.stringify({error:'Method not allowed'}),{status:405,headers});
 const authorization=req.headers.get('Authorization');
 if(!authorization)return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers});
 const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}}});
 const {data:{user},error}=await client.auth.getUser();
 if(error||!user)return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers});
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 const result=await admin.auth.admin.deleteUser(user.id);
 return new Response(JSON.stringify(result.error?{error:'Unable to delete account'}:{deleted:true}),{status:result.error?500:200,headers});
});
