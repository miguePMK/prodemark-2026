import { SESSION_KEY, VIEWS_WITH_MATCHES } from './config.js';
import { state } from './state.js';
import { usersRef, matchesRef, predictionsRef, specialConfigRef, specialPredsRef } from './firebase.js';
import { hashPin, showToast, showScreen, isAdmin, refreshTeamsList } from './helpers.js';
import { renderUserBadge, renderNavTabs } from './nav.js';
import { triggerExactCelebration } from './app.js';

// ════════════ BOOTSTRAP ════════════
export async function createFirstAdmin(){
  const nombre=document.getElementById("bsNombre").value.trim();
  const area=document.getElementById("bsArea").value;
  const pin=document.getElementById("bsPin").value;
  const pin2=document.getElementById("bsPin2").value;
  if(nombre.length<2) return showToast("⚠️ Nombre inválido");
  if(!/^\d{4}$/.test(pin)) return showToast("⚠️ El PIN debe tener 4 dígitos");
  if(pin!==pin2) return showToast("⚠️ Los PINs no coinciden");
  const userId="u_"+Date.now();
  const pinHash=await hashPin(pin);
  const newUser={nombre,area,pin_hash:pinHash,role:"admin",creado:Date.now(),puntos_total:0};
  try{
    await usersRef.child(userId).set(newUser);
    state.allUsers[userId]=newUser;
    state.currentUser={id:userId,...newUser};
    localStorage.setItem(SESSION_KEY,JSON.stringify({userId}));
    await postLoginSetup();
    showToast("✅ Administrador creado");
  }catch(err){console.error(err);showToast("❌ Error al crear admin")}
}

// ════════════ LOGIN ════════════
export function populateLoginDropdown(){
  const sel=document.getElementById("loginUser");
  const users=Object.entries(state.allUsers).sort((a,b)=>a[1].nombre.localeCompare(b[1].nombre,"es"));
  sel.innerHTML='<option value="">— Seleccioná tu usuario —</option>'+
    users.map(([id,u])=>{
      const tag=u.role==="admin"?" · admin":` · ${u.area||""}`;
      return `<option value="${id}">${u.nombre}${tag}</option>`;
    }).join("");
}
export async function doLogin(){
  const userId=document.getElementById("loginUser").value;
  const pin=document.getElementById("loginPin").value;
  if(!userId) return showToast("⚠️ Seleccioná un usuario");
  if(!/^\d{4}$/.test(pin)) return showToast("⚠️ Ingresá tu PIN");
  const user=state.allUsers[userId];
  if(!user) return showToast("❌ Usuario no encontrado");
  const pinHash=await hashPin(pin);
  if(pinHash!==user.pin_hash){
    document.getElementById("loginPin").value="";
    document.getElementById("loginPin").focus();
    return showToast("❌ PIN incorrecto");
  }
  state.currentUser={id:userId,...user};
  localStorage.setItem(SESSION_KEY,JSON.stringify({userId}));
  await postLoginSetup();
  showToast("👋 Bienvenido, "+user.nombre);
}
export function doLogout(){
  if(!confirm("¿Cerrar sesión?")) return;
  usersRef.off();matchesRef.off();specialConfigRef.off();
  if(state.currentUser){predictionsRef.child(state.currentUser.id).off();specialPredsRef.child(state.currentUser.id).off();}
  if(isAdmin()) specialPredsRef.off();
  localStorage.removeItem(SESSION_KEY);
  state.currentUser=null;state.myPredictions={};state.mySpecial={};state.allPredictions={};
  state.firstMatchLoad=true;state.prevMatches={};
  document.getElementById("loginPin").value="";
  populateLoginDropdown();showScreen("loginScreen");
}

// ════════════ POST LOGIN SETUP ════════════
export async function postLoginSetup(){
  renderUserBadge();
  renderNavTabs();
  const[predSnap,mySpecSnap]=await Promise.all([
    predictionsRef.child(state.currentUser.id).once("value"),
    specialPredsRef.child(state.currentUser.id).once("value")
  ]);
  state.myPredictions=predSnap.val()||{};
  state.mySpecial=mySpecSnap.val()||{};

  usersRef.on("value",snap=>{
    state.allUsers=snap.val()||{};
    if(state.currentUser&&state.allUsers[state.currentUser.id])
      state.currentUser={id:state.currentUser.id,...state.allUsers[state.currentUser.id]};
    if(["ranking","admin_users","dashboard","admin_especiales"].includes(state.currentView)) window.renderView();
  });

  matchesRef.on("value",snap=>{
    const newMatches=snap.val()||{};
    if(!state.firstMatchLoad&&!isAdmin()){
      Object.entries(newMatches).forEach(([id,m])=>{
        const prev=state.prevMatches[id];
        if(prev&&!prev.jugado&&m.jugado){
          const myPred=state.myPredictions[id];
          if(myPred&&myPred.local===m.resultado_local&&myPred.visitante===m.resultado_visitante)
            triggerExactCelebration(m);
        }
      });
    }
    state.prevMatches=JSON.parse(JSON.stringify(newMatches));
    state.allMatches=newMatches;
    refreshTeamsList();
    state.firstMatchLoad=false;
    if(VIEWS_WITH_MATCHES.includes(state.currentView)) window.renderView();
  });

  specialConfigRef.on("value",snap=>{
    state.specialConfig=snap.val()||{enabled:false};
    if(["dashboard","especiales","admin_especiales"].includes(state.currentView)) window.renderView();
  });

  predictionsRef.child(state.currentUser.id).on("value",snap=>{
    state.myPredictions=snap.val()||{};
    if(["dashboard","pronosticos","resultados"].includes(state.currentView)) window.renderView();
  });

  specialPredsRef.child(state.currentUser.id).on("value",snap=>{
    state.mySpecial=snap.val()||{};
    if(["dashboard","especiales"].includes(state.currentView)) window.renderView();
  });

  if(isAdmin()){
    specialPredsRef.on("value",snap=>{
      state.allSpecialPreds=snap.val()||{};
      if(state.currentView==="admin_especiales") window.renderView();
    });
    predictionsRef.on("value",snap=>{
      state.allPredictions=snap.val()||{};
      if(state.currentView==="admin_partidos") window.renderView();
    });
    const[sp,ap]=await Promise.all([specialPredsRef.once("value"),predictionsRef.once("value")]);
    state.allSpecialPreds=sp.val()||{};
    state.allPredictions=ap.val()||{};
  }

  refreshTeamsList();
  state.firstMatchLoad=false;
  showScreen("appScreen");
  window.navigate("dashboard");
}
