# PRODEMARK 2026

Prode interno del Mundial 2026 para Petromark SRL.

## 🚀 Deploy en GitHub Pages

1. Creá un repo (público o privado, ej. `prodemark-2026`)
2. Subí `index.html` a la raíz
3. **Settings → Pages → Source:** `main` / `(root)` → Save
4. En ~1 min: `https://TU-USUARIO.github.io/prodemark-2026/`

## 🔧 Primer uso

1. Abrís la URL por primera vez → **Wizard de bootstrap** (no hay usuarios todavía)
2. Cargás tu nombre, área y PIN de 4 dígitos → **te creás como admin**
3. Te logueás automáticamente
4. Desde **Usuarios** das de alta a los compañeros (con PIN inicial para cada uno)
5. Desde **Partidos** importás el CSV plantilla o cargás partidos a mano

## 🎮 Reglas del juego

### Puntaje por partido

| Resultado | Puntos |
|-----------|--------|
| 🎯 Marcador exacto (5-1 → 5-1) | **5 pts** |
| 🔍 Acertás ganador o empate (3-1 → 2-0) | **2 pts** |
| ❌ Fallás ganador y marcador | **0 pts** |

### 🎯 Bonus Mini-Prode

Pronóstico de campeón y finalistas, cargado antes del torneo:

| Acierto | Puntos |
|---------|--------|
| 🏆 Campeón correcto | **20 pts** |
| 🥈 Cada finalista correcto (orden no importa) | **10 pts c/u** |
| **Máximo total** | **40 pts** |

El admin habilita/cierra la carga, y al finalizar el Mundial carga los resultados reales para calcular puntos automáticamente.

### Cierre de pronósticos

- **Automático:** medianoche (00:00) del día del partido.
- **Manual:** el admin puede forzar habilitar/deshabilitar cualquier partido individualmente desde el panel de Partidos.
  - "Forzar abierto" → reabre el partido (sólo válido si todavía no empezó).
  - "Forzar cerrado" → cierra antes del deadline automático.
  - "Auto" → vuelve al deadline normal.

## 👨‍💼 Guía para el admin

### Usuarios
- ➕ **Nuevo Usuario:** cargás nombre, área, rol (Jugador/Admin) y PIN inicial.
- ✏️ **Editar:** podés cambiar nombre, área, rol (no el PIN).
- 🔑 **Resetear PIN:** si alguien lo olvida.
- 🗑 **Eliminar:** borra usuario, sus pronósticos y su bonus.

**Los admins no compiten:** no aparecen en el ranking ni suman puntos.

### Partidos
- ➕ **Nuevo Partido:** cargás fase, grupo, fecha, hora (hora Argentina) y equipos.
- ⬆ **Importar CSV:** subís el archivo `partidos_mundial_2026.csv` con la plantilla.
- ⬇ **Exportar CSV:** backup de los partidos cargados.
- **Estado manual:** desde la tabla, columna "Manual", podés overridear el deadline automático.
- 🎯 **Cargar resultado:** click en el ícono, marcás el resultado final. Se recalculan automáticamente los puntos de todos los pronósticos cargados para ese partido.
- 📝 **Editar resultado:** mismo botón, podés modificarlo si te equivocaste.

### Bonus Mini-Prode
- Toggle **Habilitar/Deshabilitar** la carga de bonus (afecta a todos los jugadores).
- Al finalizar la final, cargás el **campeón real** y los **2 finalistas reales** → al guardar, se calculan automáticamente los puntos del bonus para todos y se suman al puntaje total.
- 🗑 **Borrar resultados** si te equivocaste: vuelve todo a 0, podés recargar.

## 🗂 Estructura de datos en Firebase RTDB

```
prodemark-2026/
├── users/{userId}/
│   ├── nombre, area, role ("admin"|"user"), pin_hash, creado, puntos_total
├── matches/{matchId}/
│   ├── fase, grupo, fecha_iso, deadline_iso, local, visitante
│   ├── manual_status (null|"enabled"|"disabled")
│   ├── jugado, resultado_local, resultado_visitante
├── predictions/{userId}/{matchId}/
│   ├── local, visitante, timestamp, puntos
├── special_config/
│   ├── enabled, campeon_real, finalista_real_1, finalista_real_2
└── special_predictions/{userId}/
    ├── campeon, finalista1, finalista2, timestamp, puntos
```

## 🔐 Reglas de seguridad de Firebase (recomendadas para producción)

Por ahora la base está abierta (modo desarrollo). Antes de poner en producción, cerrá las reglas. Sugerencia mínima:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

⚠️ **Esto deja la base abierta a cualquiera con el `databaseURL`.** Es OK para un prode interno entre conocidos. Para mayor seguridad necesitarías Firebase Auth (ahora pago) o reglas custom con tokens, lo cual escapa al scope de este proyecto.

Recomendación práctica: mantener la app accesible solo internamente (link compartido por WhatsApp del grupo de Petromark), no publicar el link de GitHub Pages en internet abierta.

## 🛠 Troubleshooting

| Síntoma | Solución |
|---------|----------|
| "Error de conexión con Firebase" | Verificá que `firebaseConfig` en `index.html` esté bien, que las reglas permitan lectura/escritura, y que no haya bloqueo de adblocker. |
| El usuario no puede entrar | Reseteá su PIN desde Usuarios. |
| Puntos no se recalculan | Editá y guardá nuevamente el resultado del partido (fuerza recálculo). |
| Bonus de alguien no se calculó | Borrá los resultados reales del bonus desde Admin → Bonus, y guardalos de nuevo. |
| Olvidaste tu PIN admin | Acceso directo a Firebase Console → eliminar tu usuario en `/users/` → recargar la web → wizard de bootstrap aparece de nuevo. |

## 📊 Datos del Mundial 2026

- **Fechas:** 11 de junio al 19 de julio de 2026
- **Sedes:** USA, Canadá y México (16 ciudades, 3 países)
- **Equipos:** 48 selecciones
- **Partidos totales:** 104
- **Formato:** 12 grupos de 4 → 16avos → octavos → cuartos → semis → final

## 📝 Licencia / Crédito

Proyecto interno de Petromark SRL. Hecho para uso del grupo, no comercial.
