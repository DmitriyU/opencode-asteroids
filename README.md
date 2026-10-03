# Asteroids

Clon del clásico arcade **Asteroids** implementado en canvas HTML5 puro, sin dependencias ni bundler.

## Descripción

Nave espacial en un campo de asteroides con envolvimiento de bordes (el espacio es toroidal). Destruye asteroides para sumar puntos: los grandes se parten en medianos, los medianos en pequeños. Incluye power-ups especiales y tipos de asteroides únicos como la estrella fugaz.

## Tecnologías

- **HTML5 Canvas** — renderizado 2D
- **JavaScript (ES6+)** — lógica del juego en un solo archivo `game.js`
- Sin frameworks, sin bundler, sin dependencias

## Cómo correr

Abre `index.html` directamente en el navegador (doble clic), o usa un servidor local:

```bash
npx serve .
```

Luego visita `http://localhost:3000`.

## Controles

| Tecla     | Acción     |
| --------- | ---------- |
| `←` `→`   | Rotar nave |
| `↑`       | Propulsar  |
| `Espacio` | Disparar   |
| `C`       | Cambiar skin |

## Skins

La nave tiene 5 apariencias configurables, todas disponibles desde el principio.
`C` pasa a la siguiente (también funciona con la nave muerta o en `GAME OVER`) y el
nombre aparece un instante en la parte inferior. La elección se guarda en
`localStorage`, así que se conserva al recargar.

| Skin       | Color   | Silueta                     |
| ---------- | ------- | --------------------------- |
| `CLÁSICA`  | Blanco  | Triángulo con muesca trasera |
| `DELTA`    | Cian    | Dardo con alas barridas     |
| `MANTA`    | Ámbar   | Rayón de alas anchas y cola |
| `CRUZ`     | Verde   | Casco en forma de cruz      |
| `DIAMANTE` | Violeta | Rombo facetado              |

La skin también cambia los iconos de vida del HUD y el color de la llama del
propulsor.

## Puntuación

| Asteroide    | Puntos |
| ------------ | ------ |
| Grande       | 20     |
| Mediano      | 50     |
| Pequeño      | 100    |
| Estrella fugaz | 300  |

## Características

- 3 vidas con invencibilidad temporal al reaparecer (parpadeo)
- Asteroides se parten en fragmentos más pequeños al ser destruidos
- Partículas de explosión al destruir asteroides
- Estrella fugaz: más rápida que el resto, no se fragmenta y desaparece a los 7 segundos (barra de vida en la esquina superior izquierda)
- Power-up de velocidad x2 con imán de atracción
- 5 skins para la nave, con cambio en caliente y persistencia entre recargas
