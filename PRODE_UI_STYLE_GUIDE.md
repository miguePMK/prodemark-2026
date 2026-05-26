# UI / CSS Design System — PRODE Mundial 2026

## Objetivo visual

Quiero una interfaz moderna, premium y deportiva para un sistema PRODE del Mundial 2026.

La estética debe sentirse:
- tecnológica
- elegante
- oscura
- minimalista
- cinematográfica
- muy visual
- responsive
- modular

Inspiración:
- dashboards deportivos modernos
- FIFA / Champions League broadcast graphics
- glassmorphism oscuro
- interfaces gaming premium
- Apple TV sports aesthetic
- Vercel / Linear / Raycast polish

---

# Stack

Usar:
- HTML puro o React
- CSS puro o Tailwind
- NO Bootstrap
- NO estilos genéricos de admin panel
- evitar look enterprise aburrido

---

# Paleta de colores

## Base

```css
:root {
  --bg: #07111f;
  --panel: #0f1d31;
  --panel-2: #132742;

  --text: #eef4ff;
  --muted: #94a9c9;

  --accent: #2dd4bf;
  --gold: #fbbf24;
  --danger: #ef4444;

  --border: rgba(255,255,255,.08);
}
```

---

# Fondo global

El fondo NO debe ser plano.

Usar:
- radial gradients
- overlays suaves
- profundidad

Ejemplo conceptual:

```css
background:
  radial-gradient(circle at top left,
    rgba(45,212,191,.14),
    transparent 25%),

  radial-gradient(circle at bottom right,
    rgba(251,191,36,.12),
    transparent 30%),

  #07111f;
```

---

# Tipografía

Usar:
- Inter
- spacing prolijo
- pesos bien marcados

Jerarquía:
- títulos: 700–800
- subtítulos: 600
- body: 400–500

NO usar:
- fuentes deportivas caricaturescas
- condensed fonts
- tipografías arcade

---

# Cards

Las cards son el núcleo del diseño.

Características:
- bordes redondeados grandes
- sombras profundas
- fondo translúcido
- blur leve opcional
- hover elegante

Ejemplo:

```css
.card {
  background:
    linear-gradient(
      180deg,
      rgba(15,29,49,.92),
      rgba(10,17,30,.98)
    );

  border: 1px solid rgba(255,255,255,.08);

  border-radius: 24px;

  box-shadow:
    0 10px 30px rgba(0,0,0,.35);

  transition: .25s ease;
}
```

Hover:

```css
.card:hover {
  transform: translateY(-2px);
  border-color: rgba(45,212,191,.3);
}
```

---

# Espaciado

MUY importante.

La UI debe respirar.

Usar:
- padding grande
- gaps generosos
- separación clara entre secciones

Evitar:
- interfaces compactadas
- tablas apretadas
- widgets pegados

---

# Componentes principales

## 1. Header hero

Debe incluir:
- título gigante
- subtítulo
- countdown
- glow effects
- branding mundialista

Layout:
- flex horizontal desktop
- stacked mobile

---

## 2. Countdown

Estética:
- boxes individuales
- números grandes
- labels pequeñas uppercase

Ejemplo:

```css
.timer-box {
  border-radius: 16px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.05);
}
```

---

## 3. Tabla de grupos

NO usar tablas HTML tradicionales feas.

Quiero:
- look dashboard
- hover rows
- top 2 destacados
- colores suaves

Clasificados:

```css
color: var(--accent);
font-weight: 700;
```

---

## 4. Partidos

Cada partido debe verse como una card premium.

Contenido:
- banderas
- nombres
- resultado grande
- estadio
- fecha
- horario

Layout:
- equipos alineados
- score central enorme

---

## 5. Llaves eliminatorias

Diseño:
- horizontal scroll
- cards conectadas visualmente
- rounds separados
- winner highlight

---

# Responsive

Mobile first.

Breakpoints:
- 768px
- 1024px

En mobile:
- stack vertical
- cards full width
- scroll horizontal para brackets

---

# Animaciones

Usar pocas pero buenas.

Permitidas:
- fade in
- subtle hover
- glow hover
- smooth transitions

NO:
- bounce
- animations exageradas
- efectos arcade

---

# Sensación visual

La aplicación debe sentirse:
- premium
- rápida
- limpia
- moderna
- deportiva
- internacional

NO debe parecer:
- sistema administrativo
- template bootstrap
- excel convertido
- dashboard corporativo

---

# Importante

Priorizar:
1. estética
2. claridad visual
3. spacing
4. jerarquía
5. experiencia mobile

El diseño tiene que verse:
“broadcast sports premium UI”.

No “CRUD administrativo”.
