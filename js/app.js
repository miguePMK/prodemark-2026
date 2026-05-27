import { state } from './state.js';
import { showToast, showScreen, openModal, closeModal, refreshTeamsList, isAdmin } from './helpers.js';
import { usersRef, matchesRef, specialConfigRef } from './firebase.js';
import { SESSION_KEY } from './config.js';
import { renderUserBadge, renderNavTabs } from './nav.js';
import { createFirstAdmin, populateLoginDropdown, doLogin, doLogout, postLoginSetup } from './auth.js';

// Views
import { renderDashboard } from './views/dashboard.js';
import { renderPronosticos, renderMatchCard, savePrediction, openMatchPredictionsModal } from './views/pronosticos.js';
import { renderFixture, setFixtureSubTab } from './views/fixture.js';
import { buildRanking, renderRanking } from './views/ranking.js';
import { renderResultados } from './views/resultados.js';
import { renderEspeciales, saveSpecial, renderAdminEspeciales, toggleSpecialEnabled, saveSpecialResults, clearSpecialResults } from './views/especiales.js';
import { renderPerfil, openChangePinModal, changePin } from './views/perfil.js';
import { renderAdminUsers, openCreateUserModal, openEditUserModal, saveUser, resetUserPin, deleteUser } from './views/admin/users.js';
import { renderAdminPartidos, openCargasModal, setManualStatus, openCreateMatchModal, openEditMatchModal, saveMatch, deleteMatch, deleteAllMatches, openResultadoModal, saveResult, clearResult, recalcularDeadlines, exportMatchesCSV, importMatchesCSV, getCargasCount, openPasteMatchesModal, previewPaste, confirmPaste, openBulkResultsModal, saveBulkResults } from './views/admin/partidos.js';
import { recalculateAllUserPoints, recalculatePointsForMatch } from './views/admin/puntos.js';

// ════════════ CONFETTI ════════════
export function triggerExactCelebration(match){
  showToast(
    `🎯 <strong>¡MARCADOR EXACTO!</strong> +5 PTS<div class="sub">${match.local} ${match.resultado_local}-${match.resultado_visitante} ${match.visitante}</div>`,
    {cls:"celebration",duration:5500}
  );
  if(typeof confetti!=="undefined"){
    confetti({particleCount:120,spread:80,origin:{y:.6},colors:["#fbbf24","#FF8F00","#2dd4bf","#0d9488"]});
    setTimeout(()=>confetti({particleCount:60,angle:60,spread:55,origin:{x:0,y:.7},colors:["#fbbf24","#FF8F00"]}),250);
    setTimeout(()=>confetti({particleCount:60,angle:120,spread:55,origin:{x:1,y:.7},colors:["#2dd4bf","#0d9488"]}),450);
  }
}

// ════════════ NAVIGATE & RENDER ════════════
export function navigate(view){
  state.currentView=view;
  state.filters={fase:null,dia:null,area:null,grupo:null,equipo:null,fixtureSubTab:"lista"};
  renderNavTabs();
  renderView();
  document.querySelector(".content")?.scrollTo({top:0,behavior:"smooth"});
}

export function setFilter(key,val){state.filters[key]=val;renderView()}

export function renderView(){
  const map={
    dashboard:renderDashboard,
    pronosticos:renderPronosticos,
    fixture:renderFixture,
    ranking:renderRanking,
    resultados:renderResultados,
    admin_users:renderAdminUsers,
    admin_partidos:renderAdminPartidos,
    admin_especiales:renderAdminEspeciales,
    especiales:renderEspeciales,
    perfil:renderPerfil
  };
  (map[state.currentView]||renderDashboard)();
}

// ════════════ INIT ════════════
async function init(){
  try{
    const [uSnap,mSnap,scSnap]=await Promise.all([
      usersRef.once("value"),matchesRef.once("value"),specialConfigRef.once("value")
    ]);
    state.allUsers=uSnap.val()||{};
    state.allMatches=mSnap.val()||{};
    state.prevMatches=JSON.parse(JSON.stringify(state.allMatches));
    state.specialConfig=scSnap.val()||{enabled:false};
    document.getElementById("loading").style.display="none";
    const saved=localStorage.getItem(SESSION_KEY);
    if(saved){
      try{
        const sess=JSON.parse(saved);
        if(sess&&sess.userId&&state.allUsers[sess.userId]){
          state.currentUser={id:sess.userId,...state.allUsers[sess.userId]};
          await postLoginSetup();return;
        }
      }catch{}
      localStorage.removeItem(SESSION_KEY);
    }
    if(Object.keys(state.allUsers).length===0){
      showScreen("bootstrapScreen");
      document.getElementById("bsNombre").focus();
    }else{
      populateLoginDropdown();showScreen("loginScreen");
    }
  }catch(err){
    console.error("Init error:",err);
    document.getElementById("loading").innerHTML=
      '<p style="color:var(--danger);text-align:center;padding:24px">❌ Error de conexión con Firebase.<br/><span style="font-size:11px;color:var(--muted)">Revisá la consola.</span></p>';
  }
}

// ════════════ WINDOW GLOBALS (llamados desde onclick en HTML) ════════════
Object.assign(window,{
  // auth
  createFirstAdmin, doLogin, doLogout,
  // nav
  navigate, setFilter, openModal, closeModal,
  // core
  renderView,
  // pronosticos
  savePrediction, openMatchPredictionsModal,
  // fixture
  setFixtureSubTab,
  // especiales jugador
  saveSpecial,
  // admin especiales
  toggleSpecialEnabled, saveSpecialResults, clearSpecialResults,
  // perfil
  openChangePinModal, changePin,
  // admin users
  openCreateUserModal, openEditUserModal, saveUser, resetUserPin, deleteUser,
  // admin partidos
  openCreateMatchModal, openEditMatchModal, saveMatch, deleteMatch, deleteAllMatches,
  openResultadoModal, saveResult, clearResult, recalcularDeadlines,
  openCargasModal, setManualStatus, exportMatchesCSV, importMatchesCSV,
  openPasteMatchesModal, previewPaste, confirmPaste,
  openBulkResultsModal, saveBulkResults,
  // admin puntos
  recalculateAllUserPoints,
});

// ════════════ EVENT LISTENERS ════════════
document.addEventListener("input",e=>{
  if(e.target.classList.contains("pin")) e.target.value=e.target.value.replace(/\D/g,"");
});
document.addEventListener("keypress",e=>{
  if(e.key!=="Enter") return;
  if(document.getElementById("bootstrapScreen").style.display!=="none") createFirstAdmin();
  else if(document.getElementById("loginScreen").style.display!=="none") doLogin();
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape") document.querySelectorAll(".overlay.open").forEach(o=>o.classList.remove("open"));
});
document.querySelectorAll(".overlay").forEach(o=>o.addEventListener("click",e=>{if(e.target===o)o.classList.remove("open")}));

// ════════════ ARRANQUE ════════════
init();
