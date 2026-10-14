(() => {
  'use strict';
  // A local vector model: pearl shells, glass reflections, articulated hands and soft lights.
  // Only transforms/opacity animate; no WebGL, network requests or permanent render loop.
  const markup = `<span class="onoff-robot-fallback" aria-hidden="true">ONOFF</span><svg class="onoff-robot" viewBox="0 0 180 220" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="on-shell" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".36" stop-color="#f8f8fa"/><stop offset=".72" stop-color="#e0e4e5"/><stop offset="1" stop-color="#9ca9ac"/></linearGradient>
    <radialGradient id="on-pearl" cx=".32" cy=".2" r=".85"><stop stop-color="#fff"/><stop offset=".52" stop-color="#f0f1f4"/><stop offset=".84" stop-color="#cdd4d6"/><stop offset="1" stop-color="#8e9b9d"/></radialGradient>
    <linearGradient id="on-glass" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#41494d"/><stop offset=".3" stop-color="#10161b"/><stop offset=".65" stop-color="#060b0e"/><stop offset="1" stop-color="#252e34"/></linearGradient>
    <linearGradient id="on-joint"><stop stop-color="#091215"/><stop offset=".4" stop-color="#46575a"/><stop offset="1" stop-color="#080e12"/></linearGradient>
    <linearGradient id="on-green"><stop stop-color="#b6ffce"/><stop offset=".45" stop-color="#55ed92"/><stop offset="1" stop-color="#1b994f"/></linearGradient>
    <linearGradient id="on-reflection" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".52"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <filter id="on-glow" x="-60%" y="-100%" width="220%" height="300%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="on-shadow"><feGaussianBlur stdDeviation="4"/></filter>
  </defs>
  <ellipse class="onoff-robot-shadow" cx="90" cy="203" rx="44" ry="6" fill="#17372c" opacity=".22" filter="url(#on-shadow)"/>
  <ellipse class="onoff-robot-aura" cx="90" cy="198" rx="39" ry="9" fill="#56ed94" opacity=".16" filter="url(#on-shadow)"/>
  <g class="onoff-robot-float">
    <g class="onoff-robot-left-arm">
      <ellipse cx="48" cy="140" rx="10" ry="13" fill="url(#on-joint)" stroke="#071112" stroke-width="2"/>
      <ellipse cx="47" cy="140" rx="8" ry="11" fill="none" stroke="#5cec95" stroke-width="1.5"/>
      <path d="M42 143c-9 1-16 11-14 22 2 9 7 14 14 10 9-5 14-24 0-32Z" fill="url(#on-shell)" stroke="#a5b2b3" stroke-width="1"/>
      <path d="M34 163c-8 1-9 8-5 13l5 5c4 2 8-1 8-5l1-7-4-5Z" fill="url(#on-joint)"/>
      <path d="m31 169 3 5m1-7 3 5" fill="none" stroke="#657272" stroke-width="1.5" stroke-linecap="round"/>
    </g>
    <g class="onoff-robot-right-arm">
      <ellipse cx="132" cy="140" rx="10" ry="13" fill="url(#on-joint)" stroke="#071112" stroke-width="2"/>
      <ellipse cx="133" cy="140" rx="8" ry="11" fill="none" stroke="#5cec95" stroke-width="1.5"/>
      <path d="M138 143c9 1 16 11 14 22-2 9-7 14-14 10-9-5-14-24 0-32Z" fill="url(#on-shell)" stroke="#a5b2b3" stroke-width="1"/>
      <path d="M146 163c8 1 9 8 5 13l-5 5c-4 2-8-1-8-5l-1-7 4-5Z" fill="url(#on-joint)"/>
      <path d="m149 169-3 5m-1-7-3 5" fill="none" stroke="#657272" stroke-width="1.5" stroke-linecap="round"/>
    </g>
    <ellipse cx="90" cy="121" rx="20" ry="8" fill="url(#on-joint)"/><path d="M75 124q15 6 30 0" stroke="#59eb97" stroke-width="1.4" fill="none"/>
    <path d="M64 130c9-8 43-8 52 0 9 9 9 39 3 50-5 10-15 15-29 15s-24-5-29-15c-6-11-6-41 3-50Z" fill="url(#on-pearl)" stroke="#afbbbd" stroke-width="1.2"/>
    <path d="M69 134q21-10 42 0" stroke="#fff" stroke-width="2.5" fill="none" opacity=".95"/>
    <path d="M70 185q20 11 40 0l-4 10q-16 6-32 0Z" fill="url(#on-joint)"/>
    <path d="M78 193q12 5 24 0" stroke="#52ed95" stroke-width="2" fill="none" filter="url(#on-glow)"/>
    <g class="onoff-robot-switch"><rect x="73" y="147" width="34" height="20" rx="10" fill="#0d1918" stroke="#85938e"/><rect x="76" y="150" width="28" height="14" rx="7" fill="url(#on-green)"/><circle cx="96" cy="157" r="6" fill="url(#on-joint)" stroke="#80d39f" stroke-width="1"/></g>
    <g class="onoff-robot-head">
      <ellipse cx="29" cy="76" rx="12" ry="23" fill="url(#on-joint)"/><ellipse cx="28" cy="76" rx="8" ry="20" fill="none" stroke="#5cef9a" stroke-width="2.5" filter="url(#on-glow)"/>
      <ellipse cx="151" cy="76" rx="12" ry="23" fill="url(#on-joint)"/><ellipse cx="152" cy="76" rx="8" ry="20" fill="none" stroke="#5cef9a" stroke-width="2.5" filter="url(#on-glow)"/>
      <path d="M31 42C42 17 67 12 90 12s48 5 59 30c13 28 7 57-9 70-10 9-32 15-50 15s-40-6-50-15C24 99 18 70 31 42Z" fill="url(#on-pearl)" stroke="#b4bec1" stroke-width="1.5"/>
      <path d="M33 43C47 18 72 17 91 18" stroke="#fff" stroke-width="4" fill="none" opacity=".92"/>
      <path d="M43 44c12-12 78-12 93 2 13 14 15 44 2 56-14 14-82 13-97-1-12-12-12-43 2-57Z" fill="url(#on-glass)" stroke="#060b0d" stroke-width="2.5"/>
      <path d="M45 48c7-8 13-10 26-10l-5 23-20 8Z" fill="url(#on-reflection)"/>
      <path d="M119 42c10 2 16 7 20 17l-1 17-17-3Z" fill="url(#on-reflection)" opacity=".35"/>
      <g class="onoff-robot-gaze"><g class="onoff-robot-blink" fill="none" stroke="#82ffac" stroke-width="7" stroke-linecap="round" filter="url(#on-glow)"><path class="onoff-robot-happy-eyes" d="M54 80q10-19 20 0m32 0q10-19 20 0"/><g class="onoff-robot-open-eyes" stroke-width="3.8"><circle cx="64" cy="76" r="9"/><circle cx="116" cy="76" r="9"/></g><path class="onoff-robot-error-eyes" d="M54 75q10 16 20 0m32 0q10 16 20 0" stroke="#ff938b"/></g></g>
      <ellipse cx="90" cy="13" rx="16" ry="4" fill="url(#on-joint)"/>
      <path d="M40 107q50 18 100 0" fill="none" stroke="#fff" opacity=".58" stroke-width="1.5"/>
    </g>
    <g class="onoff-robot-ring" fill="none" filter="url(#on-glow)"><ellipse cx="90" cy="201" rx="32" ry="6" stroke="#67efa0" stroke-width="3"/><ellipse cx="90" cy="201" rx="29" ry="4.5" stroke="#ddffe7" stroke-width="1.2"/></g>
    <g class="onoff-robot-sparks" fill="#69efa1"><path d="m148 28 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"/><circle cx="164" cy="56" r="2.5"/></g>
  </g></svg><span class="onoff-robot-status" role="status" aria-live="polite"></span>`;
  let controller;
  function mount(button, enabled = true) {
    controller?.destroy();
    button.innerHTML = markup;
    const abort = new AbortController(), signal = abort.signal;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let motion = enabled, activity = 'idle', interaction = '', timer, settle, frame, point;
    const labels = { idle:'',hover:'Hola, ¿qué hacemos?',greet:'Aquí para ayudarte',processing:'Procesando…',search:'Buscando…',success:'Todo listo',error:'Revisa el resultado',notify:'Tu espacio de trabajo',dragging:'Vamos contigo' };
    function reflect() { const bounds=button.getBoundingClientRect();button.dataset.tipAlign=bounds.right>innerWidth-50?'right':bounds.left<50?'left':'center';const state = interaction || activity; button.dataset.state = state; button.dataset.paused = String(document.hidden); button.classList.toggle('is-motion-disabled', !motion || reduced.matches); button.querySelector('.onoff-robot-status').textContent = labels[state] || ''; }
    function transient(state, duration) { clearTimeout(timer); interaction = state; reflect(); if (duration) timer = setTimeout(() => {interaction = '';reflect();}, duration); }
    function state(next, duration=0) {
      if (['hover','greet','dragging','notify'].includes(next)) { transient(next,duration); return; }
      if (next === 'idle' && interaction === 'dragging') { interaction='';reflect();return; }
      clearTimeout(settle); activity = next; interaction = ''; reflect();
      if(duration) settle = setTimeout(() => {activity='idle';reflect();},duration);
    }
    button.addEventListener('pointerenter', () => {if(activity==='idle') transient('hover');}, {signal});
    button.addEventListener('pointerleave', () => {if(interaction==='hover') {interaction='';reflect();}}, {signal});
    document.addEventListener('pointermove', event => {
      if(!motion || reduced.matches || document.hidden) return;
      point = {x:event.clientX,y:event.clientY};
      if(frame) return;
      frame=requestAnimationFrame(() => {frame=0;const r=button.getBoundingClientRect();const dx=point.x-r.left-r.width/2,dy=point.y-r.top-r.height/2;button.style.setProperty('--on-gaze-x',Math.max(-3.5,Math.min(3.5,dx/70))+'px');button.style.setProperty('--on-gaze-y',Math.max(-2,Math.min(2,dy/90))+'px');});
    }, {signal,passive:true});
    document.addEventListener('visibilitychange',reflect,{signal});
    window.addEventListener('resize',reflect,{signal,passive:true});
    reduced.addEventListener('change',reflect,{signal});
    reflect();
    controller={state, motion(value){motion=value;button.style.setProperty('--on-gaze-x','0px');button.style.setProperty('--on-gaze-y','0px');reflect();},destroy(){abort.abort();clearTimeout(timer);clearTimeout(settle);cancelAnimationFrame(frame);}};
  }
  globalThis.ONOFFMascot = {markup,mount,setState(state,duration){controller?.state(state,duration);},setMotion(enabled){controller?.motion(enabled);},destroy(){controller?.destroy();controller=null;}};
})();
