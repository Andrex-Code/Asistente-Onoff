(() => {
 if(window.ONOFFMovable)return;
 window.ONOFFMovable=(host,handle)=>{
 if(!host||!handle||handle.dataset.onoffMovable)return;handle.dataset.onoffMovable='true';handle.style.cursor='move';handle.style.touchAction='none';handle.tabIndex=0;handle.title='Arrastra para mover. También puedes usar las flechas con el título seleccionado.';
 const place=(left,top)=>{const rect=host.getBoundingClientRect();host.style.left=Math.max(0,Math.min(left,innerWidth-rect.width))+'px';host.style.top=Math.max(0,Math.min(top,innerHeight-Math.min(rect.height,innerHeight)))+'px';host.style.right='auto';host.style.bottom='auto';};let drag;
 handle.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button,input,textarea,select,a'))return;const r=host.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};handle.setPointerCapture(e.pointerId);e.preventDefault();});
 handle.addEventListener('pointermove',e=>{if(drag?.id===e.pointerId)place(drag.left+e.clientX-drag.x,drag.top+e.clientY-drag.y);});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(event,()=>{drag=null;});
 handle.addEventListener('keydown',e=>{const delta={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]}[e.key];if(!delta)return;e.preventDefault();const r=host.getBoundingClientRect();place(r.left+delta[0],r.top+delta[1]);});
 window.addEventListener('resize',()=>{if(host.style.top){const r=host.getBoundingClientRect();place(r.left,r.top);}});
 };
})();
