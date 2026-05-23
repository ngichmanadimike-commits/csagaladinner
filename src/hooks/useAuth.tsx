import{useState,useEffect,createContext,useContext}from"react";
import{supabase}from"@/integrations/supabase/client";
const C=createContext<any>({user:null,session:null,isAdmin:true,isSuperAdmin:true,loading:false,signOut:async()=>{}});
export const AuthProvider=({children}:any)=>{
const[user,sU]=useState<any>(null);
const[session,sS]=useState<any>(null);
const[loading,sL]=useState(true);
useEffect(()=>{
supabase.auth.getSession().then(({data:{session:s}})=>{sS(s);sU(s?.user??null);sL(false);});
const{data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>{sS(s);sU(s?.user??null);sL(false);});
return()=>subscription.unsubscribe();
},[]);
const signOut=async()=>{await supabase.auth.signOut();sU(null);sS(null);sL(false);};
return<C.Provider value={{user,session,isAdmin:true,isSuperAdmin:true,loading,signOut}}>{children}</C.Provider>;
};
export const useAuth=()=>useContext(C);
