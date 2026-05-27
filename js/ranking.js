import { state } from '../state.js';
import { initials, isAdmin } from '../helpers.js';

export function buildRanking(){
  return Object.entries(state.allUsers)
    .filter(([,u])=>u.role!=="admin")
    .map(([id,u])=>({id,nombre:u.nombre,area:u.area||"",puntos:u.puntos_total||0}))
    .sort((a,b)=>b.puntos-a.puntos||a.nombre.localeCompare(b.nombre,"es"));
}

export function renderRanking(){
  const ranking=buildRanking();
  const areas=[...new Set(ranking.map(r=>r.area).filter(Boolean))];
  let filtered=ranking;
  if(state.filters.area) filtered=filtered.filter(r=>r.area===state.filters.area);
  const podium=filtered.slice(0,3),rest=filtered.slice(3);

  document.getElementById("mainView").innerHTML=`
    <div class="view active">
      <div>
        <h1 class="view-title">Ranking</h1>
        <p class="view-sub">${filtered.length} jugador${filtered.length!==1?"es":""}${isAdmin()?" · admins excluidos":""}</p>
      </div>
      ${areas.length>1?`<div class="filter-bar"><span class="filter-label">Área:</span><span class="chip${!state.filters.area?" active":""}" onclick="setFilter('area',null)">Todas</span>${areas.map(a=>`<span class="chip${state.filters.area===a?" active":""}" onclick="setFilter('area','${a}')">${a}</span>`).join("")}</div>`:""}
      ${podium.length>=3?`<div class="podium">
        <div class="podium-spot second" style="order:1"><div class="medal">🥈</div><div class="name">${podium[1].nombre}</div><div class="area">${podium[1].area||"—"}</div><div class="pts">${podium[1].puntos}</div></div>
        <div class="podium-spot first" style="order:2"><div class="medal">🥇</div><div class="name">${podium[0].nombre}</div><div class="area">${podium[0].area||"—"}</div><div class="pts">${podium[0].puntos}</div></div>
        <div class="podium-spot third" style="order:3"><div class="medal">🥉</div><div class="name">${podium[2].nombre}</div><div class="area">${podium[2].area||"—"}</div><div class="pts">${podium[2].puntos}</div></div>
      </div>`:""}
      ${filtered.length===0
        ?`<div class="empty-state"><p>No hay jugadores aún.</p></div>`
        :`<div class="ranking-table">${(podium.length>=3?rest:filtered).map((r,i)=>{
            const pos=podium.length>=3?i+4:i+1;
            const isMe=r.id===state.currentUser.id;
            return `<div class="ranking-row${isMe?" me":""}">
              <div class="ranking-pos${pos<=3?" top3":""}">${pos}</div>
              <div class="ranking-name">
                <div class="avatar">${initials(r.nombre)}</div>
                <div class="info">
                  <div class="nombre">${r.nombre}${isMe?` <span style="font-size:10px;color:var(--accent)">(vos)</span>`:""}</div>
                  <div class="area">${r.area||"—"}</div>
                </div>
              </div>
              <div class="ranking-pts">${r.puntos}</div>
            </div>`;
          }).join("")}</div>`}
    </div>`;
}
