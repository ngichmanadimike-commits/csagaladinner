import{useState}from"react";import{useNavigate}from"react-router-dom";import{supabase}from"@/integrations/supabase/client";
export default function AdminLogin(){
const navigate=useNavigate();
const[e,sE]=useState("");
const[p,sP]=useState("");
const[l,sL]=useState(false);
const[err,sErr]=useState("");
const go=async()=>{sL(true);sErr("");const{error}=await supabase.auth.signInWithPassword({email:e,password:p});if(error){sErr(error.message);sL(false);return;}navigate("/admin/dashboard",{replace:true});};
return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0a0a0a"}}><div style={{background:"#1a1a1a",padding:"2rem",borderRadius:"1rem",width:"90%",maxWidth:"400px"}}><h1 style={{color:"white",textAlign:"center",marginBottom:"1.5rem"}}>CSA Admin</h1>{err&&<p style={{color:"red"}}>{err}</p>}<input placeholder="Email" value={e} onChange={x=>sE(x.target.value)} style={{width:"100%",padding:"0.75rem",marginBottom:"1rem",borderRadius:"0.5rem",border:"1px solid #333",background:"#2a2a2a",color:"white",boxSizing:"border-box"}}/><input type="password" placeholder="Password" value={p} onChange={x=>sP(x.target.value)} style={{width:"100%",padding:"0.75rem",marginBottom:"1rem",borderRadius:"0.5rem",border:"1px solid #333",background:"#2a2a2a",color:"white",boxSizing:"border-box"}}/><button onClick={go} disabled={l} style={{width:"100%",padding:"0.75rem",background:"#c8860a",color:"white",border:"none",borderRadius:"0.5rem",fontSize:"1rem"}}>{l?"Signing in...":"Sign In"}</button></div></div>);}
