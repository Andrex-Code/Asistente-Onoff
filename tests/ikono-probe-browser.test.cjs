const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
test('Chromium fixture: 20 cancellations, synchronous capture, panel stop and no network', async () => {
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage();let requests=0;
    await page.route('**/*',route=>{requests++;return route.fulfill({contentType:'text/html',body:'<!doctype html><html><body><button aria-label="Resolver chat">Abrir formulario ficticio</button></body></html>'});});
    await page.goto('https://onoff.a.ikono.im/'); // All traffic fulfilled locally; never reaches iKono.
    for(const file of ['src/ikono-classification.cjs','src/ikono-close-probe.cjs']) await page.addScriptTag({path:path.resolve(__dirname,'..',file)});
    await page.evaluate(()=>{
      window.events=[];
      window.stop=ONOFFIkonoCloseProbe.installProbe(window,{enabled:true,readClassification:ONOFFIkonoClassification.readClassification,onEvent:e=>events.push(e)});
      window.openFixture=()=>{
        const dialog=document.createElement('div');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-label','Resolver conversación');
        dialog.innerHTML='<div><label>Tipificación</label><div class="mx_DropdownTypification"><div class="select__single-value">ASESORIA</div><input role="combobox" value="PRIVATE SEARCH"></div></div><label>Detalle de la tipificación</label><div class="mx_DropdownTypification"><div class="select__single-value">CONTACTO COMERCIAL</div><input role="combobox"></div><textarea>PRIVATE OBSERVATION</textarea><button>Cancelar</button><button>Resolver conversación</button>';
        for(const button of dialog.querySelectorAll('button')) button.onclick=()=>dialog.remove();
        document.body.append(dialog);
      };
      document.querySelector('button').onclick=window.openFixture;
    });
    for(let i=0;i<20;i++) {
      await page.getByRole('button',{name:'Resolver chat',exact:true}).click();
      await page.waitForFunction(expected => events.filter(e=>e.type==='dialog-ready').length === expected, i+1);
      await page.getByRole('button',{name:'Cancelar',exact:true}).click();
    }
    const counts=await page.evaluate(()=>events.reduce((out,e)=>(out[e.type]=(out[e.type]||0)+1,out),{}));
    assert.equal(counts['dialog-opened'],20);assert.equal(counts['cancel-requested'],20);assert.equal(counts['dialog-disappeared'],20);
    assert.equal(counts['dialog-ready'],20);
    await page.getByRole('button',{name:'Resolver chat',exact:true}).click();
    await page.evaluate(()=>{
      const dialog=document.querySelector('[role="dialog"]');
      dialog.querySelector('.select__single-value').textContent='CARTERA';
      dialog.querySelectorAll('.select__single-value')[1].remove();
      // Same task as mutation, before MutationObserver callback; native handler removes dialog.
      dialog.querySelectorAll('button')[1].click();
    });
    const last=await page.evaluate(()=>events.filter(e=>e.type==='classification-observed').at(-1));
    assert.deepEqual(last.classification,{status:'incomplete',category:'CARTERA',detail:''});
    assert.equal(await page.evaluate(()=>events.filter(e=>e.type==='resolution-requested').length),1);
    assert.ok(!(await page.evaluate(()=>JSON.stringify(events))).includes('PRIVATE'));
    await page.evaluate(()=>stop());
    await page.addScriptTag({path:path.resolve(__dirname,'../tools/ikono-probe/panel.js')});
    await page.getByRole('button',{name:'Iniciar prueba',exact:true}).click();
    await page.getByRole('button',{name:'Resolver chat',exact:true}).click();
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();
    assert.match(await page.getByRole('status').innerText(),/Cancelación detectada/);
    await page.screenshot({path:path.resolve(__dirname,'../dist/ikono-probe-fixture.png')});
    await page.getByRole('button',{name:'Detener y borrar',exact:true}).click();
    assert.equal(await page.getByRole('status').innerText(),'Detenido. Registros borrados.');
    await page.getByRole('button',{name:'Cerrar panel',exact:true}).click();
    assert.equal(await page.locator('#onoff-ikono-passive-test').count(),0);
    assert.equal(requests,1);
  } finally {await browser.close();}
});
test('readiness waits for delayed fields and stable Cancel geometry; stop cancels pending work', async () => {
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage();
    await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));
    await page.goto('https://onoff.a.ikono.im/');
    await page.addScriptTag({path:path.resolve(__dirname,'../src/ikono-close-probe.cjs')});
    await page.evaluate(()=>{
      window.events=[];window.stop=ONOFFIkonoCloseProbe.installProbe(window,{enabled:true,onEvent:e=>events.push(e)});
      const modal=document.createElement('div');modal.setAttribute('role','dialog');modal.setAttribute('aria-label','Resolver conversación');
      modal.innerHTML='<button>Cancelar</button>';document.body.append(modal);
    });
    // Deliberate fixture delay: simulate iKono rendering fields after the shell.
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>events.some(e=>e.type==='dialog-ready')),false);
    await page.evaluate(()=>{
      const modal=document.querySelector('[role="dialog"]');
      const input=document.createElement('input');input.setAttribute('role','combobox');modal.append(input);
      let n=0;const button=modal.querySelector('button');
      const animate=()=>{button.style.transform=`translateX(${++n*10}px)`;if(n<8)requestAnimationFrame(animate);};requestAnimationFrame(animate);
    });
    await page.waitForFunction(()=>events.some(e=>e.type==='dialog-ready'));
    assert.equal(await page.evaluate(()=>document.querySelector('button').getBoundingClientRect().x),88);
    await page.evaluate(()=>{stop();document.querySelector('[role="dialog"]').remove();});
    const count=await page.evaluate(()=>events.length);await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>events.length),count);
  } finally {await browser.close();}
});
