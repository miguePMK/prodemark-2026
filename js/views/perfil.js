import { state } from '../state.js';
import { isAdmin, showToast, openModal, closeModal, initials, hashPin, calcPoints } from '../helpers.js';
import { usersRef } from '../firebase.js';

function calcUserStats(){
  const played=Object.entries(state.allMatches).filter(([,m])=>m.jugado)
    .sort((a,b)=>new Date(a[1].fecha_iso)-new Date(b[1].fecha_iso));
  let exactos=0,parciales=0,fallados=0,racha=0,maxRacha=0;
  const teams={};
  played.forEach(([id,m])=>{
    const p=state.myPredictions[id];
    if(!p||p.local==null||p.visitante==null){racha=0;return}
    const pts=calcPoints(p,m);
    if(pts>0){racha++;if(racha>maxRacha)maxRacha=racha}else racha=0;
    if(pts===5)exactos++;else if(pts===2)parciales++;else fallados++;
    [m.local,m.visitante].forEach(t=>{
      if(!t)return;if(!teams[t])teams[t]={a:0,n:0};teams[t].n++;if(pts>0)teams[t].a++;
    });
  });
  let lucky=null,luckyRate=0;
  Object.entries(teams).forEach(([t,s])=>{if(s.n>=2&&s.a/s.n>luckyRate){lucky=t;luckyRate=s.a/s.n}});
  const total=exactos+parciales+fallados;
  return{exactos,parciales,fallados,total,tasa:total>0?Math.round((exactos+parciales)/total*100):0,maxRacha,rachaActual:racha,lucky,luckyRate:lucky?Math.round(luckyRate*100):0};
}

export function renderPerfil(){
  const showPts=!isAdmin();
  const stats=showPts?calcUserStats():null;
  document.getElementById("mainView").innerHTML=`
    <div class="view active">
      <div><h1 class="view-title">Mi Perfil</h1><p class="view-sub">Datos de cuenta y estadísticas</p></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px">
        <div class="card">
          <div class="card-title">Datos</div>
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
            <div style="width:56px;height:56px;background:linear-gradient(135deg,var(--accent),var(--gold));color:#07111f;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px">${initials(state.currentUser.nombre)}</div>
            <div>
              <div style="font-weight:600;font-size:16px;color:var(--text)">${state.currentUser.nombre}</div>
              <div style="font-size:12px;color:var(--muted);margin-top:2px">${state.currentUser.area||""} · ${state.currentUser.role==="admin"?"Administrador":"Jugador"}</div>
            </div>
          </div>
          ${showPts
            ?`<div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Puntos acumulados</div>
              <div style="font-family:'DM Mono',monospace;font-size:30px;font-weight:700;color:var(--accent)">${state.currentUser.puntos_total||0}</div>`
            :`<div style="font-size:13px;color:var(--warn);font-weight:600">Administrador · no compite en el ranking</div>`}
        </div>
        <div class="card">
          <div class="card-title">Seguridad</div>
          <p style="font-size:13px;color:var(--muted);margin-bottom:14px;line-height:1.6">Tu PIN es la única forma de acceder a tu cuenta. Si lo cambiás, anotalo bien.</p>
          <button class="btn btn-primary" onclick="openChangePinModal()">🔐 Cambiar PIN</button>
        </div>
        <div class="card">
          <div class="card-title">Sesión</div>
          <p style="font-size:13px;color:var(--muted);margin-bottom:14px;line-height:1.6">Cerrá sesión para que otro usuario pueda ingresar desde este dispositivo.</p>
          <button class="btn btn-danger" onclick="doLogout()">🚪 Cerrar sesión</button>
        </div>
      </div>
      ${showPts&&stats&&stats.total>0?`
      <div class="card">
        <div class="card-title">📊 Mis estadísticas</div>
        <div class="stats-grid">
          <div class="stat-item"><div class="stat-icon">🎯</div><div class="stat-lbl">Exactos</div><div class="stat-val">${stats.exactos}</div><div class="stat-desc">${stats.exactos} × 2pts = ${stats.exactos*2}</div></div>
          <div class="stat-item"><div class="stat-icon">🔍</div><div class="stat-lbl">Parciales</div><div class="stat-val" style="color:var(--gold)">${stats.parciales}</div><div class="stat-desc">${stats.parciales} × 1pt = ${stats.parciales}</div></div>
          <div class="stat-item"><div class="stat-icon">📈</div><div class="stat-lbl">Tasa de acierto</div><div class="stat-val">${stats.tasa}%</div><div class="stat-desc">${stats.exactos+stats.parciales} de ${stats.total} pronos</div></div>
          <div class="stat-item"><div class="stat-icon">🔥</div><div class="stat-lbl">Racha máxima</div><div class="stat-val" style="color:var(--warn)">${stats.maxRacha}</div><div class="stat-desc">aciertos seguidos${stats.rachaActual>1?` · actual: ${stats.rachaActual}`:""}</div></div>
          ${stats.lucky?`<div class="stat-item"><div class="stat-icon">🍀</div><div class="stat-lbl">Equipo de la suerte</div><div class="stat-val lucky">${stats.lucky}</div><div class="stat-desc">${stats.luckyRate}% de aciertos</div></div>`:""}
          <div class="stat-item"><div class="stat-icon">❌</div><div class="stat-lbl">Fallados</div><div class="stat-val" style="color:var(--muted)">${stats.fallados}</div><div class="stat-desc">de ${stats.total} con pronóstico</div></div>
        </div>
      </div>`:""}
    </div>`;
}

export function openChangePinModal(){
  document.getElementById("pmOld").value="";document.getElementById("pmNew").value="";document.getElementById("pmNew2").value="";
  openModal("modalPin");
}
export async function changePin(){
  const oldP=document.getElementById("pmOld").value;
  const newP=document.getElementById("pmNew").value;
  const newP2=document.getElementById("pmNew2").value;
  if(!/^\d{4}$/.test(oldP)) return showToast("⚠️ PIN actual inválido");
  if(!/^\d{4}$/.test(newP)) return showToast("⚠️ El nuevo PIN debe tener 4 dígitos");
  if(newP!==newP2) return showToast("⚠️ Los PINs nuevos no coinciden");
  if(oldP===newP) return showToast("⚠️ El PIN nuevo es igual al actual");
  const oldHash=await hashPin(oldP);
  if(oldHash!==state.currentUser.pin_hash) return showToast("❌ PIN actual incorrecto");
  const newHash=await hashPin(newP);
  try{
    await usersRef.child(state.currentUser.id).child("pin_hash").set(newHash);
    state.currentUser.pin_hash=newHash;
    closeModal("modalPin");showToast("✅ PIN cambiado");
  }catch(err){console.error(err);showToast("❌ Error")}
}
