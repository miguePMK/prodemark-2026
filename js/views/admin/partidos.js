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
          <button class="btn btn-secondary btn-sm" onclick="openPasteMatchesModal()">📋 Pegar tabla</button>
          <button class="btn btn-secondary btn-sm" onclick="exportMatchesCSV()">⬇ CSV</button>
          ${matches.length>0?`<button class="btn btn-orange btn-sm" onclick="openBulkResultsModal()">🎯 Resultados en masa</button>`:""}
          <button class="btn btn-purple btn-sm" onclick="inicializarEliminatorias()">🏆 Inicializar eliminatorias</button>
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

// ════════════ INICIALIZAR ELIMINATORIAS ════════════
// Tiempos en ART (UTC-3). Fuente: FIFA oficial (EDT+1h)
const ELIM_2026 = [
  // ── 16avos de final (Jun 28 – Jul 3) ─────────────
  {fase:"16avos",fecha:"2026-06-28",hora:"16:00"}, // x1
  {fase:"16avos",fecha:"2026-06-29",hora:"14:00"}, // x3
  {fase:"16avos",fecha:"2026-06-29",hora:"17:00"},
  {fase:"16avos",fecha:"2026-06-29",hora:"22:00"},
  {fase:"16avos",fecha:"2026-06-30",hora:"14:00"}, // x3
  {fase:"16avos",fecha:"2026-06-30",hora:"18:00"},
  {fase:"16avos",fecha:"2026-06-30",hora:"22:00"},
  {fase:"16avos",fecha:"2026-07-01",hora:"13:00"}, // x3
  {fase:"16avos",fecha:"2026-07-01",hora:"17:00"},
  {fase:"16avos",fecha:"2026-07-01",hora:"21:00"},
  {fase:"16avos",fecha:"2026-07-02",hora:"16:00"}, // x3
  {fase:"16avos",fecha:"2026-07-02",hora:"20:00"},
  {fase:"16avos",fecha:"2026-07-02",hora:"22:00"},
  {fase:"16avos",fecha:"2026-07-03",hora:"15:00"}, // x3
  {fase:"16avos",fecha:"2026-07-03",hora:"19:00"},
  {fase:"16avos",fecha:"2026-07-03",hora:"22:00"},
  // ── Octavos de final (Jul 4 – Jul 7) ─────────────
  {fase:"octavos",fecha:"2026-07-04",hora:"16:00"},
  {fase:"octavos",fecha:"2026-07-04",hora:"20:00"},
  {fase:"octavos",fecha:"2026-07-05",hora:"16:00"},
  {fase:"octavos",fecha:"2026-07-05",hora:"20:00"},
  {fase:"octavos",fecha:"2026-07-06",hora:"16:00"},
  {fase:"octavos",fecha:"2026-07-06",hora:"20:00"},
  {fase:"octavos",fecha:"2026-07-07",hora:"16:00"},
  {fase:"octavos",fecha:"2026-07-07",hora:"20:00"},
  // ── Cuartos de final (Jul 9 – Jul 11) ────────────
  {fase:"cuartos",fecha:"2026-07-09",hora:"16:00"},
  {fase:"cuartos",fecha:"2026-07-09",hora:"20:00"},
  {fase:"cuartos",fecha:"2026-07-10",hora:"20:00"},
  {fase:"cuartos",fecha:"2026-07-11",hora:"16:00"},
  // ── Semifinales (Jul 14 – Jul 15) ────────────────
  {fase:"semi",fecha:"2026-07-14",hora:"18:00"}, // Dallas
  {fase:"semi",fecha:"2026-07-15",hora:"18:00"}, // Atlanta
  // ── Tercer puesto (Jul 18) ────────────────────────
  {fase:"tercer",fecha:"2026-07-18",hora:"16:00"}, // Miami
  // ── Final (Jul 19) ────────────────────────────────
  {fase:"final",fecha:"2026-07-19",hora:"19:00"}, // MetLife, Nueva Jersey
];

export async function inicializarEliminatorias(){
  // Verificar si ya hay partidos de eliminatorias
  const yaExisten=Object.values(state.allMatches).filter(m=>m.fase!=="grupos");
  if(yaExisten.length>0){
    if(!confirm(`Ya existen ${yaExisten.length} partido${yaExisten.length>1?"s":""} de eliminatorias en Firebase.\n¿Agregar los que faltan igualmente?\n(Los existentes no se tocan)`)) return;
  } else {
    if(!confirm(`Crear los 32 partidos de la fase eliminatoria con fechas y horas oficiales del Mundial 2026.\nTodos los equipos quedan como "TBD" para editar cuando se definan los cruces.\n\n¿Continuar?`)) return;
  }

  const nuevos={};
  let i=0;
  for(const m of ELIM_2026){
    const fechaIso=`${m.fecha}T${m.hora}:00-03:00`;
    nuevos[`m_elim_${m.fecha.replace(/-/g,"")}_${m.hora.replace(":","")}_${i}`]={
      fase:m.fase, grupo:null,
      fecha_iso:fechaIso, deadline_iso:computeDeadline(fechaIso),
      local:"TBD", visitante:"TBD", jugado:false
    };
    i++;
  }

  try{
    await matchesRef.update(nuevos);
    showToast(`✅ ${ELIM_2026.length} partidos de eliminatorias creados · Editá los cruces cuando se definan`);
  }catch(err){console.error(err);showToast("❌ Error al crear")}
}

// ════════════ PEGAR TABLA ════════════
export function openPasteMatchesModal(){
  const existing=document.getElementById("modalPaste");if(existing)existing.remove();
  const div=document.createElement("div");div.id="modalPaste";div.className="overlay";
  div.innerHTML=`<div class="modal wide">
    <div class="modal-header"><h3>📋 Pegar tabla de partidos</h3><button class="modal-close" onclick="closeModal('modalPaste')">✕</button></div>
    <div class="modal-body">
      <p style="font-size:12px;color:var(--muted);margin-bottom:12px;line-height:1.6">
        Copiá desde Google Sheets o Excel y pegá acá. Columnas en orden:<br/>
        <strong style="color:var(--accent)">fase · grupo · fecha (YYYY-MM-DD) · hora (HH:MM) · local · visitante</strong><br/>
        Podés omitir grupo dejando la celda vacía. Seleccioná el encabezado si lo tenés.
      </p>
      <textarea id="pasteArea" style="width:100%;height:200px;background:var(--panel-2);border:1px solid var(--border-2);border-radius:var(--radius-sm);color:var(--text);font-family:'DM Mono',monospace;font-size:12px;padding:10px;resize:vertical"
        placeholder="fase&#9;grupo&#9;fecha&#9;hora&#9;local&#9;visitante&#10;grupos&#9;A&#9;2026-06-11&#9;16:00&#9;🇲🇽 México&#9;🇿🇦 Sudáfrica&#10;grupos&#9;&#9;2026-06-12&#9;13:00&#9;🇺🇸 EE.UU.&#9;🇸🇷 Surinam"></textarea>
      <div id="pastePreview" style="margin-top:12px"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-gray btn-sm" onclick="closeModal('modalPaste')">Cancelar</button>
      <button class="btn btn-secondary btn-sm" onclick="previewPaste()">👁 Vista previa</button>
      <button class="btn btn-primary btn-sm" id="btnConfirmPaste" style="display:none" onclick="confirmPaste()">✅ Importar</button>
    </div>
  </div>`;
  document.body.appendChild(div);div.classList.add("open");
  div.addEventListener("click",e=>{if(e.target===div)closeModal("modalPaste")});
}

let _parsedPaste=[];

export function previewPaste(){
  const raw=document.getElementById("pasteArea").value.trim();
  if(!raw){document.getElementById("pastePreview").innerHTML=`<p style="color:var(--muted);font-size:12px">Pegá datos primero.</p>`;return}
  const lines=raw.split(/\r?\n/).filter(l=>l.trim());
  const FASE_VALID=["grupos","16avos","octavos","cuartos","semi","tercer","final"];
  _parsedPaste=[];
  const errors=[];
  lines.forEach((line,i)=>{
    const cols=line.split(/\t|,/).map(c=>c.trim().replace(/^"|"$/g,"").trim());
    // Intentar detectar fila de encabezado
    if(i===0&&(cols[0].toLowerCase()==="fase"||cols[0].toLowerCase()==="phase")) return;
    const[fase="grupos",grupo="",fecha="",hora="16:00",local="",visitante=""]=cols;
    if(!fecha||!local||!visitante){errors.push(`Fila ${i+1}: faltan datos`);return}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(fecha)){errors.push(`Fila ${i+1}: fecha inválida (use YYYY-MM-DD)`);return}
    const faseNorm=fase.toLowerCase()||"grupos";
    _parsedPaste.push({fase:faseNorm,grupo:grupo||null,fecha,hora:hora||"16:00",local,visitante});
  });
  const preview=document.getElementById("pastePreview");
  if(_parsedPaste.length===0){
    preview.innerHTML=`<p style="color:var(--danger);font-size:12px">No se encontraron filas válidas.${errors.length?`<br/>${errors.slice(0,3).join("<br/>")}`:""}</p>`;
    document.getElementById("btnConfirmPaste").style.display="none";return;
  }
  const {FASE_SHORT}=window._config||{};
  preview.innerHTML=`
    <p style="font-size:12px;color:var(--success);margin-bottom:8px">✅ ${_parsedPaste.length} partido${_parsedPaste.length>1?"s":""} listos para importar${errors.length?` · ⚠️ ${errors.length} fila${errors.length>1?"s":""} con error`:""}</p>
    <div class="table-wrap" style="max-height:200px;overflow-y:auto"><table class="admin-table" style="font-size:11px">
      <thead><tr><th>Fase</th><th>Grupo</th><th>Fecha</th><th>Hora</th><th>Local</th><th>Visitante</th></tr></thead>
      <tbody>${_parsedPaste.map(m=>`<tr>
        <td>${m.fase}</td><td>${m.grupo||"—"}</td><td>${m.fecha}</td><td>${m.hora}</td>
        <td>${m.local}</td><td>${m.visitante}</td>
      </tr>`).join("")}</tbody>
    </table></div>`;
  document.getElementById("btnConfirmPaste").style.display="";
}

export async function confirmPaste(){
  if(!_parsedPaste.length) return;
  if(!confirm(`¿Importar ${_parsedPaste.length} partido${_parsedPaste.length>1?"s":""} a Firebase?`)) return;
  const newMatches={};let i=0;
  for(const m of _parsedPaste){
    const fechaIso=`${m.fecha}T${m.hora}:00-03:00`;
    newMatches[`m_${Date.now()}_${i}`]={fase:m.fase,grupo:m.grupo,fecha_iso:fechaIso,deadline_iso:computeDeadline(fechaIso),local:m.local,visitante:m.visitante,jugado:false};
    i++;await new Promise(r=>setTimeout(r,1));
  }
  try{
    await matchesRef.update(newMatches);
    closeModal("modalPaste");
    showToast(`✅ ${_parsedPaste.length} partidos importados`);
    _parsedPaste=[];
  }catch(err){console.error(err);showToast("❌ Error al importar")}
}

// ════════════ RESULTADOS EN MASA ════════════
export function openBulkResultsModal(){
  const pending=Object.entries(state.allMatches)
    .filter(([,m])=>!m.jugado)
    .sort((a,b)=>new Date(a[1].fecha_iso)-new Date(b[1].fecha_iso));
  if(pending.length===0){showToast("⚠️ Todos los partidos ya tienen resultado");return}

  const existing=document.getElementById("modalBulkResults");if(existing)existing.remove();
  const div=document.createElement("div");div.id="modalBulkResults";div.className="overlay";
  div.innerHTML=`<div class="modal wide">
    <div class="modal-header purple"><h3>🎯 Resultados en masa</h3><button class="modal-close" onclick="closeModal('modalBulkResults')">✕</button></div>
    <div class="modal-body">
      <p style="font-size:12px;color:var(--muted);margin-bottom:14px;line-height:1.5">
        Completá los resultados que quieras guardar. Los campos vacíos se ignoran. Al guardar se recalculan los puntos automáticamente.
      </p>
      <div style="display:flex;flex-direction:column;gap:6px" id="bulkList">
        ${pending.map(([id,m])=>`
          <div style="display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:10px 12px;background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:var(--radius-sm)" id="bulk_${id}">
            <div style="text-align:right;min-width:80px;font-size:12px;color:var(--muted);line-height:1.3">
              <div style="font-weight:600;color:var(--text)">${fmtDateShort(m.fecha_iso)}</div>
              <div>${fmtTime(m.fecha_iso)}</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr auto auto auto 1fr;gap:8px;align-items:center">
              <div style="text-align:right;font-size:13px;font-weight:500">${m.local}</div>
              <input class="score-input bulk-score" id="bulk_local_${id}" type="number" min="0" max="30" placeholder="—" style="width:46px;height:40px;font-size:18px" onfocus="this.select()"/>
              <span style="font-family:'DM Mono',monospace;color:var(--muted)">:</span>
              <input class="score-input bulk-score" id="bulk_vis_${id}" type="number" min="0" max="30" placeholder="—" style="width:46px;height:40px;font-size:18px" onfocus="this.select()"/>
              <div style="font-size:13px;font-weight:500">${m.visitante}</div>
            </div>
            <div style="font-size:10px;color:var(--muted);text-align:right;white-space:nowrap">
              <span style="font-size:9px;text-transform:uppercase;letter-spacing:.5px">${(m.fase||"").toUpperCase()}${m.grupo?` ${m.grupo}`:""}</span>
            </div>
          </div>`).join("")}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-gray btn-sm" onclick="closeModal('modalBulkResults')">Cancelar</button>
      <button class="btn btn-primary btn-sm" onclick="saveBulkResults()">💾 Guardar resultados</button>
    </div>
  </div>`;
  document.body.appendChild(div);div.classList.add("open");
  div.addEventListener("click",e=>{if(e.target===div)closeModal("modalBulkResults")});

  // Enter para pasar al siguiente input
  const inputs=[...div.querySelectorAll(".bulk-score")];
  inputs.forEach((inp,i)=>{inp.addEventListener("keydown",e=>{if(e.key==="Enter"&&inputs[i+1]){e.preventDefault();inputs[i+1].focus()}})});
}

export async function saveBulkResults(){
  const pending=Object.entries(state.allMatches).filter(([,m])=>!m.jugado);
  const toSave=[];
  pending.forEach(([id])=>{
    const lEl=document.getElementById(`bulk_local_${id}`);
    const vEl=document.getElementById(`bulk_vis_${id}`);
    if(!lEl||!vEl) return;
    const l=parseInt(lEl.value),v=parseInt(vEl.value);
    if(isNaN(l)||isNaN(v)||l<0||v<0||l>30||v>30) return;
    toSave.push({id,l,v,match:state.allMatches[id]});
  });
  if(toSave.length===0) return showToast("⚠️ No hay resultados para guardar");
  if(!confirm(`¿Guardar ${toSave.length} resultado${toSave.length>1?"s":""} y recalcular puntos?`)) return;

  try{
    for(const{id,l,v,match} of toSave){
      await matchesRef.child(id).update({jugado:true,resultado_local:l,resultado_visitante:v});
      await recalculatePointsForMatch(id,{...match,jugado:true,resultado_local:l,resultado_visitante:v});
    }
    closeModal("modalBulkResults");
    showToast(`✅ ${toSave.length} resultado${toSave.length>1?"s":""} guardados`);
  }catch(err){console.error(err);showToast("❌ Error al guardar")}
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
