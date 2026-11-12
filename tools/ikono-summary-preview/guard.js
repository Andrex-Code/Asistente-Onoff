(() => {
 if(window.__onoffCloseGuard)return;window.__onoffCloseGuard=true;
 const label='Resolver conversación sin mensaje',warning='Protección ONOFF: no uses «Resolver conversación sin mensaje». Utiliza «Resolver conversación» para registrar la tipificación.';
 function target(node){const b=node?.closest?.('button,[role="button"]');return b&&b.closest('[role="dialog"]')&&b.textContent.trim()===label?b:null;}
 function block(e){const b=target(e.target);if(!b)return;if(e.type.startsWith('key')&&!['Enter',' ','Spacebar'].includes(e.key))return;e.preventDefault();e.stopImmediatePropagation();protect();}
 for(const event of ['pointerdown','pointerup','touchstart','touchend','mousedown','mouseup','click','dblclick','keydown','keyup'])window.addEventListener(event,block,{capture:true,passive:false});
 function protect(){for(const d of document.querySelectorAll('[role="dialog"]'))for(const b of d.querySelectorAll('button,[role="button"]'))if(b.textContent.trim()===label){if(b.tagName==='BUTTON'&&!b.disabled)b.disabled=true;if(b.getAttribute('aria-disabled')!=='true')b.setAttribute('aria-disabled','true');if(b.title!==warning)b.title=warning;if(!d.querySelector('[data-onoff-close-warning]')){const p=document.createElement('p');p.dataset.onoffCloseWarning='';p.setAttribute('role','status');p.textContent=warning;p.style='padding:10px;border:1px solid #b87615;border-radius:6px;color:inherit';b.parentElement.before(p);}}}
 const start=()=>{protect();new MutationObserver(protect).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','aria-disabled']});};if(document.documentElement)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
})();
