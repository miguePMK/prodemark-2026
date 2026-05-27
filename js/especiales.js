import { state } from '../state.js';
import { isAdmin, showToast, escapeAttr, calcSpecialPoints } from '../helpers.js';
import { BONUS_CAMPEON, BONUS_FINALISTA, BONUS_GOLEADOR } from '../config.js';
import { specialPredsRef, specialConfigRef } from '../firebase.js';
import { recalculateSpecialPoints, recalculateAllUserPoints } from './admin/puntos.js';

export function renderEspeciales(){
  const {specialConfig:cfg,mySpecial}=state;
  const enabled=cfg.enabled,resolved=!!cfg.campeon_real;
  const filled=mySpecial&&mySpecial.campeon&&mySpecial.finalista1&&mySpecial.finalista2;
  const myPts=resolved&&mySpecial&&typeof mySpecial.puntos==="number"?mySpecial.puntos:null;
  const maxBonus=BONUS_CAMPEON+BONUS_FINALISTA*2+BONUS_GOLEADOR;

  let body;
  if(resolved){
    const realF=[cfg.finalista_real_1,cfg.finalista_real_2].filter(Boolean);
    body=`<div class="bonus-form-card">
      <h3>🏁 Bonus resuelto</h3><p class="intro">El Mundial terminó. Estos son tus pronósticos y los resultados reales.</p>
      <div class="bonus-summary">
        <div class="row"><span>🏆 Campeón real</span><strong>${cfg.campeon_real}</strong></div>
        <div class="row"><span>🥈 Finalistas reales</span><strong>${cfg.finalista_real_1||"—"} · ${cfg.finalista_real_2||"—"}</strong></div>
        ${cfg.goleador_real?`<div class="row"><span>⚽ Goleador real</span><strong>${cfg.goleador_real}</strong></div>`:""}
      </div>
      ${filled?`<div class="bonus-summary" style="margin-top:14px">
        <div class="row"><span>Tu campeón</span><span><strong>${mySpecial.campeon}</strong> ${mySpecial.campeon===cfg.campeon_real?"✅":"❌"}</span></div>
        <div class="row"><span>Tus finalistas</span><span><strong>${mySpecial.finalista1}</strong> ${realF.includes(mySpecial.finalista1)?"✅":"❌"} · <strong>${mySpecial.finalista2}</strong> ${realF.includes(mySpecial.finalista2)?"✅":"❌"}</span></div>
        ${cfg.goleador_real?`<div class="row"><span>Tu goleador</span><span><strong>${mySpecial.goleador||"—"}</strong> ${mySpecial.goleador===cfg.goleador_real?"✅":"❌"}</span></div>`:""}
        <div class="row"><span><strong>Puntos del bonus</strong></span><strong style="font-size:18px;color:var(--purple)">${myPts!=null?myPts:0} pts</strong></div>
      </div>`:`<p style="text-align:center;color:var(--muted);font-style:italic;margin-top:14px">No cargaste tu bonus a tiempo.</p>`}
    </div>`;
  }else if(enabled){
    body=`<div class="bonus-form-card">
      <h3>🎯 Cargá tu Bonus</h3>
      <p class="intro">Pronosticá el <strong>campeón</strong>, los <strong>dos finalistas</strong> y el <strong>goleador</strong> del Mundial.</p>
      <div class="field"><label>🏆 Campeón <span class="pts-info">${BONUS_CAMPEON} pts</span></label><input id="bonCampeon" list="teamsList" placeholder="Ej: 🇦🇷 Argentina" value="${escapeAttr(mySpecial.campeon||"")}"/></div>
      <div class="field"><label>🥈 Finalista 1 <span class="pts-info">${BONUS_FINALISTA} pts</span></label><input id="bonFin1" list="teamsList" placeholder="Ej: 🇫🇷 Francia" value="${escapeAttr(mySpecial.finalista1||"")}"/></div>
      <div class="field"><label>🥈 Finalista 2 <span class="pts-info">${BONUS_FINALISTA} pts</span></label><input id="bonFin2" list="teamsList" placeholder="Ej: 🇧🇷 Brasil" value="${escapeAttr(mySpecial.finalista2||"")}"/></div>
      <div class="field"><label>⚽ Goleador <span class="pts-info">${BONUS_GOLEADOR} pts</span></label><input id="bonGoleador" placeholder="Ej: Lamine Yamal" value="${escapeAttr(mySpecial.goleador||"")}"/></div>
      <button class="btn btn-purple full" onclick="saveSpecial()">💾 Guardar Bonus</button>
      <p style="font-size:11px;color:var(--muted);text-align:center;margin-top:12px">El admin habilita y cierra esta sección.</p>
    </div>`;
  }else{
    body=`<div class="empty-state"><div class="icon">🔒</div><h3>Bonus cerrado</h3><p>El admin no habilitó la carga del bonus, o ya cerró el plazo.</p></div>`;
  }
  document.getElementById("mainView").innerHTML=`
    <div class="view active">
      <div><h1 class="view-title">Bonus Mini-Prode</h1><p class="view-sub">Campeón + 2 finalistas + goleador · hasta ${maxBonus} puntos extra</p></div>
      ${body}
    </div>`;
}

export async function saveSpecial(){
  if(!state.specialConfig.enabled) return showToast("⚠️ La carga del bonus está cerrada");
  if(state.specialConfig.campeon_real) return showToast("⚠️ El bonus ya fue resuelto");
  const campeon=document.getElementById("bonCampeon").value.trim();
  const fin1=document.getElementById("bonFin1").value.trim();
  const fin2=document.getElementById("bonFin2").value.trim();
  const goleador=document.getElementById("bonGoleador").value.trim();
  if(!campeon||!fin1||!fin2||!goleador) return showToast("⚠️ Completá los 4 campos");
  if(fin1===fin2) return showToast("⚠️ Los finalistas deben ser distintos");
  if(campeon===fin1||campeon===fin2) return showToast("⚠️ El campeón ya está como finalista");
  try{
    await specialPredsRef.child(state.currentUser.id).set({campeon,finalista1:fin1,finalista2:fin2,goleador,timestamp:Date.now()});
    state.mySpecial={campeon,finalista1:fin1,finalista2:fin2,goleador};
    showToast("✅ Bonus guardado");
  }catch(err){console.error(err);showToast("❌ Error al guardar")}
}

// ════════════ ADMIN ESPECIALES ════════════
export function renderAdminEspeciales(){
  if(!isAdmin()) return window.navigate("dashboard");
  const{specialConfig:cfg,allUsers,allSpecialPreds}=state;
  const enabled=cfg.enabled,resolved=!!cfg.campeon_real;
  const players=Object.entries(allUsers).filter(([,u])=>u.role!=="admin").sort((a,b)=>a[1].nombre.localeCompare(b[1].nombre,"es"));
  const loadedCount=Object.keys(allSpecialPreds).length;
  const maxBonus=BONUS_CAMPEON+BONUS_FINALISTA*2+BONUS_GOLEADOR;

  document.getElementById("mainView").innerHTML=`
    <div class="view active">
      <div><h1 class="view-title">Gestión del Bonus</h1><p class="view-sub">Campeón + 2 finalistas + goleador · hasta ${maxBonus} pts por jugador</p></div>
      <div class="card">
        <div class="card-title">⚙️ Configuración</div>
        <div class="toggle-row">
          <div class="label"><div class="title">Habilitar carga del bonus</div><div class="desc">Cuando está habilitado, los jugadores pueden cargar y editar su bonus.</div></div>
          <div class="toggle-switch${enabled?" on":""}" onclick="${resolved?"":"toggleSpecialEnabled()"}" style="${resolved?"opacity:.4;cursor:not-allowed":""}"></div>
        </div>
        ${resolved?`<p style="font-size:11px;color:var(--muted);font-style:italic">Bonus ya resuelto. Borrá los resultados para reabrir.</p>`:""}
      </div>
      <div class="card">
        <div class="card-title">🏁 Resultados reales</div>
        <p style="font-size:12px;color:var(--muted);margin-bottom:14px">Cargá los resultados al final del Mundial. Al guardar se calculan los puntos automáticamente.</p>
        <div class="form-row">
          <div class="form-group"><label>🏆 Campeón</label><input id="adminCampeon" list="teamsList" placeholder="Equipo ganador" value="${escapeAttr(cfg.campeon_real||"")}"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>🥈 Finalista 1</label><input id="adminFin1" list="teamsList" placeholder="Primer finalista" value="${escapeAttr(cfg.finalista_real_1||"")}"/></div>
          <div class="form-group"><label>🥈 Finalista 2</label><input id="adminFin2" list="teamsList" placeholder="Segundo finalista" value="${escapeAttr(cfg.finalista_real_2||"")}"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>⚽ Goleador del torneo</label><input id="adminGoleador" placeholder="Nombre del goleador" value="${escapeAttr(cfg.goleador_real||"")}"/></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:6px">
          <button class="btn btn-purple btn-sm" onclick="saveSpecialResults()">💾 Guardar y calcular puntos</button>
          ${resolved?`<button class="btn btn-danger btn-sm" onclick="clearSpecialResults()">🗑 Borrar resultados</button>`:""}
        </div>
      </div>
      <div class="card">
        <div class="card-title">📋 Pronósticos cargados (${loadedCount}/${players.length})</div>
        ${players.length===0?`<p style="color:var(--muted);font-size:13px;text-align:center;padding:14px">Sin jugadores.</p>`
        :`<div class="table-wrap"><table class="admin-table">
          <thead><tr><th>Jugador</th><th>Área</th><th>Campeón</th><th>Finalistas</th><th>Goleador</th>${resolved?"<th>Pts</th>":""}<th>Estado</th></tr></thead>
          <tbody>${players.map(([id,u])=>{
            const sp=allSpecialPreds[id];const filled=sp&&sp.campeon&&sp.finalista1&&sp.finalista2;
            return `<tr>
              <td><strong>${u.nombre}</strong></td><td>${u.area||"—"}</td>
              <td>${filled?sp.campeon:`<span style="color:var(--muted);font-style:italic">—</span>`}</td>
              <td>${filled?`${sp.finalista1} · ${sp.finalista2}`:`<span style="color:var(--muted);font-style:italic">—</span>`}</td>
              <td>${filled&&sp.goleador?sp.goleador:`<span style="color:var(--muted);font-style:italic">—</span>`}</td>
              ${resolved?`<td><strong style="color:var(--purple)">${filled&&typeof sp.puntos==="number"?sp.puntos:0}</strong></td>`:""}
              <td>${filled?`<span class="status-badge abierto">✅ Cargado</span>`:`<span class="status-badge cerrado">⏳ Pendiente</span>`}</td>
            </tr>`;}).join("")}</tbody>
        </table></div>`}
      </div>
    </div>`;
}

export async function toggleSpecialEnabled(){
  if(state.specialConfig.campeon_real) return showToast("⚠️ Bonus ya resuelto");
  try{await specialConfigRef.update({enabled:!state.specialConfig.enabled});showToast(state.specialConfig.enabled?"🔒 Bonus deshabilitado":"🟢 Bonus habilitado")}
  catch(err){console.error(err);showToast("❌ Error")}
}
export async function saveSpecialResults(){
  const campeon=document.getElementById("adminCampeon").value.trim();
  const f1=document.getElementById("adminFin1").value.trim();
  const f2=document.getElementById("adminFin2").value.trim();
  const goleador=document.getElementById("adminGoleador").value.trim();
  if(!campeon||!f1||!f2) return showToast("⚠️ Completá campeón y finalistas");
  if(f1===f2) return showToast("⚠️ Los finalistas deben ser distintos");
  if(campeon===f1||campeon===f2) return showToast("⚠️ El campeón ya está como finalista");
  if(!confirm("¿Guardar resultados del bonus y calcular puntos para todos?")) return;
  const cfg={campeon_real:campeon,finalista_real_1:f1,finalista_real_2:f2,goleador_real:goleador||null};
  try{
    await specialConfigRef.update({...cfg,enabled:false});
    await recalculateSpecialPoints(cfg);
    await recalculateAllUserPoints();
    showToast("✅ Resultados guardados, puntos calculados");
  }catch(err){console.error(err);showToast("❌ Error")}
}
export async function clearSpecialResults(){
  if(!confirm("¿Borrar los resultados del bonus? Los puntos del bonus se reinician.")) return;
  try{
    await specialConfigRef.update({campeon_real:null,finalista_real_1:null,finalista_real_2:null,goleador_real:null});
    const updates={};
    Object.keys(state.allSpecialPreds).forEach(uid=>{updates[`${uid}/puntos`]=null});
    if(Object.keys(updates).length>0) await specialPredsRef.update(updates);
    await recalculateAllUserPoints();
    showToast("✅ Resultados borrados");
  }catch(err){console.error(err);showToast("❌ Error")}
}
