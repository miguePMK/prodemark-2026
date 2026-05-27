import { state } from '../state.js';
import { getMatchStatus, isClosedOrPlayed, statusLabel, fmtDay, fmtTime, fmtDateShort, dayKey, escapeAttr } from '../helpers.js';
import { FASE_SHORT, FASE_LABELS } from '../config.js';
import { openMatchPredictionsModal } from './pronosticos.js';

export function renderFixture(){
  if(Object.keys(state.allMatches).length===0){
    document.getElementById("mainView").innerHTML=`<div class="view active"><h1 class="view-title">Fixture</h1><div class="empty-state"><div class="icon">📅</div><h3>Sin partidos cargados</h3><p>El admin carga los partidos antes del torneo.</p></div></div>`;
    return;
  }
  const sub=state.filters.fixtureSubTab||"lista";
  document.getElementById("mainView").innerHTML=`
    <div class="view active">
      <div><h1 class="view-title">Fixture Mundial 2026</h1><p class="view-sub">Lista de partidos, posiciones y cuadro eliminatorio</p></div>
      <div class="sub-tabs">
        <button class="sub-tab${sub==="lista"?" active":""}" onclick="setFixtureSubTab('lista')">📋 Lista</button>
        <button class="sub-tab${sub==="grupos"?" active":""}" onclick="setFixtureSubTab('grupos')">🔢 Posiciones</button>
        <button class="sub-tab${sub==="bracket"?" active":""}" onclick="setFixtureSubTab('bracket')">🏆 Eliminatorias</button>
      </div>
      <div id="fixtureContent"></div>
    </div>`;
  if(sub==="lista") renderFixtureLista();
  else if(sub==="grupos") renderFixtureGrupos();
  else renderFixtureBracket();
}

export function setFixtureSubTab(tab){state.filters.fixtureSubTab=tab;renderFixture()}

function renderFixtureLista(){
  const matches=Object.entries(state.allMatches).sort((a,b)=>new Date(a[1].fecha_iso)-new Date(b[1].fecha_iso));
  const grupos=[...new Set(matches.map(([,m])=>m.grupo).filter(Boolean))].sort();
  let filtered=matches;
  if(state.filters.fase)   filtered=filtered.filter(([,m])=>m.fase===state.filters.fase);
  if(state.filters.grupo)  filtered=filtered.filter(([,m])=>m.grupo===state.filters.grupo);
  if(state.filters.dia)    filtered=filtered.filter(([,m])=>dayKey(m.fecha_iso)===state.filters.dia);
  if(state.filters.equipo) filtered=filtered.filter(([,m])=>m.local===state.filters.equipo||m.visitante===state.filters.equipo);
  const byDay={};filtered.forEach(([id,m])=>{const k=dayKey(m.fecha_iso);(byDay[k]=byDay[k]||[]).push([id,m])});
  const fases=[...new Set(matches.map(([,m])=>m.fase))];

  document.getElementById("fixtureContent").innerHTML=`
    <div class="filter-bar">
      <span class="filter-label">Fase:</span>
      <span class="chip${!state.filters.fase?" active":""}" onclick="setFilter('fase',null)">Todas</span>
      ${fases.map(f=>`<span class="chip${state.filters.fase===f?" active":""}" onclick="setFilter('fase','${f}')">${FASE_SHORT[f]||f}</span>`).join("")}
    </div>
    ${grupos.length>0?`<div class="filter-bar">
      <span class="filter-label">Grupo:</span>
      <span class="chip${!state.filters.grupo?" active":""}" onclick="setFilter('grupo',null)">Todos</span>
      ${grupos.map(g=>`<span class="chip${state.filters.grupo===g?" active":""}" onclick="setFilter('grupo','${g}')">${g}</span>`).join("")}
      <div class="filter-sep"></div>
      <input list="teamsList" class="team-select" placeholder="Buscar equipo..." value="${escapeAttr(state.filters.equipo||"")}" onchange="setFilter('equipo',this.value||null)" oninput="if(!this.value)setFilter('equipo',null)"/>
    </div>`:""}
    ${Object.entries(byDay).map(([,arr])=>`
      <div class="day-header"><span>${fmtDay(arr[0][1].fecha_iso)}</span><span class="count">${arr.length} partido${arr.length>1?"s":""}</span></div>
      <div class="match-grid">${arr.map(([id,m])=>{
        const status=getMatchStatus(m);const canClick=isClosedOrPlayed(status);
        return `<div class="match-card${m.jugado?" jugado":""}">
          <div class="match-meta"><div class="time">${fmtTime(m.fecha_iso)}</div><div class="fase">${FASE_SHORT[m.fase]||m.fase}${m.grupo?` ${m.grupo}`:""}</div></div>
          <div class="match-teams">
            <div class="team local">${m.local||"TBD"}</div>
            ${m.jugado?`<div class="result-display">${m.resultado_local}-${m.resultado_visitante}</div>`:`<div style="font-size:12px;color:var(--muted);font-family:'DM Mono',monospace">vs</div>`}
            <div class="team visitante">${m.visitante||"TBD"}</div>
          </div>
          <div class="match-status">
            <span class="status-badge ${status}">${statusLabel(status)}</span>
            ${canClick?`<button class="social-btn" onclick="openMatchPredictionsModal('${id}')">👥 Pronos</button>`:""}
          </div>
        </div>`;}).join("")}
      </div>`).join("")||`<div class="empty-state"><p>No hay partidos con esos filtros.</p></div>`}`;
}

function renderFixtureGrupos(){
  const grupos=[...new Set(Object.values(state.allMatches).map(m=>m.grupo).filter(Boolean))].sort();
  if(grupos.length===0){
    document.getElementById("fixtureContent").innerHTML=`<div class="empty-state"><div class="icon">🔢</div><h3>Sin grupos cargados</h3></div>`;return;
  }
  document.getElementById("fixtureContent").innerHTML=`<div class="standings-grid">${grupos.map(g=>{
    const rows=calcStandings(g);
    return `<div class="standings-card"><div class="group-title">Grupo ${g}</div>
      <table class="standings-table">
        <thead><tr><th>Equipo</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>DG</th><th class="pts">Pts</th></tr></thead>
        <tbody>${rows.map((r,i)=>`<tr class="${i<2?"classifies":""}">
          <td>${r.nombre}</td><td>${r.PJ}</td><td>${r.PG}</td><td>${r.PE}</td><td>${r.PP}</td><td>${r.GF}</td><td>${r.GC}</td>
          <td class="${r.DG>0?"pos-dg":r.DG<0?"neg-dg":""}">${r.DG>0?"+":""}${r.DG}</td>
          <td class="pts">${r.Pts}</td>
        </tr>`).join("")}</tbody>
      </table></div>`;
  }).join("")}</div>`;
}

function calcStandings(grupo){
  const teams={};
  Object.values(state.allMatches).forEach(m=>{
    if(m.fase!=="grupos"||m.grupo!==grupo) return;
    [m.local,m.visitante].forEach(t=>{if(t&&!teams[t])teams[t]={nombre:t,PJ:0,PG:0,PE:0,PP:0,GF:0,GC:0,Pts:0}});
    if(!m.jugado) return;
    const L=teams[m.local],V=teams[m.visitante];if(!L||!V) return;
    L.PJ++;V.PJ++;L.GF+=m.resultado_local;L.GC+=m.resultado_visitante;V.GF+=m.resultado_visitante;V.GC+=m.resultado_local;
    if(m.resultado_local>m.resultado_visitante){L.PG++;L.Pts+=3;V.PP++;}
    else if(m.resultado_local<m.resultado_visitante){V.PG++;V.Pts+=3;L.PP++;}
    else{L.PE++;V.PE++;L.Pts++;V.Pts++;}
  });
  return Object.values(teams).map(t=>({...t,DG:t.GF-t.GC})).sort((a,b)=>b.Pts-a.Pts||b.DG-a.DG||b.GF-a.GF||a.nombre.localeCompare(b.nombre,"es"));
}

function renderFixtureBracket(){
  const fases=["16avos","octavos","cuartos","semi","tercer","final"];
  const byFase={};
  fases.forEach(f=>{byFase[f]=Object.entries(state.allMatches).filter(([,m])=>m.fase===f).sort((a,b)=>new Date(a[1].fecha_iso)-new Date(b[1].fecha_iso))});
  if(fases.reduce((s,f)=>s+byFase[f].length,0)===0){
    document.getElementById("fixtureContent").innerHTML=`<div class="empty-state"><div class="icon">🏆</div><h3>Sin eliminatorias cargadas</h3></div>`;return;
  }
  document.getElementById("fixtureContent").innerHTML=fases.map(f=>{
    if(!byFase[f].length) return "";
    return `<div class="bracket-section"><div class="bracket-fase-title">${FASE_LABELS[f]}</div>
      <div class="bracket-matches">${byFase[f].map(([id,m])=>{
        const wL=m.jugado&&m.resultado_local>m.resultado_visitante;
        const wV=m.jugado&&m.resultado_visitante>m.resultado_local;
        const canClick=isClosedOrPlayed(getMatchStatus(m));
        return `<div class="bracket-match${m.jugado?" jugado":""}" ${canClick?`onclick="openMatchPredictionsModal('${id}')" style="cursor:pointer"`:""}>
          <div class="bracket-teams">
            <div class="bracket-team${wL?" winner":""}"><span>${m.local||"TBD"}</span>${m.jugado?`<span class="score">${m.resultado_local}</span>`:""}</div>
            <div class="bracket-team${wV?" winner":""}"><span>${m.visitante||"TBD"}</span>${m.jugado?`<span class="score">${m.resultado_visitante}</span>`:""}</div>
          </div>
          <div class="bracket-meta">${fmtDateShort(m.fecha_iso)} · ${fmtTime(m.fecha_iso)}${canClick?" · 👥 ver pronos":""}</div>
        </div>`;
      }).join("")}</div></div>`;
  }).join("");
}
