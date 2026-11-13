# 0.22.4 — distinguir la TC atendida entre las del nombre

La extracción encontraba TC en los mensajes, y la llamada del resumen ya podía devolver chatTc junto a una cita literal. El error era de decisión: clearTC exigía una única candidata global, por lo que las dos TC del nombre seguían obligando a selección manual incluso con evidencia del contacto actual.

Ahora se distingue la lista de candidatas de la TC atendida. Una afirmación explícita y no ambigua del asesor o cliente en los textos del contacto permite proponer esa TC aunque el nombre incluya otras. También se aprovecha chatTc de la misma respuesta de IA si su cita existe literalmente en un mensaje capturado, incluye la TC explícita y no procede de una pregunta, negación o alternativa. Una pregunta anterior sin respuesta no anula una afirmación posterior sustentada por la cita. Si aparecen dos TC distintas afirmadas para la gestión, se conserva la selección humana.

No se extrae la TC de la prosa generada del resumen: la fuente es el texto capturado y la cita verificable. No se añade llamada de IA ni se cambia de modelo. La misma validación CRM y confirmación final del asesor siguen siendo obligatorias. Tampoco se consulta el historial de otros días/atenciones para resolver la identidad actual.

Pruebas añadidas: afirmaciones de asesor/cliente; cita tras pregunta anterior; cita inventada rechazada; preguntas/negaciones/alternativas y números ajenos; dos TC en nombre y preparación exclusiva para la afirmada en el chat. Se usa motor de extensión y CRM simulado. No se cerraron chats ni escribieron tareas reales en esta corrección. Ensayo instalado pendiente del asesor.

Resultado: 44/44 pruebas dirigidas y de regresión aprobadas, incluidos recorridos secuenciales y recuperación.
