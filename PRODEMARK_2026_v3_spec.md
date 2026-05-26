# 📘 PRODEMARK 2026 — Especificación Técnica Completa

> Prode interno del Mundial 2026 para Petromark SRL · ~14 jugadores · vanilla HTML + Firebase RTDB + GitHub Pages

---

## 📑 Índice

1. [Resumen del proyecto](#1-resumen-del-proyecto)
2. [Stack y arquitectura](#2-stack-y-arquitectura)
3. [Estructura de datos en Firebase](#3-estructura-de-datos-en-firebase)
4. [Identidad visual](#4-identidad-visual)
5. [Sistema de autenticación](#5-sistema-de-autenticación)
6. [Sistema de puntuación](#6-sistema-de-puntuación)
7. [Features del sistema completo](#7-features-del-sistema-completo)
8. [🆕 Cambios de la v3 (lo que se agrega ahora)](#8-cambios-de-la-v3)
9. [Snippets de código clave](#9-snippets-de-código-clave)
10. [CSS nuevo necesario](#10-css-nuevo-necesario)
11. [Plan de implementación paso a paso](#11-plan-de-implementación)

---

## 1. Resumen del proyecto

**Nombre:** PRODEMARK 2026 (fusión PRODE + PETROMARK)
**Tipo:** Web app monolítica de un solo archivo `index.html`
**Hosting:** GitHub Pages (gratis)
**Backend:** Firebase Realtime Database
**Participantes:** ~14 empleados de Petromark SRL
**Duración:** Mundial 2026, del 11 de junio al 19 de julio
**Idioma:** Castellano argentino

**Filosofía de diseño:**
- Mobile-first (la mayoría va a usar el celu)
- Sin Firebase Auth (es pago) → sistema custom con PIN + SHA-256
- Sin frameworks JS (vanilla, importa Firebase + canvas-confetti por CDN)
- Tipografía: Outfit + DM Mono (suave, moderna)
- Paleta: teal Petromark (#1E6F76) + acentos púrpura (bonus) y dorado (celebraciones)

---

## 2. Stack y arquitectura

### Archivos del proyecto

```
prodemark-2026/
├── index.html                  # ~3500 líneas, todo el sistema embebido
├── partidos_mundial_2026.csv   # Plantilla de partidos para import
└── README.md                   # Instrucciones de despliegue
```

### CDN imports

```html
<!-- Firebase v9 compat -->
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>

<!-- Confetti para celebración de exactos (NUEVO v3) -->
<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"></script>

<!-- Fuentes -->
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Firebase Config

```js
const firebaseConfig = {
  apiKey: "AIzaSyBie-s2X5g-RkFpCIXkNV50CSk4GfdxAuc",
  authDomain: "prodemark-2026.firebaseapp.com",
  databaseURL: "https://prodemark-2026-default-rtdb.firebaseio.com",
  projectId: "prodemark-2026",
  storageBucket: "prodemark-2026.firebasestorage.app",
  messagingSenderId: "960484825687",
  appId: "1:960484825687:web:c0084c1d3564555978a112"
};
```

---

## 3. Estructura de datos en Firebase

```
prodemark-2026-default-rtdb/
│
├── users/{userId}/                    # userId = "u_" + Date.now()
│   ├── nombre              string
│   ├── area                string     # "IT", "Operaciones", "Comercial", "Administración", "Otra"
│   ├── role                string     # "admin" | "user"
│   ├── pin_hash            string     # SHA-256(pin + SALT)
│   ├── creado              number     # timestamp
│   └── puntos_total        number     # denormalizado, recalculado
│
├── matches/{matchId}/                 # matchId = "m_" + Date.now()
│   ├── fase                string     # "grupos" | "16avos" | "octavos" | "cuartos" | "semi" | "tercer" | "final"
│   ├── grupo               string?    # "A", "B"... (sólo en fase grupos)
│   ├── fecha_iso           string     # ISO 8601 con offset -03:00
│   ├── deadline_iso        string     # 00:00 del día del partido
│   ├── local               string     # "🇦🇷 Argentina"
│   ├── visitante           string
│   ├── manual_status       string?    # null | "enabled" | "disabled"
│   ├── jugado              bool
│   ├── resultado_local     number?
│   └── resultado_visitante number?
│
├── predictions/{userId}/{matchId}/
│   ├── local               number
│   ├── visitante           number
│   ├── timestamp           number
│   └── puntos              number?    # calculado al cargar resultado
│
├── special_config/                    # config del bonus mini-prode
│   ├── enabled             bool       # toggle admin abre/cierra carga
│   ├── campeon_real        string?    # cargado al final del Mundial
│   ├── finalista_real_1    string?
│   └── finalista_real_2    string?
│
└── special_predictions/{userId}/      # bonus de cada jugador
    ├── campeon             string     # "🇦🇷 Argentina"
    ├── finalista1          string
    ├── finalista2          string
    ├── timestamp           number
    └── puntos              number?    # calculado cuando admin carga real
```

### Reglas de seguridad recomendadas

Para producción interna (link compartido sólo por WhatsApp del grupo):

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

⚠️ Reglas abiertas. OK para uso interno entre conocidos. Para más seguridad real haría falta Firebase Auth (pago).

---

## 4. Identidad visual

### Paleta CSS

```css
:root{
  --teal:#1E6F76;       /* primario Petromark */
  --teal-dark:#0D4A50;
  --teal-light:#2A9B9C;
  --black:#1A1A1A;
  --white:#FFFFFF;
  --bg:#F4F5F6;
  --orange:#E65100;     /* admin / warnings */
  --orange-light:#FFF7E6;
  --gray:#6B7280;
  --gray-light:#E5E7EB;
  --gray-bg:#F9FAFB;
  --green:#2E7D32;      /* aciertos */
  --green-bg:#E8F5E9;
  --red:#B71C1C;        /* errores */
  --red-bg:#FFEBEE;
  --yellow:#F59E0B;     /* parciales */
  --yellow-bg:#FFFBEB;
  --blue:#1565C0;
  --blue-bg:#E3F2FD;
  --purple:#6A1B9A;     /* bonus mini-prode */
  --purple-bg:#F3E5F5;
  --gold:#FFD700;       /* celebración exactos */
  --gold-dark:#FFA500;
  --shadow:0 1px 3px rgba(0,0,0,0.08);
  --shadow-md:0 2px 8px rgba(0,0,0,0.1);
  --shadow-lg:0 4px 16px rgba(0,0,0,0.12);
}
```

### Tipografía

- **Display + Body:** Outfit (300, 400, 500, 600, 700, 800)
- **Mono (marcadores, horarios):** DM Mono (400, 500)

### Logo Petromark (SVG inline embebido)

```html
<svg style="display:none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <symbol id="logo" viewBox="0 0 100 110">
      <path d="M50 4 C50 4 88 14 92 16 C95 17 95 19 95 22 L95 60 C95 86 76 100 50 106 C24 100 5 86 5 60 L5 22 C5 19 5 17 8 16 C12 14 50 4 50 4 Z" fill="#1E6F76"/>
      <path d="M50 12 C50 12 83 21 86 23 C88 24 88 25 88 27 L88 60 C88 81 72 92 50 97 C28 92 12 81 12 60 L12 27 C12 25 12 24 14 23 C17 21 50 12 50 12 Z" fill="#FFFFFF"/>
      <path d="M50 18 C50 18 78 26 80 27 C82 28 82 29 82 31 L82 60 C82 78 67 88 50 92 C33 88 18 78 18 60 L18 31 C18 29 18 28 20 27 C22 26 50 18 50 18 Z" fill="#1A1A1A"/>
      <path d="M38 38 Q38 36 40 36 L60 36 Q62 36 62 38 L52 68 Q50 71 48 68 Z" fill="#FFFFFF"/>
    </symbol>
  </defs>
</svg>

<!-- Uso en cualquier parte: -->
<svg><use href="#logo"/></svg>
```

---

## 5. Sistema de autenticación

### Hash de PIN

```js
const SALT = "PMK_PRODEMARK_2026_v1_salt";

async function hashPin(pin){
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin+SALT));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
```

### Persistencia de sesión

```js
const SESSION_KEY = "pmk_session_v1";

// Login: localStorage.setItem(SESSION_KEY, JSON.stringify({userId}));
// Init: lee, valida que el user exista, si sí → auto-login
// Logout: localStorage.removeItem(SESSION_KEY);
```

### Flujo de pantallas

```
init()
  ├── Si DB vacía → bootstrapScreen (crear primer admin)
  ├── Si hay session válida → auto-login → appScreen
  └── Si no → loginScreen (dropdown de usuarios + PIN)
```

---

## 6. Sistema de puntuación

### Puntaje por partido

| Resultado | Puntos |
|-----------|--------|
| 🎯 Marcador exacto | **5** |
| 🔍 Acertás ganador o empate (no marcador exacto) | **2** |
| ❌ Fallás | **0** |

```js
function calcPoints(pred, match){
  if(!match.jugado || pred==null || pred.local==null || pred.visitante==null) return null;
  if(pred.local===match.resultado_local && pred.visitante===match.resultado_visitante) return 5;
  const psign=Math.sign(pred.local-pred.visitante);
  const rsign=Math.sign(match.resultado_local-match.resultado_visitante);
  return psign===rsign ? 2 : 0;
}
```

### Puntaje del Bonus Mini-Prode

```js
const BONUS_CAMPEON = 20;
const BONUS_FINALISTA = 10;
// Máximo total: 40 pts (20 campeón + 10 × 2 finalistas)

function calcSpecialPoints(pred, cfg){
  if(!cfg || !cfg.campeon_real || !pred) return null;
  let pts=0;
  if(pred.campeon && pred.campeon===cfg.campeon_real) pts+=BONUS_CAMPEON;
  const realF=[cfg.finalista_real_1, cfg.finalista_real_2].filter(Boolean);
  const predF=[pred.finalista1, pred.finalista2].filter(Boolean);
  realF.forEach(f=>{ if(predF.includes(f)) pts+=BONUS_FINALISTA });
  return pts;
}
```

### Cierre automático y manual

```js
// Status posibles: jugado | abierto | abierto-manual | por-cerrar | cerrado | cerrado-manual
function getMatchStatus(match){
  if(match.jugado) return "jugado";
  const now=Date.now();
  const fechaTs=new Date(match.fecha_iso).getTime();

  // Override manual del admin
  if(match.manual_status==="disabled") return "cerrado-manual";
  if(match.manual_status==="enabled"){
    if(now>=fechaTs) return "cerrado";  // ya empezó, override inválido
    return "abierto-manual";
  }

  // Default: deadline automático (00:00 del día)
  const deadline=new Date(match.deadline_iso).getTime();
  if(now>=deadline) return "cerrado";
  if(deadline-now < 24*3600*1000) return "por-cerrar";
  return "abierto";
}
```

---

## 7. Features del sistema completo

### Tabs del jugador

```
📊 Dashboard · ⚽ Pronósticos · 📅 Fixture · 🎯 Bonus · 🏆 Ranking · 📋 Resultados · ⚙️ Perfil
```

### Tabs del admin

```
📊 Dashboard · 📅 Fixture · 🏆 Ranking · 👥 Usuarios · 🗓 Partidos · 🎯 Bonus · ⚙️ Perfil
```

> **El admin NO compite:** está excluido de rankings, no suma puntos, no tiene tabs de "Pronósticos" ni "Resultados" personales.

### Listado de features completas

| Feature | Jugador | Admin |
|---------|---------|-------|
| Login con PIN | ✅ | ✅ |
| Bootstrap inicial (primer admin) | — | ✅ |
| Cambio de PIN | ✅ | ✅ |
| Dashboard con stats personales | ✅ | — |
| Dashboard con stats del torneo | — | ✅ |
| **🆕 Match del día (card grande)** | ✅ | ✅ (info-only) |
| **🆕 Stats personales en Perfil** | ✅ | — |
| Cargar pronósticos | ✅ | — |
| **🆕 Filtros: fase, día, grupo, equipo** | ✅ | — |
| **🆕 Confetti al acertar exacto** | ✅ | — |
| Ver ranking | ✅ | ✅ |
| **🆕 FIXTURE: lista + posiciones + bracket** | ✅ | ✅ |
| **🆕 Pronos sociales (modal)** | ✅ | ✅ |
| Cargar Bonus mini-prode | ✅ | — |
| Ver bonus resuelto | ✅ | — |
| ABM Usuarios | — | ✅ |
| ABM Partidos | — | ✅ |
| **🆕 Ver cargas (cargó/no cargó)** | — | ✅ |
| Toggle manual abrir/cerrar partido | — | ✅ |
| Cargar resultados de partidos | — | ✅ |
| Toggle bonus on/off | — | ✅ |
| Cargar resultados del bonus | — | ✅ |
| Import/Export CSV de partidos | — | ✅ |

---

## 8. Cambios de la v3

### 8.1 🔍 Admin: ver quién cargó pronósticos

**Decisión:** Opción A → sólo "cargó/no cargó" (no se muestran los marcadores, sólo el estado).

**Dónde:** Nueva columna **"Cargas"** en la tabla de Partidos del admin, con formato `X/Y` (cargaron X de Y jugadores). Es clickeable → abre modal.

**Modal:** Lista dividida en dos secciones:
- ✅ **Cargaron pronóstico** (X) — listado de jugadores con avatar
- ⏳ **Falta cargar** (Y-X) — listado de jugadores pendientes (con bg naranja para destacar)

**Implementación clave:** suscribir al admin a `predictionsRef` globalmente (no por usuario) en `postLoginSetup()`. Para 14 jugadores × ~104 partidos = ~1500 nodos, manejable.

```js
// En postLoginSetup, si es admin:
if(isAdmin()){
  predictionsRef.on("value", snap=>{
    allPredictions=snap.val()||{};
    if(currentView==="admin_partidos") renderView();
  });
}

// Counter helper:
function getCargasCount(matchId){
  let loaded=0, total=0;
  Object.entries(allUsers).forEach(([uid,u])=>{
    if(u.role==="admin") return;
    total++;
    const userPreds=allPredictions[uid] || {};
    const p=userPreds[matchId];
    if(p && p.local!=null && p.visitante!=null) loaded++;
  });
  return {loaded, total};
}
```

### 8.2 📅 FIXTURE (nueva sección)

**Tab nueva para todos** (jugador y admin). Sub-tabs internas:

#### 📋 Lista
- Todos los partidos sin inputs (read-only)
- Filtros: **fase**, **día**, **grupo**, **equipo** (dropdown con autocompletado de los 48)
- Mismas match cards que Pronósticos pero sin score inputs
- Botón "👥 Ver pronos" si el partido cerró o se jugó

#### 🔢 Posiciones
- Tabla por cada grupo del Mundial (A-L)
- Calculada automáticamente con resultados cargados
- Columnas: PJ, PG, PE, PP, GF, GC, DG, Pts
- Los 2 primeros tienen fondo verde claro (clasificación)
- Criterio de desempate: Pts → DG → GF → alfabético

```js
function calcStandings(grupo){
  const teams={};
  Object.values(allMatches).forEach(m=>{
    if(m.fase!=="grupos" || m.grupo!==grupo) return;
    [m.local,m.visitante].forEach(t=>{
      if(!t)return;
      if(!teams[t]) teams[t]={nombre:t,PJ:0,PG:0,PE:0,PP:0,GF:0,GC:0,Pts:0};
    });
    if(!m.jugado) return;
    const L=teams[m.local], V=teams[m.visitante];
    L.PJ++; V.PJ++;
    L.GF+=m.resultado_local; L.GC+=m.resultado_visitante;
    V.GF+=m.resultado_visitante; V.GC+=m.resultado_local;
    if(m.resultado_local>m.resultado_visitante){ L.PG++; L.Pts+=3; V.PP++; }
    else if(m.resultado_local<m.resultado_visitante){ V.PG++; V.Pts+=3; L.PP++; }
    else{ L.PE++; V.PE++; L.Pts++; V.Pts++; }
  });
  return Object.values(teams)
    .map(t=>({...t,DG:t.GF-t.GC}))
    .sort((a,b)=>b.Pts-a.Pts || b.DG-a.DG || b.GF-a.GF || a.nombre.localeCompare(b.nombre,"es"));
}
```

#### 🏆 Eliminatorias (bracket-style)
- Una sección por cada fase: 16avos → Octavos → Cuartos → Semi → 3er Puesto → Final
- Cada matchup en una card chica con ambos equipos
- El ganador se destaca con fondo verde claro
- Click en el match → abre modal de pronos sociales

### 8.3 🏆 Filtro por grupo y equipo (en Pronósticos y Fixture)

**Grupo:** chip bar igual que "Fase", basado en los grupos cargados.
**Equipo:** dropdown (los 48 equipos, autocompletado desde `getUniqueTeams()`).

```js
let filtered=matches;
if(filters.fase) filtered=filtered.filter(([,m])=>m.fase===filters.fase);
if(filters.dia) filtered=filtered.filter(([,m])=>dayKey(m.fecha_iso)===filters.dia);
if(filters.grupo) filtered=filtered.filter(([,m])=>m.grupo===filters.grupo);
if(filters.equipo) filtered=filtered.filter(([,m])=>m.local===filters.equipo || m.visitante===filters.equipo);
```

### 8.4 🔥 Match del día (dashboard del jugador)

**Lógica:**
- Si hay partidos hoy y no jugados → "🔥 HOY" (puede mostrar varios)
- Si no hay hoy → próximo partido pendiente → "⏭ PRÓXIMO" con días restantes
- Si todos jugaron → no se muestra

**UI:** Card grande con borde dorado (hoy) o azul (próximo), separada del countdown del Mundial. Cada match es clickeable → te lleva a Pronósticos.

```js
function getMatchOfDay(){
  const now=new Date();
  const todayK=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const all=Object.entries(allMatches).sort((a,b)=>new Date(a[1].fecha_iso)-new Date(b[1].fecha_iso));
  const todays=all.filter(([,m])=>dayKey(m.fecha_iso)===todayK && !m.jugado);
  if(todays.length>0) return {kind:"today", matches:todays};
  const next=all.find(([,m])=>!m.jugado && new Date(m.fecha_iso) > now);
  if(next){
    const diff=new Date(next[1].fecha_iso)-now;
    const days=Math.floor(diff/86400000);
    return {kind:"next", matches:[next], days};
  }
  return null;
}
```

### 8.5 🎉 Confetti al acertar exacto

**Trigger:** detección de transición `jugado: false → true` comparando snapshot anterior con el nuevo del listener de `matchesRef.on("value")`.

**Si la predicción del jugador coincide con el resultado:**
- Burst central (120 particles) con colores teal + dorado
- Burst lateral izquierdo (250ms delay) — dorados
- Burst lateral derecho (450ms delay) — teals
- Toast grande dorado: **"🎯 ¡MARCADOR EXACTO! +5 PTS"** + subtítulo con marcador

```js
let prevMatches={}, firstMatchLoad=true;

matchesRef.on("value", snap=>{
  const newMatches=snap.val()||{};
  // Detectar exactos (sólo jugador, no en primer load)
  if(!firstMatchLoad && !isAdmin()){
    Object.entries(newMatches).forEach(([id,m])=>{
      const prev=prevMatches[id];
      if(prev && !prev.jugado && m.jugado){
        const myPred=myPredictions[id];
        if(myPred && myPred.local===m.resultado_local && myPred.visitante===m.resultado_visitante){
          triggerExactCelebration(m);
        }
      }
    });
  }
  prevMatches=JSON.parse(JSON.stringify(newMatches));
  allMatches=newMatches;
  refreshTeamsList();
  firstMatchLoad=false;
  if(VIEWS_WITH_MATCHES.includes(currentView)) renderView();
});

function triggerExactCelebration(match){
  showToast(
    `🎯 <strong>¡MARCADOR EXACTO!</strong> +5 PTS<div class="sub">${match.local} ${match.resultado_local}-${match.resultado_visitante} ${match.visitante}</div>`,
    {cls:"celebration", duration:5500}
  );
  if(typeof confetti!=="undefined"){
    confetti({particleCount:120, spread:80, origin:{y:0.6}, colors:["#FFD700","#FF8F00","#1E6F76","#2A9B9C"]});
    setTimeout(()=>confetti({particleCount:60, angle:60, spread:55, origin:{x:0, y:0.7}, colors:["#FFD700","#FF8F00"]}),250);
    setTimeout(()=>confetti({particleCount:60, angle:120, spread:55, origin:{x:1, y:0.7}, colors:["#1E6F76","#2A9B9C"]}),450);
  }
}
```

### 8.6 📊 Stats personales en Perfil (3 cards)

Una sección nueva en el Perfil del jugador (admin no la ve, porque no compite).

| Card | Cálculo |
|------|---------|
| 🎯 **Tasa de aciertos** | `(exactos + parciales) / total pronosticado en partidos jugados × 100` |
| 🔥 **Mejor racha** | Cantidad máxima de marcadores exactos consecutivos (en partidos jugados, ordenados por fecha) |
| 🍀 **Equipo lucky** | El equipo del Mundial en cuyos partidos más puntos sumaste (puede ser local o visitante) |

```js
function calcUserStats(predictions, matches){
  const playedSorted = Object.entries(matches)
    .filter(([,m])=>m.jugado)
    .sort((a,b)=>new Date(a[1].fecha_iso)-new Date(b[1].fecha_iso));

  let totalPred=0, exactos=0, parciales=0, fallados=0;
  let mejorRacha=0, rachaActual=0;
  const teamPoints={};

  for(const [matchId, m] of playedSorted){
    const pred=predictions[matchId];
    if(!pred || pred.local==null || pred.visitante==null){ rachaActual=0; continue; }
    totalPred++;
    const pts=calcPoints(pred, m);
    if(pts===5){ exactos++; rachaActual++; mejorRacha=Math.max(mejorRacha, rachaActual); }
    else if(pts===2){ parciales++; rachaActual=0; }
    else{ fallados++; rachaActual=0; }
    [m.local, m.visitante].forEach(team=>{
      if(!teamPoints[team]) teamPoints[team]={pts:0, matches:0};
      teamPoints[team].pts += pts;
      teamPoints[team].matches++;
    });
  }

  let luckyTeam=null, luckyPts=0;
  Object.entries(teamPoints).forEach(([team, data])=>{
    if(data.pts > luckyPts){ luckyPts=data.pts; luckyTeam=team; }
  });

  const tasaExito = totalPred>0 ? Math.round(((exactos+parciales)/totalPred)*100) : 0;
  return {totalPred, exactos, parciales, fallados, mejorRacha, tasaExito, luckyTeam, luckyPts};
}
```

### 8.7 👥 Pronos sociales (ver pronos de los demás)

**Cuándo:** Botón "👥 Ver pronos" aparece en cada match card **sólo si el partido ya cerró** (status `cerrado`, `cerrado-manual`) o **ya se jugó**.

**Por qué:** Evita que se copien antes del cierre. Una vez cerrado, ya no se pueden editar pronósticos → mostrar todos genera bardo y comentarios entre los compañeros.

**Modal:** Tabla con avatar, nombre, área, marcador predicho, puntos sumados (si jugado).
- Ordenado por puntos descendente
- Tu fila se destaca con borde teal y "(vos)"
- Si jugado: cada marcador tiene fondo (verde=exacto, amarillo=parcial, gris=miss)
- Al final, lista de quienes NO cargaron

**Implementación:** Si es admin (ya tiene `allPredictions` global), usa esa cache. Si es jugador, hace fetch on-demand de `predictionsRef.once("value")` al abrir el modal (no se mantiene en memoria permanente para jugadores).

```js
async function openMatchPredictionsModal(matchId){
  const m=allMatches[matchId]; if(!m) return;
  const status=getMatchStatus(m);
  if(!isClosedOrPlayed(status)) return showToast("⚠️ Los pronos se ven cuando el partido cierre");

  let preds;
  if(isAdmin() && Object.keys(allPredictions).length>0){
    preds=allPredictions;
  } else {
    const snap=await predictionsRef.once("value");
    preds=snap.val()||{};
  }

  const rows=[], noPred=[];
  Object.entries(allUsers).forEach(([uid,u])=>{
    if(u.role==="admin") return;
    const userPreds=preds[uid] || {};
    const p=userPreds[matchId];
    if(p && p.local!=null && p.visitante!=null){
      const pts=m.jugado?calcPoints(p,m):null;
      rows.push({uid, nombre:u.nombre, area:u.area||"", local:p.local, visitante:p.visitante, pts});
    } else {
      noPred.push(u.nombre);
    }
  });
  rows.sort((a,b)=>(b.pts||0)-(a.pts||0) || a.nombre.localeCompare(b.nombre,"es"));

  // ... render modal con rows + noPred
}
```

---

## 9. Snippets de código clave

### 9.1 Helpers globales

```js
function isClosedOrPlayed(s){return s==="cerrado" || s==="cerrado-manual" || s==="jugado"}
function isEditableStatus(s){return s==="abierto" || s==="por-cerrar" || s==="abierto-manual"}
function isAdmin(){return currentUser && currentUser.role==="admin"}

function getUniqueTeams(){
  const teams=new Set();
  Object.values(allMatches).forEach(m=>{
    if(m.local) teams.add(m.local);
    if(m.visitante) teams.add(m.visitante);
  });
  return [...teams].sort();
}

function refreshTeamsList(){
  document.getElementById("teamsList").innerHTML =
    getUniqueTeams().map(t=>`<option value="${escapeAttr(t)}">`).join("");
}
```

### 9.2 Estado global

```js
let allUsers={}, allMatches={}, myPredictions={};
let specialConfig={enabled:false}, mySpecial={}, allSpecialPreds={};
let allPredictions={};                  // 🆕 sólo admin
let prevMatches={}, firstMatchLoad=true; // 🆕 para detectar confetti
let currentUser=null, currentView="dashboard";
let filters={
  fase:null, dia:null, area:null,
  grupo:null, equipo:null,              // 🆕
  fixtureSubTab:"lista"                  // 🆕
};
```

### 9.3 Navegación con tabs por rol

```js
function renderNavTabs(){
  const tabs = isAdmin() ? [
    {id:"dashboard", label:"📊 Dashboard"},
    {id:"fixture", label:"📅 Fixture"},        // 🆕
    {id:"ranking", label:"🏆 Ranking"},
    {id:"admin_users", label:"👥 Usuarios"},
    {id:"admin_partidos", label:"🗓 Partidos"},
    {id:"admin_especiales", label:"🎯 Bonus"},
    {id:"perfil", label:"⚙️ Perfil"}
  ] : [
    {id:"dashboard", label:"📊 Dashboard"},
    {id:"pronosticos", label:"⚽ Pronósticos"},
    {id:"fixture", label:"📅 Fixture"},        // 🆕
    {id:"especiales", label:"🎯 Bonus"},
    {id:"ranking", label:"🏆 Ranking"},
    {id:"resultados", label:"📋 Resultados"},
    {id:"perfil", label:"⚙️ Perfil"}
  ];
  document.getElementById("navTabs").innerHTML=tabs.map(t=>
    `<button class="nav-tab ${t.id===currentView?"active":""}" onclick="navigate('${t.id}')">${t.label}</button>`
  ).join("");
}

function renderView(){
  const map={
    dashboard: renderDashboard,
    pronosticos: renderPronosticos,
    fixture: renderFixture,                    // 🆕
    ranking: renderRanking,
    resultados: renderResultados,
    admin_users: renderAdminUsers,
    admin_partidos: renderAdminPartidos,
    admin_especiales: renderAdminEspeciales,
    especiales: renderEspeciales,
    perfil: renderPerfil
  };
  (map[currentView] || renderDashboard)();
}
```

### 9.4 postLoginSetup con suscripciones

```js
async function postLoginSetup(){
  renderUserBadge();
  renderNavTabs();
  const [predSnap, mySpecSnap] = await Promise.all([
    predictionsRef.child(currentUser.id).once("value"),
    specialPredsRef.child(currentUser.id).once("value")
  ]);
  myPredictions = predSnap.val() || {};
  mySpecial = mySpecSnap.val() || {};

  // Subs comunes
  usersRef.on("value", snap=>{
    allUsers = snap.val() || {};
    if(currentUser && allUsers[currentUser.id]) currentUser={id:currentUser.id, ...allUsers[currentUser.id]};
    if(["ranking","admin_users","dashboard","admin_especiales"].includes(currentView)) renderView();
  });

  // 🆕 Listener de matches con detección de transiciones (confetti)
  matchesRef.on("value", snap=>{
    const newMatches = snap.val() || {};
    if(!firstMatchLoad && !isAdmin()){
      Object.entries(newMatches).forEach(([id,m])=>{
        const prev = prevMatches[id];
        if(prev && !prev.jugado && m.jugado){
          const myPred = myPredictions[id];
          if(myPred && myPred.local===m.resultado_local && myPred.visitante===m.resultado_visitante){
            triggerExactCelebration(m);
          }
        }
      });
    }
    prevMatches = JSON.parse(JSON.stringify(newMatches));
    allMatches = newMatches;
    refreshTeamsList();
    firstMatchLoad = false;
    if(["dashboard","pronosticos","resultados","admin_partidos","especiales","admin_especiales","fixture"].includes(currentView)) renderView();
  });

  specialConfigRef.on("value", snap=>{
    specialConfig = snap.val() || {enabled:false};
    if(["dashboard","especiales","admin_especiales"].includes(currentView)) renderView();
  });

  predictionsRef.child(currentUser.id).on("value", snap=>{
    myPredictions = snap.val() || {};
    if(["dashboard","pronosticos","resultados"].includes(currentView)) renderView();
  });

  specialPredsRef.child(currentUser.id).on("value", snap=>{
    mySpecial = snap.val() || {};
    if(["dashboard","especiales"].includes(currentView)) renderView();
  });

  // 🆕 Suscripciones globales sólo si admin
  if(isAdmin()){
    specialPredsRef.on("value", snap=>{
      allSpecialPreds = snap.val() || {};
      if(currentView==="admin_especiales") renderView();
    });
    predictionsRef.on("value", snap=>{
      allPredictions = snap.val() || {};
      if(currentView==="admin_partidos") renderView();
    });
    const [sp, ap] = await Promise.all([
      specialPredsRef.once("value"),
      predictionsRef.once("value")
    ]);
    allSpecialPreds = sp.val() || {};
    allPredictions = ap.val() || {};
  }

  refreshTeamsList();
  firstMatchLoad = false;
  showScreen("appScreen");
  navigate("dashboard");
}
```

### 9.5 renderFixture (con sub-tabs)

```js
function setFixtureSubTab(tab){filters.fixtureSubTab=tab; renderFixture()}

function renderFixture(){
  if(Object.keys(allMatches).length===0){
    document.getElementById("mainView").innerHTML =
      `<h2 class="view-title">📅 Fixture</h2>
       <div class="empty-state">
         <div class="icon">📅</div>
         <h3>Sin partidos cargados</h3>
         <p>Esperá a que el admin cargue los partidos.</p>
       </div>`;
    return;
  }
  const sub = filters.fixtureSubTab || "lista";
  document.getElementById("mainView").innerHTML = `
    <h2 class="view-title">📅 Fixture del Mundial 2026</h2>
    <p class="view-sub">Consulta general · partidos, posiciones por grupo y cuadro de eliminatorias</p>
    <div class="sub-tabs">
      <button class="sub-tab ${sub==='lista'?'active':''}" onclick="setFixtureSubTab('lista')">📋 Lista</button>
      <button class="sub-tab ${sub==='grupos'?'active':''}" onclick="setFixtureSubTab('grupos')">🔢 Posiciones</button>
      <button class="sub-tab ${sub==='bracket'?'active':''}" onclick="setFixtureSubTab('bracket')">🏆 Eliminatorias</button>
    </div>
    <div id="fixtureContent"></div>`;
  if(sub==="lista") renderFixtureLista();
  else if(sub==="grupos") renderFixtureGrupos();
  else renderFixtureBracket();
}

function renderFixtureBracket(){
  const fases = ["16avos","octavos","cuartos","semi","tercer","final"];
  const byFase = {};
  fases.forEach(f => {
    byFase[f] = Object.entries(allMatches)
      .filter(([,m]) => m.fase===f)
      .sort((a,b) => new Date(a[1].fecha_iso) - new Date(b[1].fecha_iso));
  });
  const totalElim = fases.reduce((s,f) => s + byFase[f].length, 0);
  if(totalElim === 0){
    document.getElementById("fixtureContent").innerHTML =
      `<div class="empty-state">
         <div class="icon">🏆</div>
         <h3>Sin partidos de eliminatorias</h3>
         <p>Los partidos eliminatorios se cargan a medida que el torneo avanza.</p>
       </div>`;
    return;
  }
  document.getElementById("fixtureContent").innerHTML = fases.map(f => {
    if(byFase[f].length === 0) return "";
    return `<div class="bracket-section">
      <h3 class="bracket-fase-title">${FASE_LABELS[f]}</h3>
      <div class="bracket-matches">
        ${byFase[f].map(([id,m]) => {
          const winsLoc = m.jugado && m.resultado_local > m.resultado_visitante;
          const winsVis = m.jugado && m.resultado_visitante > m.resultado_local;
          const canClick = isClosedOrPlayed(getMatchStatus(m));
          return `<div class="bracket-match ${m.jugado?'jugado':''}"
                       ${canClick?`onclick="openMatchPredictionsModal('${id}')" style="cursor:pointer"`:''}>
            <div class="bracket-teams">
              <div class="bracket-team ${winsLoc?'winner':''}">
                <span>${m.local||"TBD"}</span>
                ${m.jugado?`<span class="score">${m.resultado_local}</span>`:""}
              </div>
              <div class="bracket-team ${winsVis?'winner':''}">
                <span>${m.visitante||"TBD"}</span>
                ${m.jugado?`<span class="score">${m.resultado_visitante}</span>`:""}
              </div>
            </div>
            <div class="bracket-meta">${fmtDateShort(m.fecha_iso)} · ${fmtTime(m.fecha_iso)}${canClick?' · 👥 ver pronos':''}</div>
          </div>`;
        }).join("")}
      </div>
    </div>`;
  }).join("");
}
```

### 9.6 Tabla admin Partidos con columna Cargas

```js
// En renderAdminPartidos, en cada `<tr>`:
const cargas = getCargasCount(id);
const cargasCls = cargas.loaded===0 ? "empty" : (cargas.loaded===cargas.total ? "full" : "");

`<td><span class="cargas-cell ${cargasCls}" ${cargas.total>0?`onclick="openCargasModal('${id}')"`:''}>
  ${cargas.loaded}/${cargas.total}
</span></td>`
```

### 9.7 Match cards con botón "Ver pronos"

```js
// En renderMatchCard, dentro del statusBlock, agregar al final:
${isClosedOrPlayed(status) ?
  `<button class="social-btn" onclick="openMatchPredictionsModal('${id}')">👥 Ver pronos</button>` :
  ""}
```

### 9.8 Toast con celebración (en showToast)

```js
function showToast(msg, opts){
  const t = document.getElementById("toast");
  t.innerHTML = msg;
  t.className = "toast show" + (opts && opts.cls ? " " + opts.cls : "");
  setTimeout(() => t.classList.remove("show"), (opts && opts.duration) || 2400);
}
```

---

## 10. CSS nuevo necesario

```css
/* === Match of Day card === */
.match-of-day{
  background:linear-gradient(135deg,#FFF8E1,#FFECB3);
  border:2px solid var(--gold-dark);
  border-radius:14px;
  padding:18px 22px;
  margin-bottom:20px;
  box-shadow:0 4px 16px rgba(255,165,0,0.2);
}
.match-of-day.next{
  background:linear-gradient(135deg,#E3F2FD,#BBDEFB);
  border-color:var(--blue);
  box-shadow:0 4px 16px rgba(21,101,192,0.15);
}
.mod-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:10px;flex-wrap:wrap}
.mod-pill{
  display:inline-block;background:var(--gold-dark);color:white;
  padding:4px 10px;border-radius:12px;font-size:10px;font-weight:700;
  letter-spacing:1px;text-transform:uppercase;
}
.match-of-day.next .mod-pill{background:var(--blue)}
.mod-header h3{font-size:18px;font-weight:700;color:var(--black);letter-spacing:0.5px}
.mod-match{
  background:white;border-radius:10px;padding:14px;margin-top:10px;
  cursor:pointer;transition:transform 0.15s,box-shadow 0.15s;
  display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;
  border:1px solid rgba(0,0,0,0.05);
}
.mod-match:hover{transform:translateY(-1px);box-shadow:var(--shadow-md)}
.mod-match-time{font-family:'DM Mono',monospace;font-size:14px;font-weight:500;display:flex;flex-direction:column;gap:2px}
.mod-match-time .mod-fase{
  font-family:'Outfit',sans-serif;font-size:9px;color:var(--teal);
  text-transform:uppercase;letter-spacing:0.8px;font-weight:600;
}
.mod-match-teams{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center}
.mod-match-teams .team{font-size:14px;font-weight:600}
.mod-vs{font-family:'DM Mono',monospace;font-weight:500;color:var(--teal);min-width:50px;text-align:center;font-size:14px}
.mod-cta{font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--teal);font-weight:600}

/* === Sub-tabs (FIXTURE) === */
.sub-tabs{
  display:flex;gap:6px;margin-bottom:18px;flex-wrap:wrap;
  background:var(--white);padding:6px;border-radius:10px;border:1px solid var(--gray-light);
}
.sub-tab{
  padding:8px 16px;background:transparent;border:none;border-radius:7px;
  font-family:'Outfit',sans-serif;font-size:12px;font-weight:600;
  text-transform:uppercase;letter-spacing:0.5px;color:var(--gray);
  cursor:pointer;transition:all 0.15s;
}
.sub-tab:hover{background:var(--gray-bg);color:var(--teal)}
.sub-tab.active{background:var(--teal);color:white}

/* === Standings table (FIXTURE > Posiciones) === */
.standings-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:14px}
.standings-card{background:var(--white);border-radius:12px;padding:14px;border:1px solid var(--gray-light)}
.group-title{
  font-family:'Outfit',sans-serif;font-weight:700;font-size:15px;color:var(--teal);
  text-transform:uppercase;letter-spacing:1.2px;margin-bottom:10px;
  padding-bottom:8px;border-bottom:2px solid var(--teal);
}
.standings-table{width:100%;border-collapse:collapse;font-size:12px}
.standings-table thead{background:var(--gray-bg)}
.standings-table th{
  padding:6px 4px;font-family:'Outfit',sans-serif;text-transform:uppercase;
  font-size:10px;letter-spacing:0.5px;font-weight:600;color:var(--gray);text-align:center;
}
.standings-table th:first-child{text-align:left;padding-left:8px}
.standings-table td{
  padding:7px 4px;text-align:center;border-bottom:1px solid var(--gray-light);
  font-family:'DM Mono',monospace;
}
.standings-table td:first-child{text-align:left;font-family:'Outfit',sans-serif;font-weight:500;padding-left:8px}
.standings-table td.pts{font-weight:700;color:var(--teal);font-size:14px}
.standings-table td.pos{color:var(--green);font-weight:600}
.standings-table td.neg{color:var(--red);font-weight:600}
.standings-table tr.classifies{background:rgba(46,125,50,0.05)}
.standings-table tr.classifies td:first-child::before{
  content:"●";color:var(--green);margin-right:6px;font-size:9px;
}

/* === Bracket (FIXTURE > Eliminatorias) === */
.bracket-section{margin-bottom:22px}
.bracket-fase-title{
  font-family:'Outfit',sans-serif;font-weight:700;font-size:14px;color:var(--teal);
  text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;
  padding-bottom:6px;border-bottom:2px solid var(--gray-light);
}
.bracket-matches{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px}
.bracket-match{
  background:var(--white);border:1px solid var(--gray-light);border-radius:10px;
  padding:10px;transition:box-shadow 0.15s;
}
.bracket-match:hover{box-shadow:var(--shadow-md)}
.bracket-match.jugado{background:#FAFAFA}
.bracket-teams{display:flex;flex-direction:column;gap:4px;margin-bottom:8px}
.bracket-team{
  display:flex;justify-content:space-between;align-items:center;
  padding:7px 10px;background:var(--gray-bg);border-radius:6px;font-size:13px;font-weight:500;
}
.bracket-team.winner{background:linear-gradient(90deg,#E8F5E9,#C8E6C9);font-weight:700;color:var(--green)}
.bracket-team .score{font-family:'DM Mono',monospace;font-weight:700;font-size:15px}
.bracket-meta{font-size:10px;color:var(--gray);text-align:center;font-family:'DM Mono',monospace}

/* === Botón pronos sociales en match cards === */
.social-btn{
  background:rgba(30,111,118,0.08);border:1px solid var(--teal);color:var(--teal);
  font-size:10px;padding:3px 8px;border-radius:10px;font-weight:600;
  cursor:pointer;letter-spacing:0.3px;text-transform:uppercase;
  font-family:'Outfit',sans-serif;display:inline-flex;align-items:center;gap:3px;
}
.social-btn:hover{background:var(--teal);color:white}

/* === Modal de pronos sociales === */
.predictions-list{margin-top:8px}
.pred-row{
  display:grid;grid-template-columns:auto 1fr auto auto;gap:12px;
  padding:10px 12px;align-items:center;border-bottom:1px solid var(--gray-light);background:white;
}
.pred-row:nth-child(even){background:var(--gray-bg)}
.pred-row.me{background:rgba(30,111,118,0.08);border-left:3px solid var(--teal);padding-left:9px}
.pred-row .avatar-sm{
  width:28px;height:28px;background:linear-gradient(135deg,var(--teal),var(--teal-light));
  color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-weight:700;font-size:10px;
}
.pred-row .info-cell{display:flex;flex-direction:column}
.pred-row .info-cell .nombre{font-weight:600;font-size:13px}
.pred-row .info-cell .area{font-size:10px;color:var(--gray)}
.pred-row .score-cell{
  font-family:'DM Mono',monospace;font-weight:600;font-size:15px;background:white;
  padding:4px 10px;border-radius:6px;border:1px solid var(--gray-light);min-width:48px;text-align:center;
}
.pred-row .score-cell.exact{background:var(--green-bg);border-color:var(--green);color:var(--green)}
.pred-row .score-cell.partial{background:var(--yellow-bg);border-color:var(--yellow);color:#92400E}
.pred-row .score-cell.miss{background:var(--gray-bg)}
.no-pred-list{margin-top:14px;padding:10px 12px;background:var(--gray-bg);border-radius:8px;font-size:12px;color:var(--gray)}
.no-pred-list strong{color:#444}

/* === Cargas cell en admin Partidos === */
.cargas-cell{
  font-family:'DM Mono',monospace;font-weight:500;cursor:pointer;color:var(--teal);
  text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;
}
.cargas-cell:hover{color:var(--teal-dark)}
.cargas-cell.full{color:var(--green)}
.cargas-cell.empty{color:var(--gray);text-decoration:none;cursor:default}

/* === Stats grid en Perfil === */
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px}
.stat-item{
  background:linear-gradient(135deg,var(--gray-bg),white);border:1px solid var(--gray-light);
  border-radius:12px;padding:16px;text-align:center;
}
.stat-item .stat-icon{font-size:24px;margin-bottom:6px}
.stat-item .stat-val{
  font-family:'Outfit',sans-serif;font-weight:700;font-size:24px;color:var(--teal);
  line-height:1.2;margin-bottom:2px;
}
.stat-item .stat-val.lucky{font-size:15px;color:var(--black)}
.stat-item .stat-lbl{
  font-size:11px;color:var(--gray);text-transform:uppercase;letter-spacing:0.5px;
  font-weight:600;margin-bottom:4px;
}
.stat-item .stat-desc{font-size:10px;color:var(--gray);line-height:1.4}

/* === Toast de celebración (confetti) === */
.toast.celebration{
  background:linear-gradient(135deg,#FFD700,#FF8F00);color:#1A1A1A;
  font-size:16px;padding:18px 30px;text-align:center;font-weight:700;
  box-shadow:0 20px 50px rgba(255,140,0,0.5);
}
.toast.celebration .sub{font-weight:500;font-size:12px;opacity:0.85;margin-top:4px}

/* === Team select (dropdown de equipos) === */
.team-select{
  padding:6px 10px;border:1px solid var(--gray-light);border-radius:18px;
  background:var(--gray-bg);font-size:12px;font-family:inherit;cursor:pointer;
  color:var(--gray);min-width:140px;
}
.team-select:focus{outline:none;border-color:var(--teal)}

/* === Mobile responsive ajustes === */
@media (max-width:700px){
  .mod-match{grid-template-columns:1fr;gap:8px;text-align:center}
  .mod-match-time{flex-direction:row;justify-content:center;gap:8px;align-items:center}
  .standings-grid{grid-template-columns:1fr}
  .standings-table{font-size:11px}
  .standings-table th,.standings-table td{padding:5px 2px}
}
```

---

## 11. Plan de implementación

### Si lo encarás vos manualmente (recomendado por partes)

**Paso 1: Setup base** (~10 min)
- Agregar `<script>` de canvas-confetti en el `<head>`
- Agregar variables CSS `--gold` y `--gold-dark`
- Agregar al state global: `allPredictions`, `prevMatches`, `firstMatchLoad`, `filters.grupo`, `filters.equipo`, `filters.fixtureSubTab`

**Paso 2: Confetti + match of day** (~30 min)
- Agregar funciones `triggerExactCelebration()` y `getMatchOfDay()`, `renderModMatch()`
- Modificar listener de `matchesRef.on("value")` para comparar prev vs new
- Modificar `renderPlayerDashboard()` para incluir match-of-day card
- Agregar CSS de match-of-day y toast.celebration

**Paso 3: Filtros nuevos** (~15 min)
- Modificar `renderPronosticos()` agregando filter bars de grupo y equipo
- Agregar CSS de `.team-select`

**Paso 4: Stats en perfil** (~30 min)
- Agregar función `calcUserStats()`
- Modificar `renderPerfil()` agregando bloque de stats para jugadores
- Agregar CSS de `.stats-grid` y `.stat-item`

**Paso 5: Admin cargas** (~30 min)
- Agregar modal `<div class="overlay" id="modalCargas">` en el HTML
- Agregar suscripción a `predictionsRef.on` para admin en `postLoginSetup()`
- Agregar funciones `getCargasCount()` y `openCargasModal()`
- Modificar `renderAdminPartidos()` agregando columna "Cargas"
- Agregar CSS de `.cargas-cell`

**Paso 6: Pronos sociales** (~45 min)
- Agregar modal `<div class="overlay" id="modalPreds">` en el HTML
- Agregar función `openMatchPredictionsModal()`
- Modificar `renderMatchCard()` agregando botón "Ver pronos" si cerrado/jugado
- Agregar CSS de `.social-btn` y `.predictions-list`

**Paso 7: FIXTURE** (~1.5h, el más grande)
- Agregar tab "fixture" a `renderNavTabs()` (ambos roles)
- Agregar caso `fixture: renderFixture` al router
- Agregar funciones: `renderFixture()`, `renderFixtureLista()`, `renderFixtureGrupos()`, `renderFixtureBracket()`, `renderFixtureMatchCard()`, `calcStandings()`, `setFixtureSubTab()`
- Agregar CSS de sub-tabs, standings, bracket

### Si querés que un asistente lo genere de una

Pasale este MD como contexto y pedile:
> "Tomá la base del PRODEMARK 2026 actual (v2) e implementá todos los cambios de la v3 descritos en este MD. Generá el `index.html` completo."

El MD tiene toda la info: estructura, snippets, CSS, decisiones de UX, lógica de cada feature. Es self-contained.

### Testing manual (después de implementar)

- [ ] Logueate como admin, andá a Partidos → ¿se ve la columna "Cargas: X/Y"?
- [ ] Click en cargas → modal con cargaron/no cargaron
- [ ] Andá a Fixture → 3 sub-tabs funcionan
- [ ] Fixture > Posiciones → tablas por grupo con resultados
- [ ] Fixture > Eliminatorias → bracket con winners destacados
- [ ] Como jugador, dashboard → card "Match del día" o "Próximo"
- [ ] Perfil del jugador → 3 stat cards (tasa, racha, lucky)
- [ ] En match cerrado → botón "Ver pronos" funciona
- [ ] Pronósticos → filtros de grupo y equipo
- [ ] **Test del confetti:** abrí dos ventanas. En una loggeate como jugador y cargá un pronóstico. En la otra, como admin, cargá el resultado exacto. En la ventana del jugador → debería disparar confetti + toast dorado en tiempo real.

---

## 📝 Notas finales

- El archivo `index.html` resultante va a quedar en ~3500-4000 líneas. Si lo encarás manualmente, conviene editar por bloques y testear incremental, no todo de una.
- La estructura modular del código actual (cada `render*` es una función separada) facilita agregar las nuevas vistas sin tocar las viejas.
- Las suscripciones globales de admin (`predictionsRef.on`) duplican tráfico de red. Para 14 jugadores está bien; si crece a 100, conviene cambiar a `once` + refresh manual.
- El confetti necesita que `prevMatches` se cargue ANTES de la primera suscripción para no disparar en el load inicial. Por eso el flag `firstMatchLoad` y la asignación inicial de `prevMatches` en `init()`.

🎯 **Listo para implementar.**
