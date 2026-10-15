// Serialized by chrome.scripting.executeScript into an existing SGC tab.
// Keep helpers inside this function: no page globals, cookies, scripts or HTML leave SGC.
export async function readSgcCustomer(identification) {
  const origin = 'https://sgc.yadinero.co';
  const fail = (code, error) => Object.assign(new Error(error), { code });
  if (location.origin !== origin || !/^\d{5,15}$/.test(identification)) {
    return { ok: false, code: 'SGC_INVALID_REQUEST', error: 'La consulta de SGC no es válida.' };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  // Timing-only diagnostics: no documents, HTML, names, URLs or credentials are reported.
  const startedAt = Date.now();
  const stages = [];
  const withTimings = result => ({ ...result, timing: { totalMs: Date.now() - startedAt, stages } });
  const text = node => String(node?.textContent || '').replace(/\s+/g, ' ').trim();
  const key = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cells = row => [...row.children].filter(e => /^(TD|TH)$/.test(e.tagName));
  function tableWith(root, required) {
    return [...root.querySelectorAll('table')].find(table => {
      const headers = cells(table.querySelector('tr') || { children: [] }).map(e => key(text(e)));
      return required.every(label => headers.includes(key(label)));
    });
  }
  function rows(table) {
    if (!table) return [];
    const all = [...table.querySelectorAll('tr')].filter(row => row.closest('table') === table);
    const headers = cells(all[0] || { children: [] }).map(e => key(text(e)));
    return all.slice(1).map(row => {
      const values = cells(row);
      return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
    });
  }
  function pathFor(anchor, pattern) {
    if (!anchor) return null;
    try {
      const url = new URL(anchor.getAttribute('href'), origin);
      return url.origin === origin && !url.username && !url.password && !url.search && !url.hash && pattern.test(url.pathname) ? url.pathname : null;
    } catch { return null; }
  }
  function linkIn(root, pattern) {
    return [...(root?.querySelectorAll('a[href]') || [])].map(a => pathFor(a, pattern)).find(Boolean) || null;
  }
  function identificationIn(cell) {
    const direct = [...(cell?.childNodes || [])].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ');
    const match = direct.match(/(?:\b(?:CC|CE|TI|NIT)\s*[-:]?\s*)?(\d[\d.\s-]*\d)/i);
    return match ? match[1].replace(/\D/g, '') : '';
  }
  async function readPage(path) {
    const url = new URL(path, origin);
    if (url.origin !== origin || !/^\/(?:customers(?:\/show\/\d+)?|requests\/edit\/\d+)$/.test(url.pathname)) {
      throw fail('SGC_ROUTE', 'SGC devolvió un enlace de consulta no permitido.');
    }
    // No writes, retries, export URLs, pagination or automatic login.
    const fetchStartedAt = Date.now();
    const response = await fetch(url.href, {
      method: 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: controller.signal
    });
    // fetch resolves once the response headers arrive. This includes network + server wait.
    const responseMs = Date.now() - fetchStartedAt;
    if (response.status === 401 || response.status === 419) throw fail('SGC_SESSION_REQUIRED', 'Abre SGC e inicia sesión para consultar.');
    if (response.status === 403) throw fail('SGC_FORBIDDEN', 'Tu usuario de SGC no tiene permiso para esta consulta.');
    if (!response.ok) throw fail('SGC_UNAVAILABLE', 'SGC no pudo completar la consulta. Intenta nuevamente.');
    if (response.url && new URL(response.url).origin !== origin) throw fail('SGC_SESSION_REQUIRED', 'Verifica tu sesión en SGC.');
    const html = await response.text();
    const downloadMs = Date.now() - fetchStartedAt;
    const transferMs = downloadMs - responseMs;
    if (html.length > 5000000) throw fail('SGC_RESPONSE_SIZE', 'La respuesta de SGC es demasiado grande para esta consulta.');
    // A detached template stays inert: remote images, iframes and scripts never run.
    const parseStartedAt = Date.now();
    const template = document.createElement('template');
    template.innerHTML = html;
    const root = template.content;
    if (root.querySelector('input[type="password"]') && !root.querySelector('a[href$="/logout"]')) {
      throw fail('SGC_SESSION_REQUIRED', 'Tu sesión de SGC venció. Abre SGC e inicia sesión nuevamente.');
    }
    stages.push({
      stage: url.pathname === '/customers' ? 'cliente' : url.pathname.startsWith('/customers/show/') ? 'ficha' : 'solicitud',
      downloadMs,
      responseMs,
      transferMs,
      parseMs: Date.now() - parseStartedAt,
      htmlChars: html.length
    });
    return root;
  }
  function requestRows(root) {
    const table = tableWith(root, ['ID', 'Valor solicitado', 'Estado', 'Creado']);
    if (!table) throw fail('SGC_FORMAT_CHANGED', 'No se pudo reconocer la lista de solicitudes. Abre la ficha en SGC.');
    return rows(table).flatMap(row => {
      const path = linkIn(row.id, /^\/requests\/(?:edit|show)\/\d+$/);
      if (!path) return [];
      return [{
        id: path.match(/\d+$/)[0], path: path.replace('/show/', '/edit/'),
        amount: text(row.valorsolicitado), status: text(row.estado), days: text(row.dias),
        createdAt: text(row.creado), typification: text(row.tipificacion)
      }];
    }).sort((a, b) => {
      const dates = Date.parse(b.createdAt) - Date.parse(a.createdAt);
      return (Number.isFinite(dates) && dates !== 0) ? dates : Number(b.id) - Number(a.id);
    });
  }
  try {
    const search = new URL('/customers', origin);
    search.search = new URLSearchParams({ filter: identification, request_status_id: '0', category_id: '0', profile_id: '0' }).toString();
    const list = await readPage(search.pathname + search.search);
    const table = tableWith(list, ['Identificacion', 'Nombre completo', 'Estado última solicitud', 'Categoría', 'Perfil']);
    if (!table) throw fail('SGC_FORMAT_CHANGED', 'No se pudo reconocer la búsqueda de clientes. Revisa tu sesión y abre SGC.');
    // SGC's filter can also match names or partial documents; never accept a fuzzy match.
    const matches = rows(table).filter(row => identificationIn(row.identificacion) === identification);
    if (!matches.length) return withTimings({ ok: true, customer: null, checkedAt: new Date().toISOString() });
    if (matches.length !== 1) throw fail('SGC_AMBIGUOUS', 'SGC devolvió más de un cliente con esa identificación. Revisa los registros directamente en SGC.');
    const row = matches[0];
    const customerPath = linkIn(row.acciones, /^\/customers\/show\/\d+$/);
    if (!customerPath) throw fail('SGC_FORBIDDEN', 'SGC no ofrece acceso a la ficha de este cliente con tu usuario.');
    const customer = {
      id: customerPath.match(/\d+$/)[0], identification,
      name: text(row.nombrecompleto?.querySelector('h5,h4,strong')) || text(row.nombrecompleto),
      state: row.estado?.querySelector('.wb-check') ? 'Habilitado' : row.estado?.querySelector('.wb-close') ? 'No habilitado' : 'No informado',
      latestStatus: text(row.estadoultimasolicitud), category: text(row.categoria), profile: text(row.perfil),
      blocks: [...(row.identificacion?.querySelectorAll('.badge,.label') || [])].map(text).filter(Boolean),
      url: origin + customerPath
    };
    const result = { ok: true, customer, latestRequest: null, requests: [], credits: [], checkedAt: new Date().toISOString(), warning: null };
    try {
      const detail = await readPage(customerPath);
      const detailIdentity = [...detail.childNodes].map(text).join(' ').match(/Identificaci[oó]n\s*:\s*(?:(?:CC|CE|TI)\s*[-:]?\s*)?(\d[\d.\s-]*\d)/i);
      if (!detailIdentity || detailIdentity[1].replace(/\D/g, '') !== identification) {
        throw fail('SGC_CUSTOMER_MISMATCH', 'No se pudo confirmar la identificación en la ficha del cliente. Abre SGC para verificarla.');
      }
      const requests = requestRows(detail);
      result.requests = requests.slice(0, 5).map(({ path, ...r }) => ({ ...r, url: origin + path }));
      result.moreRequests = requests.length > 5;
      const creditRows = rows(tableWith(detail, ['ID', 'Valor Facturado', 'Saldo', 'Creado']));
      const credits = creditRows.filter(r => /^\d+$/.test(text(r.id)));
      result.credits = credits.slice(0, 5).map(r => ({ id: text(r.id), amount: text(r.valorfacturado), balance: text(r.saldo), createdAt: text(r.creado) }));
      result.moreCredits = credits.length > 5;
      result.creditsAvailable = Boolean(tableWith(detail, ['ID', 'Valor Facturado', 'Saldo', 'Creado']));
      if (requests.length) {
        const latest = requests[0];
        result.latestRequest = { ...result.requests[0], detailsAvailable: false, history: [] };
        const request = await readPage(latest.path);
        const ownerPath = linkIn(request, /^\/customers\/show\/\d+$/);
        const documentInput = request.querySelector('input[name="doc_num"]');
        if (ownerPath !== customerPath || (documentInput && String(documentInput.value).replace(/\D/g, '') !== identification)) {
          throw fail('SGC_CUSTOMER_MISMATCH', 'No se pudo confirmar que la solicitud pertenezca al cliente consultado.');
        }
        const values = Object.fromEntries([...request.querySelectorAll('.counter-label')].map(label => [key(text(label)), text(label.parentElement.querySelector('.counter-number-group'))]));
        if (!values.estadodelasolicitud) throw fail('SGC_FORMAT_CHANGED', 'No se pudo reconocer el detalle de la solicitud.');
        const history = [...request.querySelectorAll('#coments_div li.list-group-item')].slice(0, 6).map(item => ({
          type: text(item.querySelector('small.badge')).slice(0, 80),
          description: text(item.querySelector(':scope > p')).slice(0, 400),
          date: text(item.querySelector('time')).slice(0, 60)
        })).filter(event => event.description);
        result.latestRequest = {
          ...result.latestRequest, detailsAvailable: true, status: values.estadodelasolicitud,
          typification: values.tipificacion || latest.typification, amount: values.valorcredito || latest.amount,
          totalToPay: values.valorapagar || null, createdAt: values.creado || latest.createdAt,
          deadline: values.fechalimite || null, days: values.diasdelcredito || latest.days, history
        };
      }
    } catch (error) {
      // Keep the exact customer match useful without presenting missing data as empty.
      result.warning = error.code ? error.message : 'No se pudo completar la ficha. Verifica la sesión y los permisos en SGC.';
      result.warningCode = error.code || 'SGC_DETAIL_UNAVAILABLE';
      if (error.code === 'SGC_CUSTOMER_MISMATCH') {
        result.latestRequest = null;
        result.requests = [];
      }
    }
    result.checkedAt = new Date().toISOString();
    return withTimings(result);
  } catch (error) {
    return withTimings({ ok: false, code: error.code || (controller.signal.aborted ? 'SGC_TIMEOUT' : 'SGC_CONNECTION'), error: error.code ? error.message : controller.signal.aborted ? 'SGC tardó demasiado en responder. Intenta nuevamente.' : 'No fue posible consultar SGC. Abre SGC y verifica tu sesión y conexión.' });
  } finally {
    clearTimeout(timeout);
  }
}
