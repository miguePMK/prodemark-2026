# PRODEMARK 2026 ⚽

Prode interno del Mundial 2026 para Petromark SRL. Vanilla HTML + Firebase Realtime Database, sin frameworks ni dependencias de build.

## 🚀 Despliegue

1. Creá un repo nuevo en GitHub llamado `prodemark-2026`
2. Subí `index.html` a la raíz del repo (drag & drop en la web sirve)
3. Settings → Pages → Source: `main` branch, folder `/ (root)` → Save
4. Esperá ~1 min y abrí: `https://<tu-usuario>.github.io/prodemark-2026/`

## 🎬 Primer uso

1. La primera vez que entrás, Firebase está vacío → aparece el **wizard de bootstrap**
2. Cargás tu nombre, área y PIN de 4 dígitos → se crea el primer admin
3. A partir de ahí, cada vez que entres ya hay login normal (dropdown + PIN)

## 👥 Como admin

### Crear usuarios
- Pestaña **Usuarios** → "Nuevo Usuario"
- Cargás nombre + área + rol + PIN inicial
- Le pasás el PIN al participante por privado
- El participante puede cambiarlo después desde su Perfil

### Cargar partidos
Dos opciones:

**Opción A — Manual:** pestaña **Partidos** → "Nuevo" → cargás fase, grupo, fecha, hora, equipos, sede.

**Opción B — CSV (recomendado):** pestaña **Partidos** → "Importar CSV". Usá `partidos_mundial_2026.csv` que viene con los partidos confirmados del primer finde. El resto los cargás a mano o cuando salga el fixture definitivo de FIFA. El deadline (00:00 del día del partido) se calcula solo a partir de la fecha.

**Formato CSV:**
```
fase,grupo,fecha,hora,local,visitante,sede
grupos,A,2026-06-11,16:00,🇲🇽 México,🇿🇦 Sudáfrica,"Estadio Azteca, CDMX"
```
- Hora siempre en formato Argentina (UTC-3)
- Los emojis de bandera en el nombre del equipo son opcionales pero recomendados
- `fase`: `grupos`, `16avos`, `octavos`, `cuartos`, `semi`, `tercer`, `final`

### Cargar resultados
- Pestaña **Partidos** → ícono 🎯 del partido a actualizar
- Cargás el marcador final → "Guardar Resultado"
- Los puntos de todos los pronósticos se calculan automáticamente
- El leaderboard se actualiza en vivo para todos los usuarios conectados

## 🎯 Sistema de puntaje

- **Marcador exacto**: 5 pts
- **Acertás ganador o empate** (sin marcador exacto): 2 pts
- **No acertás**: 0 pts

## ⏰ Cierre de pronósticos

Cada partido se cierra automáticamente a las **00:00 (medianoche)** del día del partido, hora Argentina. Para los partidos del 11/06, podés cargar hasta el 10/06 a las 23:59.

## 🗂 Estructura de datos en Firebase

```
prodemark-2026 (DB)
├── users/{userId}/
│   ├── nombre, area, role, pin_hash, creado, puntos_total
├── matches/{matchId}/
│   ├── fase, grupo, fecha_iso, deadline_iso
│   ├── local, visitante, sede
│   └── jugado, resultado_local, resultado_visitante
└── predictions/{userId}/{matchId}/
    ├── local, visitante, timestamp
    └── puntos (se llena al cargar el resultado)
```

## 🔐 Seguridad (importante leer antes del 11/06)

**Actualmente las reglas de Firebase están abiertas** (lectura/escritura libre desde cualquier cliente). Para la app entre 15 personas conocidas está OK, pero antes de abrirla a más gente, andá a:

`Firebase Console → Realtime Database → Reglas`

Y pegá:

```json
{
  "rules": {
    "users": {
      ".read": true,
      "$uid": {
        ".write": true
      }
    },
    "matches": {
      ".read": true,
      ".write": true
    },
    "predictions": {
      ".read": true,
      "$uid": {
        ".write": true
      }
    }
  }
}
```

Esto no es Fort Knox (sin Firebase Auth no se puede validar de verdad quién es quién), pero al menos previene escrituras catastróficas.

## 🛠 Operaciones útiles

### Resetear todo y empezar de cero
Firebase Console → Realtime Database → eliminar nodos `users`, `matches`, `predictions`. La próxima vez que abras la app, vuelve a aparecer el wizard de bootstrap.

### Resetear el PIN de alguien
Pestaña **Usuarios** → ícono 🔑 al lado del usuario → ingresás un PIN nuevo.

### Cambiar el resultado de un partido ya cargado
Pestaña **Partidos** → ícono 📝 (en partidos jugados) → editás o borrás el resultado. Los puntos se recalculan solos.

### Borrar un partido
⚠️ Borrar un partido también elimina todos los pronósticos asociados y recalcula los puntos. No tiene undo.

## 🐛 Troubleshooting

**No carga la app, pantalla en blanco**
→ Abrí DevTools (F12) y mirá la consola. Si dice error de Firebase, verificá que la `firebaseConfig` en el HTML coincide con tu proyecto.

**Cambié el SALT y nadie puede loguear**
→ El SALT (`PMK_PRODEMARK_2026_v1_salt`) está hardcodeado y hashea los PINs. Si lo cambiás, todos los PINs guardados quedan inválidos. Si pasó: borrá el nodo `users` desde Firebase Console y volvé a crear todos. O reseteá el SALT al original.

**Un usuario dice que cargó un pronóstico y desapareció**
→ Probablemente el partido se cerró (pasó la medianoche). Una vez cerrado el partido, los pronósticos quedan congelados.

**El ranking no se actualiza**
→ Reload con Ctrl+F5. Si persiste, fijate en DevTools si hay errores de permisos de Firebase (puede ser que las reglas hayan cambiado).

## 📝 Versión

PRODEMARK 2026 v1.0 — Petromark SRL — Mayo 2026
