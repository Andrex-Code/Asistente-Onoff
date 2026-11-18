const form=document.querySelector('#bitrixActivationForm');
const codeInput=document.querySelector('#bitrixActivationCode');
const activationStatus=document.querySelector('#bitrixActivationStatus');
const activationButton=form.querySelector('button');
const tokenKey='onoffBitrixReadToken';
const pendingKey='onoffBitrixActivationPending';

chrome.storage.local.get(tokenKey).then(saved=>{
  if(saved[tokenKey]) activationStatus.textContent='Bitrix está activado en esta instalación.';
}).catch(()=>{});

form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(activationButton.disabled) return;
  const code=codeInput.value.trim();
  if(!/^[\w-]{43}$/.test(code)){
    activationStatus.textContent='Pega el código completo que te entregaron.';
    return;
  }
  activationButton.disabled=true;
  activationStatus.textContent='Activando consulta…';
  try{
    const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code))),
      byte=>byte.toString(16).padStart(2,'0')).join('');
    const saved=(await chrome.storage.local.get(pendingKey))[pendingKey];
    const secret=saved?.fingerprint===fingerprint?saved.secret:
      btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
        .replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
    await chrome.storage.local.set({[pendingKey]:{fingerprint,secret}});
    const response=await fetch('https://asistente-onoff.vercel.app/api/bitrix/activate',{
      method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',redirect:'error',
      body:JSON.stringify({code,secret}),signal:AbortSignal.timeout(15000)
    });
    const result=await response.json().catch(()=>null);
    if(!response.ok || !result?.ok || result.token!=='onoff1.'+fingerprint+'.'+secret){
      throw Error(result?.error||'No se pudo activar. Reintenta con el mismo código.');
    }
    await chrome.storage.local.set({[tokenKey]:result.token});
    await chrome.storage.local.remove(pendingKey);
    codeInput.value='';
    activationStatus.textContent='Bitrix activado. Ya puedes buscar por TC y radicado.';
  }catch(error){
    activationStatus.textContent=error.name==='TimeoutError'?'La activación tardó demasiado. Reintenta con el mismo código.':error.message;
  }finally{
    activationButton.disabled=false;
  }
});
