import { SALT, FASE_SHORT, DAY_NAMES, MONTH_NAMES, BONUS_CAMPEON, BONUS_FINALISTA, BONUS_GOLEADOR } from './config.js';
import { state } from './state.js';

export async function hashPin(pin){
  const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(pin+SALT));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
export function showToast(msg,opts){
  const t=document.getElementById("toast");
  t.innerHTML=msg;
  t.className="toast show"+(opts&&opts.cls?" "+opts.cls:"");
  setTimeout(()=>t.classList.remove("show"),(opts&&opts.duration)||2400);
}
export function showScreen(name){
  ["bootstrapScreen","loginScreen","appScreen"].forEach(id=>{
    document.getElementById(id).style.display=id===name?"":"none";
  });
}
export function initials(name){return name.trim().split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase()}
export function openModal(id){document.getElementById(id).classList.add("open")}
export function closeModal(id){document.getElementById(id).classList.remove("open")}
export function fmtDay(iso){const d=new Date(iso);return `${DAY_NAMES[d.getDay()]} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`}
export function fmtTime(iso){const d=new Date(iso);return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`}
export function fmtDateShort(iso){const d=new Date(iso);return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`}
export function dayKey(iso){const d=new Date(iso);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
export function escapeAttr(s){return String(s||"").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}
export function computeDeadline(fechaIso){const d=new Date(fechaIso);d.setTime(d.getTime()-60*60*1000);return d.toISOString()}
export function isAdmin(){return state.currentUser&&state.currentUser.role==="admin"}
export function isClosedOrPlayed(s){return s==="cerrado"||s==="cerrado-manual"||s==="jugado"}
export function isEditableStatus(s){return s==="abierto"||s==="por-cerrar"||s==="abierto-manual"}

export function getMatchStatus(match){
  if(match.jugado) return "jugado";
  const now=Date.now();
  const fechaTs=new Date(match.fecha_iso).getTime();
  if(match.manual_status==="disabled") return "cerrado-manual";
  if(match.manual_status==="enabled"){
    if(now>=fechaTs) return "cerrado";
    return "abierto-manual";
  }
  const deadline=new Date(match.deadline_iso).getTime();
  if(now>=deadline) return "cerrado";
  if(deadline-now<24*3600*1000) return "por-cerrar";
  return "abierto";
}
export function statusLabel(s){
  return {abierto:"🟢 Abierto","abierto-manual":"🔓 Reabierto","por-cerrar":"🟠 Por cerrar",cerrado:"🔒 Cerrado","cerrado-manual":"🚫 Cerrado","jugado":"✅ Jugado"}[s]||s;
}
export function calcPoints(pred,match){
  if(!match.jugado||pred==null||pred.local==null||pred.visitante==null) return null;
  if(pred.local===match.resultado_local&&pred.visitante===match.resultado_visitante) return 5;
  const ps=Math.sign(pred.local-pred.visitante),rs=Math.sign(match.resultado_local-match.resultado_visitante);
  return ps===rs?2:0;
}
export function calcSpecialPoints(pred,cfg){
  if(!cfg||!cfg.campeon_real||!pred) return null;
  let pts=0;
  if(pred.campeon&&pred.campeon===cfg.campeon_real) pts+=BONUS_CAMPEON;
  const realF=[cfg.finalista_real_1,cfg.finalista_real_2].filter(Boolean);
  const predF=[pred.finalista1,pred.finalista2].filter(Boolean);
  realF.forEach(f=>{if(predF.includes(f))pts+=BONUS_FINALISTA});
  if(cfg.goleador_real&&pred.goleador&&pred.goleador===cfg.goleador_real) pts+=BONUS_GOLEADOR;
  return pts;
}
export function getUniqueTeams(){
  const t=new Set();
  Object.values(state.allMatches).forEach(m=>{if(m.local)t.add(m.local);if(m.visitante)t.add(m.visitante)});
  return [...t].sort();
}
export function refreshTeamsList(){
  document.getElementById("teamsList").innerHTML=getUniqueTeams().map(t=>`<option value="${escapeAttr(t)}">`).join("");
}
