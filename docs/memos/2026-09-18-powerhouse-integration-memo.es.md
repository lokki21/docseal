# Memorando — Construir la siguiente etapa de DocSeal sobre Powerhouse

**Para:** Aliado
**De:** DocSeal
**Fecha:** 18 de septiembre de 2026
**Asunto:** Cómo hacemos que la verificación de documentos sea independiente, confiable y sólida jurídicamente

---

## La conclusión de fondo

DocSeal ya demuestra que una póliza de cumplimiento es auténtica y no ha sido alterada. Para pasar de una demostración convincente a un producto en el que una institución pueda apoyarse ante un juez, necesitamos cerrar una sola brecha —**probar *quién* emitió un documento, no solo que no fue modificado**— y necesitamos que la verificación siga funcionando **incluso si los propios sistemas de DocSeal están fuera de línea**.

Hemos decidido construir la siguiente etapa sobre **Powerhouse**, un conjunto de herramientas de software de código abierto, combinado con una **acreditación formal** (en cooperación con un organismo nacional de acreditación). Powerhouse nos da la independencia y el registro inalterable; la acreditación le da el peso jurídico. Juntos, convierten a DocSeal en algo en lo que una aseguradora, una entidad estatal y un juez pueden confiar sin tener que confiar en *nosotros*.

---

## Lo que DocSeal debe garantizar

El corazón del producto es una sola promesa: **cualquiera que reciba un documento puede comprobar que es genuino —por sí mismo, sin confiar en DocSeal.** Piense en el sello de un notario que cualquier ciudadano puede verificar por su cuenta, en cualquier momento, incluso años después, incluso si la notaría ya cerró.

Hoy entregamos la mayor parte de eso: la "huella digital" única del documento (su identificador irrepetible) queda registrada en una cadena de bloques pública —*blockchain*, un libro de registro compartido, permanente e inalterable—, de modo que la integridad y la fecha pueden comprobarse de forma independiente. Lo que todavía falta es la **identidad verificada** y la **plena independencia de nuestros servidores.** Eso es lo que añade esta siguiente etapa.

---

## La brecha que estamos cerrando

Hoy, cuando una aseguradora registra una póliza, *declara* quién es —pero esa identidad no está probada criptográficamente. Es la diferencia entre un nombre escrito en un formulario y una firma que la ley reconoce. Para un documento que protege recursos públicos y que puede ser controvertido, un "nombre escrito" no basta. Powerhouse, sumado a la acreditación, lo convierte en una firma probada y reconocida jurídicamente.

---

## Qué es Powerhouse, en términos sencillos

Powerhouse es un conjunto de bloques de construcción de código abierto para operar registros digitales confiables. Usamos tres de ellos:

| Componente | Qué es (en lenguaje sencillo) | Qué hace por DocSeal |
|---|---|---|
| **Renown** | Una identidad digital que pertenece a su titular —como un pasaporte que lleva consigo y con el que firma, no una cuenta que nosotros controlamos | Permite que cada aseguradora firme lo que emite con una **identidad probable y portátil**. Cierra la brecha del "quién lo emitió". |
| **Document Models** | Un registro donde cada acción queda escrita de forma permanente y firmada criptográficamente —una bitácora infalsificable | Le da a cada registro y a cada verificación una **traza de auditoría firmada y con evidencia de manipulación**. Nadie —ni siquiera DocSeal— puede reescribir la historia en silencio. |
| **Reactor** | Software que se ejecuta en el computador o servidor *del propio usuario*, funciona sin conexión y se mantiene sincronizado | Una entidad estatal puede **realizar la verificación por sí misma**, conservar su propia copia y confirmar un documento sin depender de que DocSeal esté en línea. Esta es la propiedad de "funciona aunque desaparezcamos". |

La idea importante: con Powerhouse, **la prueba viaja con el documento y con el usuario**, en lugar de vivir únicamente en los servidores de DocSeal.

---

## El modelo de confianza — de dónde viene el peso jurídico

La criptografía puede probar que una clave firmó algo. No puede, por sí sola, probar que el firmante es una *aseguradora habilitada*. Alguien de confianza tiene que responder por ello. **DocSeal se convierte en esa autoridad emisora de credenciales** —evaluamos y acreditamos a los emisores— y anclamos nuestra propia autoridad bajo un **organismo nacional de acreditación**, en línea con las reglas colombianas ya existentes para las garantías electrónicas (la Circular Conjunta 001 de 2021 y el régimen acreditado de certificación digital).

Así, la confianza corre en una cadena limpia: **organismo nacional de acreditación → DocSeal → la aseguradora → el documento específico.** Cada eslabón es verificable, y todo el conjunto se apoya sobre la cadena de bloques pública que garantiza que el documento en sí nunca fue alterado.

---

## Por qué esto importa — el valor que aportamos

- **Independencia.** La verificación sobrevive a las caídas de servicio, a los altibajos de nuestra empresa, incluso a nuestra desaparición. La garantía no depende de que una sola compañía siga existiendo.
- **Fuerza jurídica.** Pasar de "el documento no fue modificado" a "*esta aseguradora acreditada* emitió este documento exacto" es lo que hace que resista en una controversia.
- **Autonomía para las instituciones.** Una entidad estatal puede verificar sobre su propia infraestructura —algo atractivo para los organismos públicos que recelan de depender de un proveedor privado.
- **Alineación con la ley vigente.** Colombia ya exige que las garantías estén firmadas, con marca de tiempo y sean verificables en línea. Nos ajustamos a ese mandato en lugar de inventar uno nuevo.
- **Sin dependencia forzosa, con estándares abiertos.** Construido sobre componentes de código abierto e identidades portátiles —una posición más fuerte y creíble que la de un sistema propietario cerrado.

---

## Limitaciones honestas (para tener los ojos abiertos)

- Powerhouse nos da los *rieles* de identidad y de llevado de registros; la **acreditación y el reconocimiento jurídico todavía requieren la alianza y el trabajo de cumplimiento** —el software por sí solo no confiere estatus legal.
- Registrar las huellas digitales en la cadena de bloques tiene un pequeño costo recurrente (fracciones de centavo por documento hoy); a alto volumen las agrupamos por lotes para mantenerlo insignificante.
- Powerhouse es un conjunto de herramientas joven y en rápida evolución —pero es de código abierto y nuestro equipo ya trabaja con él, lo que reduce el riesgo.

---

## Qué sucede ahora

Avanzamos en dos vías:

1. **Ahora — la base de la demostración/producto.** Estamos endureciendo la aplicación actual para que la cadena de bloques sea la única autoridad para un veredicto de "auténtico" y para que la verificación siga funcionando incluso si nuestra base de datos está fuera de línea. Es un trabajo acotado, ya especificado y en curso.
2. **Después — el producto real sobre Powerhouse + acreditación.** La arquitectura descrita arriba se convierte en su propia vía de diseño y construcción, y comparte bloques de construcción con nuestro trabajo relacionado de procedencia documental.

**En una frase:** Powerhouse le permite a DocSeal probar *quién* emitió un documento y permite que cualquiera lo verifique de forma independiente y sin conexión; la acreditación hace que esa prueba sea reconocida jurídicamente —juntos convierten una demostración convincente en una infraestructura de la que las instituciones pueden depender.
