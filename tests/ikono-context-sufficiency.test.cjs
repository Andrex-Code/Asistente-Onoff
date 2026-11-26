const {test}=require('node:test');
const assert=require('node:assert/strict');
const {assess,summary}=require('../tools/ikono-summary-preview/manual-review.js');
const cases=[
  [
    "audio y saludo",
    [
      {
        "role": "advisor",
        "text": "Buenos días, mi nombre es Andrés y soy su asesor. ¿En qué le puedo ayudar?"
      }
    ],
    {
      "customerAudioIds": [
        "a"
      ],
      "summaryReady": true,
      "summary": "Motivo: Solicitud de atención al cliente.\nGestión: Se presentó el asesor.\nResultado: Pendiente."
    },
    true
  ],
  [
    "audio y listo",
    [
      {
        "role": "advisor",
        "text": "Listo, entendido"
      }
    ],
    {
      "customerAudioIds": [
        "a"
      ],
      "summaryReady": true,
      "summary": "Motivo: Solicitud de atención al cliente."
    },
    true
  ],
  [
    "audio explicado",
    [
      {
        "role": "advisor",
        "text": "Para generar la factura electrónica debe crear el producto desde la web."
      }
    ],
    {
      "customerAudioIds": [
        "a"
      ],
      "summaryReady": true,
      "summary": "Motivo: Facturación electrónica."
    },
    false
  ],
  [
    "texto claro y audio",
    [
      {
        "role": "customer",
        "text": "No puedo generar la factura electrónica"
      }
    ],
    {
      "customerAudioIds": [
        "a"
      ],
      "summaryReady": true,
      "summary": "Motivo: Error en la factura electrónica."
    },
    false
  ],
  [
    "foto sin contexto",
    [
      {
        "role": "customer",
        "text": "Me sale esto"
      }
    ],
    {
      "photoIds": [
        "f"
      ],
      "summaryReady": true,
      "summary": "Motivo: Solicitud de soporte."
    },
    true
  ],
  [
    "foto explicada",
    [
      {
        "role": "customer",
        "text": "El POS no conecta a wifi"
      }
    ],
    {
      "photoIds": [
        "f"
      ],
      "summaryReady": true,
      "summary": "Motivo: POS sin conexión."
    },
    false
  ],
  [
    "sin respuesta",
    [
      {
        "role": "advisor",
        "text": "Buenos días, ¿en qué le puedo ayudar?"
      }
    ],
    {
      "summaryReady": true,
      "summary": "Motivo: Solicitud de atención al cliente.",
      "detail": "SIN RESPUESTA"
    },
    false
  ],
  [
    "texto y resumen genérico",
    [
      {
        "role": "customer",
        "text": "Necesito habilitar la factura electrónica"
      }
    ],
    {
      "summaryReady": true,
      "summary": "Motivo: Solicitud de atención al cliente.\nGestión: Pendiente.\nResultado: Pendiente."
    },
    false
  ],
  [
    "saludo únicamente",
    [
      {
        "role": "customer",
        "text": "Hola"
      }
    ],
    {
      "summaryReady": true,
      "summary": "Motivo: Solicitud de atención al cliente."
    },
    true
  ],
  [
    "salida explícita",
    [
      {
        "role": "advisor",
        "text": "Le escribo para informarle sobre el pago de su cuota"
      }
    ],
    {
      "summaryReady": true,
      "summary": "Motivo: Información de pago."
    },
    false
  ],
  [
    "historial aún cargando",
    [],
    {
      "summaryReady": false,
      "generationStatus": "Cargando historial"
    },
    false
  ]
];
for(const [name,rows,ctx,want] of cases)test(name,()=>{const got=assess({messages:rows.map((x,i)=>[String(i),x]),category:'CONTACTO',detail:ctx.detail||'COMERCIAL'},ctx);assert.equal(got.required,want);if(name==='texto y resumen genérico')assert.match(got.summary,/Necesito habilitar la factura electrónica/);if(name==='sin respuesta')assert.match(got.summary,/sin respuesta visible/);});
test('manual reason must be concrete',()=>{assert.equal(summary(['Solicitud de atención al cliente','','']),'');assert.match(summary(['Error en la factura electrónica','','']),/Error en la factura electrónica/);});
