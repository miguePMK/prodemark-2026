import { state } from '../../state.js';
import { isAdmin, showToast, openModal, closeModal, fmtDateShort, fmtTime, getMatchStatus, statusLabel, computeDeadline, escapeAttr } from '../../helpers.js';
import { FASE_SHORT, FASE_LABELS } from '../../config.js';
import { matchesRef, predictionsRef, usersRef } from '../../firebase.js';
import { recalculatePointsForMatch, recalculateAllUserPoints } from './puntos.js';

export function getCargasCount(matchId){
  let loaded=0,total=0;
  Object.entries(state.allUsers).forEach(([uid,u])=>{
    if(u.role==="admin") return;total++;
    const p=(state.allPredictions[uid]||{})[matchId];
    if(p&&p.local!=null&&p.visitante!=null) loaded++;
  });
  return{loaded,total};
}

export function renderAdminPartidos(){
  if(!isAdmin()) return window.navigate("dashboard");
  const matches=Object.entries(state.allMatches).sort((a,b)=>new Date(a[1].fecha_iso)-new Date(b[1].fecha_iso));
  document.getElementById("mainView").innerHTML=`
    <div class="view active">
      <div class="view-header-row">
        <div><h1 class="view-title">Partidos</h1><p class="view-sub">${matches.length} partido${matches.length!==1?"s":""}</p></div>
        <div class="action-row">
          <button class="btn btn-primary btn-sm" onclick="openCreateMatchModal()">➕ Nuevo</button>
          <label class="btn btn-secondary btn-sm" style="cursor:pointer">⬆ CSV<input type="file" accept=".csv" style="display:none" onchange="importMatchesCSV(event)"/></label>
          <button class="btn btn-secondary btn-sm" onclick="exportMatchesCSV()">⬇ CSV</button>
          ${matches.length>0?`<button class="btn btn-gray btn-sm" onclick="recalcularDeadlines()" title="Actualizar deadlines al criterio actual (1h antes del kick-off)">🕐 Deadlines</button>`:""}
          ${matches.length>0?`<button class="btn btn-danger btn-sm" onclick="deleteAllMatches()">🗑 Borrar todos</button>`:""}
        </div>
      </div>
      ${matches.length===0
        ?`<div class="empty-state"><div class="icon">🗓</div><h3>Sin partidos cargados</h3><p>Cargá partidos a mano o importá el CSV.</p></div>`
        :`<p style="font-size:11px;color:var(--muted);margin-bottom:12px"><strong>Deadline:</strong> 1 hora antes del kick-off. <strong>Manual:</strong> "Forzar abierto" reabre (solo antes del partido). "Forzar cerrado" cierra antes del deadline.</p>
        <div class="table-wrap"><table class="admin-table">
          <thead><tr><th>Fecha</th><th>Hora</th><th>Fase</th><th>Local</th><th></th><th>Visitante</th><th>Estado</th><th>Cargas</th><th>Manual</th><th>Acciones</th></tr></thead>
          <tbody>${matches.map(([id,m])=>{
            const status=getMatchStatus(m);const started=Date.now()>=new Date(m.fecha_iso).getTime();
            const ms=m.manual_status||"auto";const cargas=getCargasCount(id);
            const cCls=cargas.loaded===0?"empty":cargas.loaded===cargas.total?"full":"";
            return `<tr>
              <td style="white-space:nowrap;font-weight:600">${fmtDateShort(m.fecha_iso)}</td>
              <td style="font-family:'DM Mono',monospace;font-weight:600">${fmtTime(m.fecha_iso)}</td>
              <td><span style="font-size:10px;color:var(--accent);font-weight:700;text-transform:uppercase">${FASE_SHORT[m.fase]||m.fase}${m.grupo?` ${m.grupo}`:""}</span></td>
              <td style="text-align:right">${m.local||"—"}</td>
              <td style="font-family:'DM Mono',monospace;color:var(--muted)">${m.jugado?`<strong style="color:var(--text);font-size:14px">${m.resultado_local}-${m.resultado_visitante}</strong>`:"vs"}</td>
              <td>${m.visitante||"—"}</td>
              <td><span class="status-badge ${status}">${statusLabel(status)}</span></td>
              <td><span class="cargas-cell ${cCls}" ${cargas.total>0?`onclick="openCargasModal('${id}')"`:""}>${cargas.loaded}/${cargas.total}</span></td>
              <td><select class="manual-select" onchange="setManualStatus('${id}',this.value)" ${m.jugado?"disabled":""}>
                <option value="auto" ${ms==="auto"?"selected":""}>⚙️ Auto</option>
                <option value="enabled" ${ms==="enabled"?"selected":""} ${started?"disabled":""}>🔓 Forzar abierto</option>
                <option value="disabled" ${ms==="disabled"?"selected":""}>🚫 Forzar cerrado</option>
              </select></td>
              <td><div class="actions">
                <button class="icon-btn" onclick="openResultadoModal('${id}')">${m.jugado?"📝":"🎯"}</button>
                <button class="icon-btn" onclick="openEditMatchModal('${id}')">✏️</button>
                <button class="icon-btn danger" onclick="deleteMatch('${id}')">🗑</button>
              </div></td>
            </tr>`;}).join("")}
          </tbody>
        </table></div>`}
    </div>`;
}

export async function openCargasModal(matchId){
  const m=state.allMatches[matchId];if(!m)return;
  const preds=Object.keys(state.allPredictions).length>0?state.allPredictions:(await predictionsRef.once("value")).val()||{};
  const cargaron=[],falta=[];
  Object.entries(state.allUsers).forEach(([uid,u])=>{
    if(u.role==="admin") return;
    const p=(preds[uid]||{})[matchId];
    if(p&&p.local!=null&&p.visitante!=null) cargaron.push(u.nombre);else falta.push(u.nombre);
  });
  const existing=document.getElementById("modalCargas");if(existing)existing.remove();
  const div=document.createElement("div");div.id="modalCargas";div.className="overlay";
  div.innerHTML=`<div class="modal">
    <div class="modal-header"><h3>Cargas · ${m.local} vs ${m.visitante}</h3><button class="modal-close" onclick="closeModal('modalCargas')">✕</button></div>
    <div class="modal-body">
      <h4>✅ Cargaron (${cargaron.length})</h4>
      ${cargaron.length>0?`<p>${cargaron.join(", ")}</p>`:`<p style="color:var(--muted)">Nadie cargó todavía.</p>`}
      ${falta.length>0?`<h4>⏳ Falta (${falta.length})</h4><p style="color:var(--warn)">${falta.join(", ")}</p>`:""}
    </div>
  </div>`;
  document.body.appendChild(div);div.classList.add("open");
  div.addEventListener("click",e=>{if(e.target===div)closeModal("modalCargas")});
}

export async function setManualStatus(matchId,val){
  const m=state.allMatches[matchId];if(!m)return;
  if(val==="enabled"&&Date.now()>=new Date(m.fecha_iso).getTime()){showToast("⚠️ El partido ya empezó");return window.renderView()}
  try{await matchesRef.child(matchId).update({manual_status:val==="auto"?null:val});showToast("✅ Estado actualizado")}
  catch(err){console.error(err);showToast("❌ Error")}
}

export function openCreateMatchModal(){
  document.getElementById("matchModalTitle").textContent="Nuevo Partido";
  document.getElementById("mmMatchId").value="";document.getElementById("mmFase").value="grupos";
  document.getElementById("mmGrupo").value="";document.getElementById("mmFecha").value="2026-06-11";
  document.getElementById("mmHora").value="16:00";document.getElementById("mmLocal").value="";
  document.getElementById("mmVisitante").value="";openModal("modalMatch");
}
export function openEditMatchModal(matchId){
  const m=state.allMatches[matchId];if(!m)return;
  document.getElementById("matchModalTitle").textContent="Editar Partido";
  document.getElementById("mmMatchId").value=matchId;document.getElementById("mmFase").value=m.fase||"grupos";
  document.getElementById("mmGrupo").value=m.grupo||"";
  const d=new Date(m.fecha_iso);
  document.getElementById("mmFecha").value=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  document.getElementById("mmHora").value=`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  document.getElementById("mmLocal").value=m.local||"";document.getElementById("mmVisitante").value=m.visitante||"";
  openModal("modalMatch");
}
export async function saveMatch(){
  const matchId=document.getElementById("mmMatchId").value;
  const fase=document.getElementById("mmFase").value;
  const grupo=document.getElementById("mmGrupo").value.trim().toUpperCase();
  const fecha=document.getElementById("mmFecha").value;
  const hora=document.getElementById("mmHora").value;
  const local=document.getElementById("mmLocal").value.trim();
  const visitante=document.getElementById("mmVisitante").value.trim();
  if(!fecha||!hora) return showToast("⚠️ Falta fecha/hora");
  if(!local||!visitante) return showToast("⚠️ Faltan equipos");
  const fechaIso=`${fecha}T${hora}:00-03:00`;
  const data={fase,grupo:grupo||null,fecha_iso:fechaIso,deadline_iso:computeDeadline(fechaIso),local,visitante,jugado:false};
  try{
    if(matchId){
      const ex=state.allMatches[matchId];
      if(ex&&ex.jugado){data.jugado=true;data.resultado_local=ex.resultado_local;data.resultado_visitante=ex.resultado_visitante}
      if(ex&&ex.manual_status) data.manual_status=ex.manual_status;
      await matchesRef.child(matchId).set(data);
    }else{await matchesRef.child("m_"+Date.now()).set(data)}
    closeModal("modalMatch");showToast("✅ Partido guardado");
  }catch(err){console.error(err);showToast("❌ Error")}
}
export async function deleteMatch(matchId){
  const m=state.allMatches[matchId];if(!m)return;
  if(!confirm(`¿Eliminar ${m.local} vs ${m.visitante}? También se borran los pronósticos.`)) return;
  try{
    await matchesRef.child(matchId).remove();
    const allPredsSnap=await predictionsRef.once("value");const allP=allPredsSnap.val()||{};
    for(const uid of Object.keys(allP)){if(allP[uid][matchId]) await predictionsRef.child(uid).child(matchId).remove()}
    await recalculateAllUserPoints();showToast("✅ Partido eliminado");
  }catch(err){console.error(err);showToast("❌ Error")}
}
export async function deleteAllMatches(){
  if(!confirm("¿BORRAR TODOS LOS PARTIDOS?\nTambién se borran TODOS los pronósticos.")) return;
  if(!confirm("Última confirmación: ¿seguro?")) return;
  try{
    await matchesRef.remove();await predictionsRef.remove();
    const updates={};
    Object.keys(state.allUsers).forEach(uid=>{if(state.allUsers[uid].role!=="admin")updates[`${uid}/puntos_total`]=0});
    await usersRef.update(updates);
    showToast("🗑 Todo borrado");
  }catch(err){console.error(err);showToast("❌ Error")}
}
export async function recalcularDeadlines(){
  const pending=Object.entries(state.allMatches).filter(([,m])=>!m.jugado);
  if(pending.length===0) return showToast("⚠️ No hay partidos sin resultado");
  if(!confirm(`Recalcular deadlines de ${pending.length} partido${pending.length>1?"s":""} (1h antes del kick-off)`)) return;
  const updates={};
  pending.forEach(([id,m])=>{updates[`${id}/deadline_iso`]=computeDeadline(m.fecha_iso)});
  try{await matchesRef.update(updates);showToast(`✅ ${pending.length} deadlines actualizados`)}
  catch(err){console.error(err);showToast("❌ Error")}
}

export function openResultadoModal(matchId){
  const m=state.allMatches[matchId];if(!m)return;
  document.getElementById("rmMatchId").value=matchId;
  document.getElementById("rmInfo").innerHTML=`<strong>${fmtDateShort(m.fecha_iso)} ${fmtTime(m.fecha_iso)}</strong> · <span style="font-size:11px;color:var(--muted)">${FASE_LABELS[m.fase]||m.fase}${m.grupo?` · Grupo ${m.grupo}`:""}</span>`;
  document.getElementById("rmLocalName").textContent=m.local;document.getElementById("rmVisitanteName").textContent=m.visitante;
  document.getElementById("rmLocal").value=m.jugado?m.resultado_local:"";
  document.getElementById("rmVisitante").value=m.jugado?m.resultado_visitante:"";
  document.getElementById("rmClearBtn").style.display=m.jugado?"":"none";
  openModal("modalResult");
}
export async function saveResult(){
  const matchId=document.getElementById("rmMatchId").value;
  const localR=parseInt(document.getElementById("rmLocal").value);
  const visR=parseInt(document.getElementById("rmVisitante").value);
  if(isNaN(localR)||isNaN(visR)||localR<0||visR<0||localR>30||visR>30) return showToast("⚠️ Resultado inválido");
  try{
    await matchesRef.child(matchId).update({jugado:true,resultado_local:localR,resultado_visitante:visR});
    await recalculatePointsForMatch(matchId,{...state.allMatches[matchId],jugado:true,resultado_local:localR,resultado_visitante:visR});
    closeModal("modalResult");showToast("✅ Resultado cargado, puntos recalculados");
  }catch(err){console.error(err);showToast("❌ Error")}
}
export async function clearResult(){
  const matchId=document.getElementById("rmMatchId").value;
  if(!confirm("¿Borrar el resultado? Los puntos asociados se borran.")) return;
  try{
    await matchesRef.child(matchId).update({jugado:false,resultado_local:null,resultado_visitante:null});
    const allPredsSnap=await predictionsRef.once("value");const allP=allPredsSnap.val()||{};
    for(const uid of Object.keys(allP)){
      if(allP[uid][matchId]&&allP[uid][matchId].puntos!=null)
        await predictionsRef.child(uid).child(matchId).child("puntos").remove();
    }
    await recalculateAllUserPoints();closeModal("modalResult");showToast("✅ Resultado borrado");
  }catch(err){console.error(err);showToast("❌ Error")}
}

// CSV
function csvEscape(s){return `"${String(s||"").replace(/"/g,'""')}"`}
export function exportMatchesCSV(){
  const rows=[["fase","grupo","fecha","hora","local","visitante"]];
  Object.values(state.allMatches).sort((a,b)=>new Date(a.fecha_iso)-new Date(b.fecha_iso)).forEach(m=>{
    const d=new Date(m.fecha_iso);
    rows.push([m.fase||"",m.grupo||"",
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`,
      `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`,
      m.local||"",m.visitante||""]);
  });
  const csv=rows.map(r=>r.map(csvEscape).join(",")).join("\n");
  const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");
  a.href=url;a.download="prodemark_partidos.csv";a.click();URL.revokeObjectURL(url);
  showToast("✅ CSV exportado");
}
function parseCSVLine(line){
  const result=[];let cur="",inQ=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){if(inQ&&line[i+1]==='"'){cur+='"';i++}else inQ=!inQ}
    else if(ch===','&&!inQ){result.push(cur);cur=""}
    else cur+=ch;
  }
  result.push(cur);return result;
}
export function importMatchesCSV(event){
  const file=event.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=async e=>{
    try{
      const lines=e.target.result.split(/\r?\n/).filter(l=>l.trim());
      if(lines.length<2){showToast("❌ Archivo vacío");return}
      const headers=parseCSVLine(lines[0]).map(h=>h.trim().toLowerCase());
      const idx={fase:headers.indexOf("fase"),grupo:headers.indexOf("grupo"),fecha:headers.indexOf("fecha"),hora:headers.indexOf("hora"),local:headers.indexOf("local"),visitante:headers.indexOf("visitante")};
      if(idx.fecha===-1||idx.local===-1||idx.visitante===-1){showToast("❌ Faltan columnas");return}
      const newMatches={};let i=1;
      for(const line of lines.slice(1)){
        const cells=parseCSVLine(line);
        const fase=(idx.fase>=0?cells[idx.fase]:"grupos").trim()||"grupos";
        const grupo=(idx.grupo>=0?cells[idx.grupo]:"").trim();
        const fecha=cells[idx.fecha].trim();
        const hora=(idx.hora>=0?cells[idx.hora]:"16:00").trim()||"16:00";
        const local=cells[idx.local].trim();const visitante=cells[idx.visitante].trim();
        if(!fecha||!local||!visitante) continue;
        const fechaIso=`${fecha}T${hora}:00-03:00`;
        newMatches["m_"+Date.now()+"_"+i]={fase,grupo:grupo||null,fecha_iso:fechaIso,deadline_iso:computeDeadline(fechaIso),local,visitante,jugado:false};
        i++;await new Promise(r=>setTimeout(r,1));
      }
      const count=Object.keys(newMatches).length;
      if(count===0){showToast("❌ Sin partidos válidos");return}
      if(!confirm(`¿Importar ${count} partido${count>1?"s":""}?`)){event.target.value="";return}
      await matchesRef.update(newMatches);showToast(`✅ ${count} partidos importados`);
    }catch(err){console.error(err);showToast("❌ Error CSV")}
    event.target.value="";
  };
  reader.readAsText(file,"UTF-8");
}
