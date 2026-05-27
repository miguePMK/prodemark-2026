import { state } from '../state.js';
import { isAdmin, isEditableStatus, isClosedOrPlayed, getMatchStatus, statusLabel, calcPoints, fmtTime, fmtDateShort, fmtDay, dayKey, escapeAttr, initials, showToast, openModal, closeModal } from '../helpers.js';
import { FASE_SHORT, FASE_LABELS } from '../config.js';
import { predictionsRef } from '../firebase.js';

export function renderPronosticos(){
  const matches=Object.entries(state.allMatches).sort((a,b)=>new Date(a[1].fecha_iso)-new Date(b[1].fecha_iso));
  if(matches.length===0){
    document.getElementById("mainView").innerHTML=`<div class="view active"><h1 class="view-title">Pronósticos</h1><div class="empty-state"><div class="icon">⚽</div><h3>No hay partidos cargados</h3><p>Esperá a que el admin cargue los partidos del torneo.</p></div></div>`;
    return;
  }
  const fases=[...new Set(matches.map(([,m])=>m.fase))];
  const grupos=[...new Set(matches.map(([,m])=>m.grupo).filter(Boolean))].sort();
  const dias=[...new Set(matches.map(([,m])=>dayKey(m.fecha_iso)))].sort();
  let filtered=matches;
  if(state.filters.fase)   filtered=filtered.filter(([,m])=>m.fase===state.filters.fase);
  if(state.filters.grupo)  filtered=filtered.filter(([,m])=>m.grupo===state.filters.grupo);
  if(state.filters.dia)    filtered=filtered.filter(([,m])=>dayKey(m.fecha_iso)===state.filters.dia);
  if(state.filters.equipo) filtered=filtered.filter(([,m])=>m.local===state.filters.equipo||m.visitante===state.filters.equipo);
  const byDay={};
  filtered.forEach(([id,m])=>{const k=dayKey(m.fecha_iso);(byDay[k]=byDay[k]||[]).push([id,m])});

  document.getElementById("mainView").innerHTML=`
    <div class="view active">
      <div><h1 class="view-title">Pronósticos</h1><p class="view-sub">Cargá tus marcadores · Cierre 1 hora antes del kick-off</p></div>
      <div class="filter-bar">
        <span class="filter-label">Fase:</span>
        <span class="chip${state.filters.fase===null?" active":""}" onclick="setFilter('fase',null)">Todas</span>
        ${fases.map(f=>`<span class="chip${state.filters.fase===f?" active":""}" onclick="setFilter('fase','${f}')">${FASE_SHORT[f]||f}</span>`).join("")}
      </div>
      ${grupos.length>0?`<div class="filter-bar">
        <span class="filter-label">Grupo:</span>
        <span class="chip${!state.filters.grupo?" active":""}" onclick="setFilter('grupo',null)">Todos</span>
        ${grupos.map(g=>`<span class="chip${state.filters.grupo===g?" active":""}" onclick="setFilter('grupo','${g}')">${g}</span>`).join("")}
        <div class="filter-sep"></div>
        <input list="teamsList" class="team-select" placeholder="Buscar equipo..." value="${escapeAttr(state.filters.equipo||"")}" onchange="setFilter('equipo',this.value||null)" oninput="if(!this.value)setFilter('equipo',null)"/>
      </div>`:""}
      <div class="filter-bar">
        <span class="filter-label">Día:</span>
        <span class="chip${state.filters.dia===null?" active":""}" onclick="setFilter('dia',null)">Todos</span>
        ${dias.map(d=>{const dd=new Date(d+"T12:00");return `<span class="chip${state.filters.dia===d?" active":""}" onclick="setFilter('dia','${d}')">${dd.getDate()}/${dd.getMonth()+1}</span>`}).join("")}
      </div>
      ${Object.keys(byDay).length===0
        ?`<div class="empty-state"><p>No hay partidos con esos filtros.</p></div>`
        :Object.entries(byDay).map(([dk,arr])=>`
          <div class="day-header">
            <span>${fmtDay(arr[0][1].fecha_iso)}</span>
            <span class="count">${arr.length} partido${arr.length>1?"s":""}</span>
          </div>
          <div class="match-grid">${arr.map(([id,m])=>renderMatchCard(id,m)).join("")}</div>`
        ).join("")}
    </div>`;
}

export function renderMatchCard(id,m){
  const status=getMatchStatus(m);
  const pred=state.myPredictions[id]||{};
  const editable=isEditableStatus(status);
  const localVal=pred.local!=null?pred.local:"";
  const visVal=pred.visitante!=null?pred.visitante:"";
  const hasPred=pred.local!=null&&pred.visitante!=null;

  let scoreHtml;
  if(m.jugado){
    const pts=calcPoints(pred,m);
    const cls=pts===5?"exact":pts===2?"partial":"miss";
    scoreHtml=`<div class="score-input-group ${cls}">
      <input class="score-input" type="text" value="${localVal}" disabled/>
      <span class="score-divider">-</span>
      <input class="score-input" type="text" value="${visVal}" disabled/>
    </div>`;
  }else{
    scoreHtml=`<div class="score-input-group">
      <input class="score-input" type="number" min="0" max="20" value="${localVal}" ${editable?"":"disabled"}
        onfocus="this.select()" onchange="savePrediction('${id}','local',this.value)"/>
      <span class="score-divider">-</span>
      <input class="score-input" type="number" min="0" max="20" value="${visVal}" ${editable?"":"disabled"}
        onfocus="this.select()" onchange="savePrediction('${id}','visitante',this.value)"/>
    </div>`;
  }

  let statusBlock;
  if(m.jugado){
    const pts=calcPoints(pred,m);
    statusBlock=`<div class="match-status">
      <div class="result-display">${m.resultado_local}-${m.resultado_visitante}</div>
      ${pts!=null?`<span class="pts-badge${pts===5?" full":pts===0?" zero":""}">${pts===5?"🎯":pts===2?"🔍":"❌"} ${pts} PTS</span>`:`<span class="deadline-info">No jugaste</span>`}
      ${isClosedOrPlayed(status)?`<button class="social-btn" onclick="openMatchPredictionsModal('${id}')">👥 Pronos</button>`:""}
    </div>`;
  }else{
    const deadline=new Date(m.deadline_iso);
    let dlInfo="";
    if(status==="abierto") dlInfo=`Cierra ${fmtDateShort(deadline.toISOString())} -1h`;
    else if(status==="abierto-manual") dlInfo="Reabierto por admin";
    else if(status==="por-cerrar"){const h=Math.floor((deadline-Date.now())/3600000);dlInfo=`Cierra en ${h}h`}
    else if(status==="cerrado-manual") dlInfo="Cerrado manualmente";
    else dlInfo=`Cerrado ${fmtDateShort(deadline.toISOString())}`;
    statusBlock=`<div class="match-status">
      <span class="status-badge ${status}">${statusLabel(status)}</span>
      <span class="deadline-info">${dlInfo}</span>
    </div>`;
  }

  return `<div class="match-card${m.jugado?" jugado":""}${!hasPred&&!m.jugado?" sin-pred":""}">
    <div class="match-meta">
      <div class="time">${fmtTime(m.fecha_iso)}</div>
      <div class="fase">${FASE_SHORT[m.fase]||m.fase}${m.grupo?` ${m.grupo}`:""}</div>
    </div>
    <div class="match-teams">
      <div class="team local">${m.local||'<span class="tba">TBD</span>'}</div>
      ${m.jugado?`<div class="result-display">${m.resultado_local}-${m.resultado_visitante}</div>`:scoreHtml}
      <div class="team visitante">${m.visitante||'<span class="tba">TBD</span>'}</div>
    </div>
    ${statusBlock}
  </div>`;
}

export async function savePrediction(matchId,field,value){
  const m=state.allMatches[matchId];if(!m)return;
  const status=getMatchStatus(m);
  if(!isEditableStatus(status)){showToast("⚠️ Pronóstico cerrado");return window.renderView()}
  const v=parseInt(value);
  if(isNaN(v)||v<0||v>50){showToast("⚠️ Marcador inválido");return}
  const prev=state.myPredictions[matchId]||{};
  const newPred={local:field==="local"?v:(prev.local!=null?prev.local:null),visitante:field==="visitante"?v:(prev.visitante!=null?prev.visitante:null),timestamp:Date.now()};
  try{
    await predictionsRef.child(state.currentUser.id).child(matchId).set(newPred);
    state.myPredictions[matchId]=newPred;
    showToast("✅ Guardado");
  }catch(err){console.error(err);showToast("❌ Error al guardar")}
}

export async function openMatchPredictionsModal(matchId){
  const m=state.allMatches[matchId];if(!m)return;
  const status=getMatchStatus(m);
  if(!isClosedOrPlayed(status)) return showToast("⚠️ Los pronos se ven cuando el partido cierre");

  let preds;
  if(isAdmin()&&Object.keys(state.allPredictions).length>0){preds=state.allPredictions;}
  else{const snap=await predictionsRef.once("value");preds=snap.val()||{};}

  const rows=[],noPred=[];
  Object.entries(state.allUsers).forEach(([uid,u])=>{
    if(u.role==="admin") return;
    const p=(preds[uid]||{})[matchId];
    if(p&&p.local!=null&&p.visitante!=null){
      const pts=m.jugado?calcPoints(p,m):null;
      rows.push({uid,nombre:u.nombre,area:u.area||"",local:p.local,visitante:p.visitante,pts});
    }else noPred.push(u.nombre);
  });
  rows.sort((a,b)=>(b.pts||0)-(a.pts||0)||a.nombre.localeCompare(b.nombre,"es"));

  const total=rows.length;
  const votL=rows.filter(r=>r.local>r.visitante).length;
  const votE=rows.filter(r=>r.local===r.visitante).length;
  const votV=rows.filter(r=>r.local<r.visitante).length;
  const pct=n=>total>0?Math.round(n/total*100):0;
  const votesHtml=total>0?`<div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;margin-bottom:16px">
    <div style="background:var(--panel-3);border:1px solid${m.jugado&&m.resultado_local>m.resultado_visitante?" var(--success-border)":"var(--border)"};border-radius:var(--radius-sm);padding:10px;text-align:center">
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${m.local||"Local"}</div>
      <div style="font-family:'DM Mono',monospace;font-weight:700;font-size:20px;color:var(--accent)">${pct(votL)}%</div>
      <div style="font-size:10px;color:var(--muted)">${votL} pronos</div>
    </div>
    <div style="background:var(--panel-3);border:1px solid${m.jugado&&m.resultado_local===m.resultado_visitante?" var(--gold-border)":"var(--border)"};border-radius:var(--radius-sm);padding:10px;text-align:center;min-width:72px">
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px">Empate</div>
      <div style="font-family:'DM Mono',monospace;font-weight:700;font-size:20px;color:var(--gold)">${pct(votE)}%</div>
      <div style="font-size:10px;color:var(--muted)">${votE} pronos</div>
    </div>
    <div style="background:var(--panel-3);border:1px solid${m.jugado&&m.resultado_visitante>m.resultado_local?" var(--success-border)":"var(--border)"};border-radius:var(--radius-sm);padding:10px;text-align:center">
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${m.visitante||"Visitante"}</div>
      <div style="font-family:'DM Mono',monospace;font-weight:700;font-size:20px;color:var(--purple)">${pct(votV)}%</div>
      <div style="font-size:10px;color:var(--muted)">${votV} pronos</div>
    </div>
  </div>`:"";

  const existing=document.getElementById("modalSocial");if(existing)existing.remove();
  const div=document.createElement("div");div.id="modalSocial";div.className="overlay";
  div.innerHTML=`<div class="modal">
    <div class="modal-header"><h3>${m.local} vs ${m.visitante}</h3><button class="modal-close" onclick="closeModal('modalSocial')">✕</button></div>
    <div class="modal-body">
      <p style="font-size:12px;color:var(--muted);margin-bottom:12px">${fmtDay(m.fecha_iso)} · ${FASE_LABELS[m.fase]||m.fase} · ${rows.length} pronóstico${rows.length!==1?"s":""}</p>
      ${votesHtml}
      ${m.jugado?`<p style="font-size:13px;color:var(--muted);margin-bottom:12px;text-align:center">Resultado real: <strong style="color:var(--text);font-family:'DM Mono',monospace;font-size:16px"> ${m.resultado_local} - ${m.resultado_visitante}</strong></p>`:""}
      <div class="predictions-list">
        ${rows.map(r=>{const isMe=r.uid===state.currentUser.id;const cls=r.pts===5?"exact":r.pts===2?"partial":"";
          return `<div class="pred-row${isMe?" me":""}">
            <div class="avatar-sm">${initials(r.nombre)}</div>
            <div><div class="nombre">${r.nombre}${isMe?" (vos)":""}</div><div class="parea">${r.area}</div></div>
            <div class="score-cell${cls?` ${cls}`:""}">${r.local}-${r.visitante}</div>
            ${m.jugado&&r.pts!=null?`<span class="pts-badge${r.pts===5?" full":r.pts===0?" zero":""}">${r.pts} pts</span>`:""}
          </div>`;}).join("")}
      </div>
      ${noPred.length>0?`<div class="no-pred-list"><strong>Sin pronóstico (${noPred.length}):</strong> ${noPred.join(", ")}</div>`:""}
    </div>
  </div>`;
  document.body.appendChild(div);div.classList.add("open");
  div.addEventListener("click",e=>{if(e.target===div)closeModal("modalSocial")});
}
