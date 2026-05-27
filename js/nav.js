import { state } from './state.js';
import { initials, isAdmin } from './helpers.js';

export function renderUserBadge(){
  const u=state.currentUser;
  document.getElementById("sidebarFooter").innerHTML=`
    <div class="sidebar-user" onclick="navigate('perfil')">
      <div class="s-avatar">${initials(u.nombre)}</div>
      <div class="s-info">
        <div class="s-uname">${u.nombre}</div>
        <div class="s-urole">${u.area||""}</div>
      </div>
      ${u.role!=="admin"
        ?`<div class="s-pts-pill">${u.puntos_total||0} pts</div>`
        :`<div><span class="s-admin-tag">ADMIN</span></div>`}
    </div>`;
}

export function renderNavTabs(){
  const tabsAdmin=[
    {id:"dashboard",icon:"📊",label:"Dashboard"},
    {id:"fixture",icon:"📅",label:"Fixture"},
    {id:"ranking",icon:"🏆",label:"Ranking"},
    {id:"admin_users",icon:"👥",label:"Usuarios"},
    {id:"admin_partidos",icon:"🗓",label:"Partidos"},
    {id:"admin_especiales",icon:"🎯",label:"Bonus"},
  ];
  const tabsUser=[
    {id:"dashboard",icon:"📊",label:"Dashboard"},
    {id:"pronosticos",icon:"⚽",label:"Pronósticos",dot:true},
    {id:"fixture",icon:"📅",label:"Fixture"},
    {id:"especiales",icon:"🎯",label:"Bonus"},
    {id:"ranking",icon:"🏆",label:"Ranking"},
    {id:"resultados",icon:"📋",label:"Resultados"},
  ];
  const cv=state.currentView;
  const tabs=isAdmin()?tabsAdmin:tabsUser;

  document.getElementById("sidebarNav").innerHTML=
    tabs.map(t=>`
      <button class="nav-item${t.id===cv?" active":""}" onclick="navigate('${t.id}')">
        <span class="nav-icon">${t.icon}</span>
        <span>${t.label}</span>
        ${t.dot?'<span class="nav-dot"></span>':""}
      </button>`).join("")+
    `<div class="nav-section-label">Cuenta</div>
     <button class="nav-item${cv==="perfil"?" active":""}" onclick="navigate('perfil')">
       <span class="nav-icon">⚙️</span><span>Perfil</span>
     </button>
     <button class="nav-item" onclick="openModal('modalHelp')">
       <span class="nav-icon">📖</span><span>Reglas</span>
     </button>
     <button class="nav-item" onclick="doLogout()">
       <span class="nav-icon">🚪</span><span>Salir</span>
     </button>`;

  const mobileTabs=isAdmin()
    ?[{id:"dashboard",icon:"📊",label:"Dashboard"},{id:"fixture",icon:"📅",label:"Fixture"},{id:"ranking",icon:"🏆",label:"Ranking"},{id:"admin_partidos",icon:"🗓",label:"Partidos"},{id:"perfil",icon:"⚙️",label:"Perfil"}]
    :[{id:"dashboard",icon:"📊",label:"Dashboard"},{id:"pronosticos",icon:"⚽",label:"Pronos"},{id:"fixture",icon:"📅",label:"Fixture"},{id:"ranking",icon:"🏆",label:"Ranking"},{id:"perfil",icon:"⚙️",label:"Perfil"}];

  document.getElementById("mobileNav").innerHTML=mobileTabs.map(t=>`
    <button class="${t.id===cv?"active":""}" onclick="navigate('${t.id}')">
      <span class="mn-icon">${t.icon}</span>${t.label}
    </button>`).join("");
}
