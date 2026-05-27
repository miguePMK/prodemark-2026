import { state } from '../state.js';
import { isAdmin, fmtTime, fmtDateShort, dayKey, initials, calcPoints, getMatchStatus } from '../helpers.js';
import { MUNDIAL_START, MUNDIAL_END, FASE_SHORT, BONUS_CAMPEON, BONUS_FINALISTA, BONUS_GOLEADOR } from '../config.js';
import { buildRanking } from './ranking.js';

let cdInterval=null;

export function renderDashboard(){
  if(isAdmin()) return renderAdminDashboard();
  renderPlayerDashboard();
}

function renderPlayerDashboard(){
  const ranking=buildRanking();
  const myPos=ranking.findIndex(r=>r.id===state.currentUser.id)+1;
  const myPts=state.currentUser.puntos_total||0;
  const matchArr=Object.entries(state.allMatches);
  const played=matchArr.filter(([,m])=>m.jugado);
  const pending=matchArr.filter(([,m])=>!m.jugado);
  const now=new Date();
  const todayK=dayKey(now.toISOString());
  const nowTs=now.getTime();
  const fmt2=n=>String(n).padStart(2,"0");

  const urgentes=matchArr
    .filter(([,m])=>{const s=getMatchStatus(m);return s==="abierto"||s==="por-cerrar"||s==="abierto-manual";})
    .sort((a,b)=>new Date(a[1].fecha_iso)-new Date(b[1].fecha_iso)).slice(0,5);
  const sinCargar=urgentes.filter(([id])=>{const p=state.myPredictions[id];return !p||p.local==null||p.visitante==null;});
  const cierranHoy=urgentes.filter(([,m])=>dayKey(m.fecha_iso)===todayK);

  let exactos=0,parciales=0,fallados=0;
  played.forEach(([id,m])=>{
    const p=state.myPredictions[id];if(!p||p.local==null||p.visitante==null) return;
    const pts=calcPoints(p,m);
    if(pts===5)exactos++;else if(pts===2)parciales++;else fallados++;
  });
  const totalPred=exactos+parciales+fallados;
  const tasaExito=totalPred>0?Math.round(((exactos+parciales)/totalPred)*100):0;

  // Countdown 3 estados
  let cdHtml="";
  if(nowTs < MUNDIAL_START.getTime()){
    const rem=MUNDIAL_START.getTime()-nowTs;
    const d=Math.floor(rem/86400000),h=Math.floor((rem%86400000)/3600000),mn=Math.floor((rem%3600000)/60000),s=Math.floor((rem%60000)/1000);
    cdHtml=`<div class="countdown-card" style="border-color:var(--accent-border)">
      <div class="cd-left">
        <div class="cd-label">⚽ El Mundial arranca en</div>
        <div class="cd-value" style="font-size:28px">${d}d ${fmt2(h)}h ${fmt2(mn)}m</div>
        <div class="cd-info">11 jun · México vs Sudáfrica · Estadio Azteca</div>
      </div>
      <div class="cd-right"><div class="cd-timer-boxes">
        <div class="cd-box"><div class="n" id="cdDays">${d}</div><div class="u">días</div></div>
        <div class="cd-box"><div class="n" id="cdH">${fmt2(h)}</div><div class="u">hs</div></div>
        <div class="cd-box"><div class="n" id="cdM">${fmt2(mn)}</div><div class="u">min</div></div>
        <div class="cd-box"><div class="n" id="cdS">${fmt2(s)}</div><div class="u">seg</div></div>
      </div></div>
    </div>`;
  } else if(nowTs <= MUNDIAL_END.getTime()){
    const nextMatch=matchArr.filter(([,m])=>!m.jugado).sort((a,b)=>new Date(a[1].fecha_iso)-new Date(b[1].fecha_iso))[0];
    if(nextMatch){
      const[,nm]=nextMatch;
      const diff=new Date(nm.fecha_iso)-now;
      if(diff>0){
        const h=Math.floor(diff/3600000),mn2=Math.floor((diff%3600000)/60000),s=Math.floor((diff%60000)/1000);
        const isHoy=dayKey(nm.fecha_iso)===todayK;
        cdHtml=`<div class="countdown-card">
          <div class="cd-left">
            <div class="cd-label">${isHoy?"⚡ Próximo partido · HOY":"⏱ Próximo partido"}</div>
            <div class="cd-value">${fmt2(h)}:${fmt2(mn2)}:${fmt2(s)}</div>
            <div class="cd-info">${nm.local} vs ${nm.visitante} · ${FASE_SHORT[nm.fase]||nm.fase}${nm.grupo?` ${nm.grupo}`:""}</div>
          </div>
          <div class="cd-right"><div class="cd-timer-boxes">
            <div class="cd-box"><div class="n" id="cdH">${fmt2(h)}</div><div class="u">hs</div></div>
            <div class="cd-box"><div class="n" id="cdM">${fmt2(mn2)}</div><div class="u">min</div></div>
            <div class="cd-box"><div class="n" id="cdS">${fmt2(s)}</div><div class="u">seg</div></div>
          </div></div>
        </div>`;
      }
    }
  } else {
    const winner=ranking[0];
    cdHtml=`<div class="countdown-card" style="border-color:var(--gold-border);background:var(--gold-dim)">
      <div class="cd-left">
        <div class="cd-label" style="color:var(--gold)">🏆 Mundial 2026 · Finalizado</div>
        <div class="cd-value" style="font-size:20px;color:var(--gold)">¡Gracias por jugar!</div>
        ${winner?`<div class="cd-info">Ganador del prode: <strong style="color:var(--text)">${winner.nombre}</strong> con ${winner.puntos} pts</div>`:""}
      </div>
      <button class="btn btn-primary btn-sm" style="flex-shrink:0" onclick="navigate('ranking')">Ver ranking final</button>
    </div>`;
  }

  const top5=ranking.slice(0,5);
  const miniRankHtml=`<div class="mini-rank">
    ${top5.map((r,i)=>`<div class="mini-rank-row${r.id===state.currentUser.id?" me":""}">
      <span class="pos">${i+1}</span><span class="rname">${r.nombre}</span><span class="rpts">${r.puntos}</span>
    </div>`).join("")}
    <div class="see-all" onclick="navigate('ranking')">Ver ranking completo →</div>
  </div>`;

  document.getElementById("mainView").innerHTML=`
    <div class="view active">
      <div><h1 class="view-title">¡Hola, ${state.currentUser.nombre.split(" ")[0]}!</h1>
        <p class="view-sub">Resumen del prode · Mundial 2026</p></div>
      <div class="dash-grid">
        <div class="stat-card teal"><div class="lbl">Tus puntos</div><div class="val">${myPts}</div>
          <div class="desc">${myPos>0?`${myPos}° de ${ranking.length} jugadores`:"Sin ranking aún"}</div></div>
        <div class="stat-card gold"><div class="lbl">Posición</div><div class="val">${myPos>0?"#"+myPos:"—"}</div>
          <div class="desc">${ranking.length} jugadores</div></div>
        <div class="stat-card"><div class="lbl">Pronósticos</div><div class="val">${Object.keys(state.myPredictions).length}</div>
          <div class="desc">de ${matchArr.length} partidos</div></div>
        <div class="stat-card${sinCargar.length>0?" warn":""}"><div class="lbl">Sin cargar</div><div class="val">${sinCargar.length}</div>
          ${cierranHoy.length>0?`<div class="urgent-pill">${cierranHoy.length} cierran hoy</div>`:`<div class="urgent-pill ok">Al día</div>`}</div>
      </div>
      ${cdHtml}
      <div class="dash-grid-wide">
        <div style="display:flex;flex-direction:column;gap:14px">
          <div class="card">
            <div class="card-title">⚡ Pendientes de cargar</div>
            ${urgentes.length===0
              ?`<div class="empty-state" style="padding:20px"><div class="icon">✅</div><p>No hay partidos próximos o todos cargados.</p></div>`
              :`<div class="urgent-list">${urgentes.map(([id,m])=>{
                  const p=state.myPredictions[id];const hasPred=p&&p.local!=null&&p.visitante!=null;
                  const isHoy=dayKey(m.fecha_iso)===todayK;
                  return `<div class="urgent-item${hasPred?"":" sin-pred"}" onclick="navigate('pronosticos')">
                    <div class="ui-time">${fmtTime(m.fecha_iso)}</div>
                    <div><div class="ui-teams">${m.local}<span class="vs"> vs </span>${m.visitante}</div>
                    <div class="ui-fase">${FASE_SHORT[m.fase]||m.fase}${m.grupo?` ${m.grupo}`:""}</div></div>
                    ${hasPred?`<div class="ui-pred">${p.local} - ${p.visitante}</div>`:`<div class="ui-pred empty">Sin cargar</div>`}
                    <div class="ui-close${isHoy?"":" ok"}">${isHoy?"Hoy":"Próximo"}</div>
                  </div>`;}).join("")}</div>`}
          </div>
          <div class="card">
            <div class="card-title">🎯 Rendimiento</div>
            <div style="display:flex;flex-direction:column;gap:10px">
              <div style="display:flex;justify-content:space-between;font-size:13px"><span style="color:var(--muted)">Exactos</span><span style="color:var(--success);font-weight:700;font-family:'DM Mono',monospace">${exactos} × 5pts</span></div>
              <div style="display:flex;justify-content:space-between;font-size:13px"><span style="color:var(--muted)">Parciales</span><span style="color:var(--gold);font-weight:700;font-family:'DM Mono',monospace">${parciales} × 2pts</span></div>
              <div style="display:flex;justify-content:space-between;font-size:13px"><span style="color:var(--muted)">Fallados</span><span style="color:var(--muted);font-weight:700;font-family:'DM Mono',monospace">${fallados} × 0pts</span></div>
              <div style="padding-top:10px;border-top:1px solid var(--border)">
                <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:6px">
                  <span>Tasa de acierto</span><span style="color:var(--accent);font-weight:600">${tasaExito}%</span>
                </div>
                <div class="perf-bar-wrap"><div class="perf-bar" style="width:${tasaExito}%"></div></div>
              </div>
            </div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div class="card"><div class="card-title">🏆 Ranking actual</div>${miniRankHtml}</div>
          <div class="card" style="text-align:center">
            <div class="card-title">📊 Partidos</div>
            <div style="display:flex;justify-content:space-around;padding:8px 0">
              <div><div style="font-size:28px;font-weight:700;color:var(--success);font-family:'DM Mono',monospace">${played.length}</div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-top:2px">Jugados</div></div>
              <div style="width:1px;background:var(--border)"></div>
              <div><div style="font-size:28px;font-weight:700;color:var(--muted);font-family:'DM Mono',monospace">${pending.length}</div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-top:2px">Pendientes</div></div>
              <div style="width:1px;background:var(--border)"></div>
              <div><div style="font-size:28px;font-weight:700;color:var(--text);font-family:'DM Mono',monospace">${matchArr.length}</div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-top:2px">Total</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  startCountdown();
}

function startCountdown(){
  if(cdInterval) clearInterval(cdInterval);
  const nowTs=Date.now();
  const fmt=n=>String(n).padStart(2,"0");
  function updateBoxes(rem){
    const d=Math.floor(rem/86400000),h=Math.floor((rem%86400000)/3600000),m=Math.floor((rem%3600000)/60000),s=Math.floor((rem%60000)/1000);
    if(document.getElementById("cdDays")) document.getElementById("cdDays").textContent=d;
    if(document.getElementById("cdH"))    document.getElementById("cdH").textContent=fmt(h);
    if(document.getElementById("cdM"))    document.getElementById("cdM").textContent=fmt(m);
    if(document.getElementById("cdS"))    document.getElementById("cdS").textContent=fmt(s);
  }
  if(nowTs < MUNDIAL_START.getTime()){
    cdInterval=setInterval(()=>{
      const rem=MUNDIAL_START.getTime()-Date.now();
      if(rem<=0){clearInterval(cdInterval);window.renderView();return}
      updateBoxes(rem);
    },1000);
  } else if(nowTs <= MUNDIAL_END.getTime()){
    const next=Object.entries(state.allMatches).filter(([,m])=>!m.jugado).sort((a,b)=>new Date(a[1].fecha_iso)-new Date(b[1].fecha_iso))[0];
    if(!next) return;
    const target=new Date(next[1].fecha_iso).getTime();
    cdInterval=setInterval(()=>{
      const rem=target-Date.now();
      if(rem<=0){clearInterval(cdInterval);window.renderView();return}
      updateBoxes(rem);
    },1000);
  }
}

function renderAdminDashboard(){
  const ranking=buildRanking();
  const matchArr=Object.entries(state.allMatches);
  const played=matchArr.filter(([,m])=>m.jugado).length;
  const leader=ranking[0];
  const now=Date.now();
  const diff=MUNDIAL_START.getTime()-now;
  let cdStr="¡EN JUEGO!";
  if(diff>0){const d=Math.floor(diff/86400000),h=Math.floor((diff%86400000)/3600000),mn=Math.floor((diff%3600000)/60000);cdStr=`${d}d ${h}h ${mn}m`}

  document.getElementById("mainView").innerHTML=`
    <div class="view active">
      <div><h1 class="view-title">Panel Admin</h1><p class="view-sub">Estado general · ${state.currentUser.nombre}</p></div>
      <div class="dash-grid">
        <div class="stat-card teal"><div class="lbl">Jugadores</div><div class="val">${ranking.length}</div><div class="desc">en el prode</div></div>
        <div class="stat-card"><div class="lbl">Partidos</div><div class="val">${matchArr.length}</div><div class="desc">${played} con resultado</div></div>
        <div class="stat-card"><div class="lbl">Jugados</div><div class="val">${played}</div><div class="desc">de ${matchArr.length} totales</div></div>
        <div class="stat-card purple"><div class="lbl">Bonus cargados</div><div class="val">${Object.keys(state.allSpecialPreds).length}</div><div class="desc">de ${ranking.length} jugadores</div></div>
      </div>
      ${diff>0?`<div class="countdown-card"><div class="cd-left"><div class="cd-label">Mundial arranca en</div><div class="cd-value">${cdStr}</div><div class="cd-info">11 de junio · México vs Sudáfrica · Estadio Azteca</div></div><div style="font-size:56px;line-height:1">⚽</div></div>`:""}
      ${leader?`<div class="card"><div class="card-title">👑 Líder actual</div>
        <div style="display:flex;align-items:center;gap:14px;padding:8px 0">
          <div style="width:48px;height:48px;background:linear-gradient(135deg,var(--gold),#e8a000);color:#07111f;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px">${initials(leader.nombre)}</div>
          <div style="flex:1"><div style="font-weight:600;font-size:16px">${leader.nombre}</div><div style="font-size:12px;color:var(--muted)">${leader.area||"—"}</div></div>
          <div style="font-family:'DM Mono',monospace;font-weight:700;font-size:28px;color:var(--accent)">${leader.puntos}<span style="font-size:13px;color:var(--muted);font-weight:500"> pts</span></div>
        </div>
      </div>`:""}
      <div class="card"><div class="card-title">🎯 Estado del bonus</div>
        <p style="font-size:13px;color:var(--muted);line-height:1.6">
          ${state.specialConfig.campeon_real
            ?`<strong style="color:var(--success)">✅ Resuelto.</strong> Los puntos del bonus están sumados al ranking.`
            :state.specialConfig.enabled
              ?`<strong style="color:var(--success)">🟢 Habilitado.</strong> Los jugadores pueden cargar su bonus.`
              :`<strong style="color:var(--muted)">🔒 Deshabilitado.</strong> Los jugadores no pueden cargar el bonus.`}
        </p>
        <button class="btn btn-purple btn-sm" style="margin-top:10px" onclick="navigate('admin_especiales')">Gestionar bonus →</button>
      </div>
      ${matchArr.length===0?`<div class="empty-state"><div class="icon">🗓</div><h3>Sin partidos cargados</h3><p>Importá el CSV o cargá partidos desde la sección Partidos.</p><button class="btn btn-primary" style="margin-top:12px" onclick="navigate('admin_partidos')">Ir a Partidos</button></div>`:""}
    </div>`;
}
