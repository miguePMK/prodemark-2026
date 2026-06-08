import { state } from '../state.js';
import { calcPoints } from '../helpers.js';
import { renderMatchCard } from './pronosticos.js';

export function renderResultados(){
  const played=Object.entries(state.allMatches).filter(([,m])=>m.jugado).sort((a,b)=>new Date(b[1].fecha_iso)-new Date(a[1].fecha_iso));
  let totalPts=0,exactos=0,parciales=0,fallados=0,sinPred=0;
  played.forEach(([id,m])=>{
    const p=state.myPredictions[id];
    if(!p||p.local==null||p.visitante==null){sinPred++;return}
    const pts=calcPoints(p,m);
    if(pts===5){exactos++;totalPts+=5}else if(pts===2){parciales++;totalPts+=2}else fallados++;
  });
  const myBonusPts=state.specialConfig.campeon_real&&state.mySpecial&&typeof state.mySpecial.puntos==="number"?state.mySpecial.puntos:0;
  document.getElementById("mainView").innerHTML=`
    <div class="view active">
      <div><h1 class="view-title">Resultados</h1><p class="view-sub">Tus pronósticos vs los resultados reales</p></div>
      <div class="dash-grid">
        <div class="stat-card teal"><div class="lbl">Puntos totales</div><div class="val">${totalPts+myBonusPts}</div><div class="desc">${totalPts} partidos${myBonusPts?` + ${myBonusPts} bonus`:""}</div></div>
        <div class="stat-card"><div class="lbl">🎯 Exactos</div><div class="val" style="color:var(--success)">${exactos}</div><div class="desc">2 pts c/u</div></div>
        <div class="stat-card"><div class="lbl">🔍 Parciales</div><div class="val" style="color:var(--gold)">${parciales}</div><div class="desc">1 pt c/u</div></div>
        <div class="stat-card"><div class="lbl">❌ Fallados</div><div class="val" style="color:var(--muted)">${fallados+sinPred}</div><div class="desc">${sinPred} sin cargar</div></div>
      </div>
      ${played.length===0
        ?`<div class="empty-state"><div class="icon">📋</div><h3>Sin resultados aún</h3><p>Cuando el admin cargue resultados, vas a ver tu performance acá.</p></div>`
        :`<div class="card"><div class="card-title">Partidos jugados</div><div class="match-grid">${played.map(([id,m])=>renderMatchCard(id,m)).join("")}</div></div>`}
    </div>`;
}
