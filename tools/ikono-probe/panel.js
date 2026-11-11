(() => {
  const id = 'onoff-ikono-passive-test';
  if (document.getElementById(id)) return;
  const host = document.createElement('div'); host.id = id;
  const shadow = host.attachShadow({mode:'open'});
  shadow.innerHTML = '<style>:host{position:fixed;right:16px;bottom:16px;z-index:2147483647;font:13px system-ui}section{width:300px;padding:16px;border:1px solid #64748b;border-radius:12px;background:#fff;color:#172554;box-shadow:0 4px 24px #0003}button{padding:7px;margin:4px 4px 0 0}pre{white-space:pre-wrap;max-height:180px;overflow:auto;font:12px system-ui}h2{font-size:16px;margin:0 0 8px}</style><section aria-label="Prueba pasiva ONOFF"><h2>Prueba pasiva iKono</h2><p>Sin IA, envíos ni tareas Bitrix. No pulses los botones de resolución.</p><button id="start">Iniciar prueba</button><button id="stop" disabled>Detener y borrar</button><button id="close">Cerrar panel</button><pre role="status">Detenido. Solo usar en conversación de prueba.</pre></section>';
  document.body.append(host);
  let stop = null; let rows = [];
  const status = shadow.querySelector('pre');
  function clear() { stop?.(); stop = null; rows = []; status.textContent = 'Detenido. Registros borrados.'; shadow.querySelector('#start').disabled = false; shadow.querySelector('#stop').disabled = true; }
  shadow.querySelector('#start').onclick = () => {
    shadow.querySelector('#start').disabled = true; shadow.querySelector('#stop').disabled = false;
    status.textContent = 'Activo. Abre Resolver chat y termina con Cancelar.';
    stop = ONOFFIkonoCloseProbe.installProbe(window, {enabled:true,readClassification:ONOFFIkonoClassification.readClassification,onEvent:event => {
      const names = {'open-requested':'Apertura solicitada','dialog-opened':'Formulario detectado · esperando carga','dialog-ready':'Formulario listo para cancelar','cancel-requested':'Cancelación detectada','dialog-disappeared':'Formulario retirado (no confirma cierre)','resolution-requested':'Botón de resolución pulsado (no confirma éxito)'};
      let message = names[event.type];
      if (event.type === 'fields-observed') message = `Campos detectados: ${event.fields.length}`;
      if (event.type === 'classification-observed') {
        const value = event.classification;
        message = value.status === 'unknown' ? 'No se reconoce la estructura de los campos.' : `Tipificación: ${value.category || 'sin elegir'}\nDetalle: ${value.detail || 'sin elegir'}`;
      }
      if (message) rows.push(message); rows = rows.slice(-20); status.textContent = rows.join('\n');
    }});
  };
  shadow.querySelector('#stop').onclick = clear;
  shadow.querySelector('#close').onclick = () => { clear(); host.remove(); };
})();
