/**
 * ==========================================================
 * MAPA DE MORELIA — Backend seguro (Google Apps Script)
 * ----------------------------------------------------------
 * Recibe los datos del marcador, sube la imagen a ImgBB y añade
 * la nueva fila directamente en la pestaña correcta de tu Google
 * Sheet. Valida mediante token de Firebase que solo los correos
 * autorizados puedan guardar.
 *
 * ----------------------------------------------------------
 * CÓMO CONFIGURARLO (una sola vez)
 * ----------------------------------------------------------
 *   1. Abre tu Google Sheet (la del mapa) → menú "Extensiones" ▸
 *      "Apps Script". Borra el contenido de Code.gs y pega TODO
 *      este archivo (así SpreadsheetApp.getActive() ya apunta
 *      directo a esa hoja, sin tener que buscarla por ID).
 *   2. "Configuración del proyecto" (ícono de engrane) ▸ baja
 *      hasta "Propiedades del script" ▸ "Añadir propiedad de
 *      script" y agrega DOS propiedades:
 *          IMGBB_API_KEY  → tu clave de https://api.imgbb.com/
 *          FIREBASE_KEY   → la "Clave de API web" de tu proyecto
 *                           de Firebase ("elpolodancer"): en
 *                           https://console.firebase.google.com/
 *                           ▸ ⚙️ Configuración del proyecto ▸
 *                           pestaña "General" ▸ "Claves de API web"
 *   3. "Implementar" ▸ "Nueva implementación":
 *          Tipo:               Aplicación web
 *          Ejecutar como:      Yo (tu correo)
 *          Quién tiene acceso: Cualquier usuario
 *   4. Copia la URL que termina en "/exec" y pégala en app.js, en
 *      la constante APPSCRIPT_GUARDAR_URL.
 *
 * Si vuelves a editar este archivo, tienes que crear una "Nueva
 * implementación" otra vez (o editar la existente) para que los
 * cambios se reflejen en la URL /exec.
 * ========================================================== */

// 🔧 Correos autorizados para guardar marcadores directamente
var ADMIN_EMAILS = [
  'polo.pericoperico55@gmail.com',
  'dulceprincesa086@gmail.com'
];

// 🔧 ID de tu álbum de imgbb
var ALBUM_IMGBB = '6de741b47a17508a336206cd813cf6f5';

function doPost(e) {
  try {
    var datos = JSON.parse(e.postData.contents);

    // ── 1. VERIFICAR EL TOKEN CONTRA FIREBASE ──
    var usuario = verificarToken(datos.idToken);
    if (!usuario) return json({ ok: false, error: 'Sesión inválida o expirada' });

    // ── 2. VERIFICAR QUE EL CORREO ESTÉ AUTORIZADO ──
    var email = String(usuario.email || '').trim().toLowerCase();
    var listaOk = ADMIN_EMAILS.map(function (x) { return x.trim().toLowerCase(); });
    if (listaOk.indexOf(email) === -1) {
      return json({ ok: false, error: 'No autorizado' });
    }
    if (usuario.emailVerified === false || usuario.emailVerified === 'false') {
      return json({ ok: false, error: 'Correo no verificado' });
    }

    // ── 3. SUBIR IMAGEN A IMGBB (si el usuario adjuntó una) ──
    var urlImagen = '';
    if (datos.imagenBase64) {
      urlImagen = subirAImgBB(datos.imagenBase64, datos.nombre || 'marcador');
    }

    // ── 4. ESCRIBIR LA FILA EN LA PESTAÑA CORRECTA ──
    // Se busca la pestaña por su gid (el mismo que ya usa el
    // arreglo HOJAS en app.js: 0 = Hoja 1, 292452162 = Tiendas),
    // en vez de usar getActiveSheet(), que depende de cuál pestaña
    // haya quedado abierta la última vez que alguien editó la hoja
    // a mano — eso podía guardar el marcador en la pestaña
    // equivocada.
    var gid = Number(datos.gid);
    var hoja = isNaN(gid) ? SpreadsheetApp.getActive().getActiveSheet() : obtenerHojaPorGid(gid);

    // Orden de columnas en tu hoja:
    // A: Nombre, B: Link, C: Categoría, D: Emoji, E: Color,
    // F: Latitud, G: Longitud, H: Links adicionales/Descripción, I: Imagen (ImgBB)
    var nuevaFila = [
      datos.nombre || '',
      datos.url || '',
      datos.categoria || '',
      datos.emoji || '',
      datos.color || '#1a73e8',
      datos.lat || '',
      datos.lng || '',
      datos.descripcion || '',
      urlImagen,
      datos.etiquetasLinks || '',
      datos.coloresExtra || '',
      datos.categoriasSub || ''
    ];

    hoja.appendRow(nuevaFila);
    var filaIndex = hoja.getLastRow();

    // ── 5. BITÁCORA DE SEGURIDAD ──
    registrarBitacora(email, datos.nombre, hoja.getName(), filaIndex);

    return json({ ok: true, fila: filaIndex, imagen: urlImagen });

  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/** Busca la pestaña cuyo gid coincide con el que mandó app.js. */
function obtenerHojaPorGid(gid) {
  var hojas = SpreadsheetApp.getActive().getSheets();
  for (var i = 0; i < hojas.length; i++) {
    if (hojas[i].getSheetId() === gid) return hojas[i];
  }
  return SpreadsheetApp.getActive().getActiveSheet(); // respaldo, por si no se encuentra el gid
}

/**
 * Verifica el ID token contra la API de Firebase Auth.
 */
function verificarToken(idToken) {
  if (!idToken) return null;
  var key = PropertiesService.getScriptProperties().getProperty('FIREBASE_KEY');
  if (!key) throw new Error('Falta configurar la propiedad FIREBASE_KEY en el script');

  var resp = UrlFetchApp.fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + key,
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ idToken: idToken }),
      muteHttpExceptions: true
    }
  );

  if (resp.getResponseCode() !== 200) return null;
  var data = JSON.parse(resp.getContentText());
  if (!data.users || !data.users.length) return null;
  return data.users[0];
}

/**
 * Sube la imagen a ImgBB utilizando la clave privada guardada en las propiedades.
 */
function subirAImgBB(base64, nombre) {
  var key = PropertiesService.getScriptProperties().getProperty('IMGBB_API_KEY');
  if (!key) throw new Error('Falta configurar IMGBB_API_KEY en las propiedades del script');

  var resp = UrlFetchApp.fetch('https://api.imgbb.com/1/upload?key=' + key, {
    method: 'post',
    payload: {
      image: base64,
      name: String(nombre).replace(/\.[^.]+$/, ''),
      album: ALBUM_IMGBB
    },
    muteHttpExceptions: true
  });

  var data = JSON.parse(resp.getContentText());
  if (!data.success) {
    throw new Error('ImgBB: ' + ((data.error && data.error.message) || 'fallo al subir la imagen'));
  }
  return data.data.url || data.data.display_url;
}

/** Deja constancia de cada alta en una pestaña de auditoría. */
function registrarBitacora(email, nombre, nombreHoja, fila) {
  try {
    var ss = SpreadsheetApp.getActive();
    var log = ss.getSheetByName('Bitacora');
    if (!log) {
      log = ss.insertSheet('Bitacora');
      log.appendRow(['Fecha', 'Usuario', 'Negocio / Lugar', 'Pestaña', 'Fila en Sheet']);
    }
    log.appendRow([new Date(), email, nombre, nombreHoja, fila]);
  } catch (err) {
    // La bitácora no debe interrumpir el proceso principal si falla
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return json({ ok: false, error: 'Método no permitido' });
}

/**
 * Función opcional de prueba: selecciónala en el menú desplegable de
 * arriba (junto al botón ▶️ Ejecutar) y corre "probarPropiedades"
 * para confirmar que IMGBB_API_KEY y FIREBASE_KEY están bien
 * guardadas, sin tener que guardar un marcador todavía. Revisa el
 * resultado en "Ver" ▸ "Registros" (Ctrl/Cmd + Enter).
 */
function probarPropiedades() {
  var props = PropertiesService.getScriptProperties();
  Logger.log(props.getProperty('IMGBB_API_KEY') ? '✅ IMGBB_API_KEY está guardada.' : '⚠️ Falta IMGBB_API_KEY.');
  Logger.log(props.getProperty('FIREBASE_KEY') ? '✅ FIREBASE_KEY está guardada.' : '⚠️ Falta FIREBASE_KEY.');
}
