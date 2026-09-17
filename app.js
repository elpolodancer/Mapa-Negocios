/* =========================================================
   MAPA
   ========================================================= */
const map = L.map('map', { zoomControl: false, maxZoom: 21 }).setView([19.7008, -101.1844], 14); // Morelia, Michoacán

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 21,        // permite acercarse más allá del zoom nativo de OpenStreetMap
  maxNativeZoom: 19,   // OSM solo tiene imágenes hasta 19; de 20-21 se hace un acercamiento digital
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

// Controles de zoom movidos a la esquina superior derecha (antes chocaban con el botón ☰ del menú)
L.control.zoom({ position: 'topright' }).addTo(map);

/* =========================================================
   PANTALLA DE BIENVENIDA
   -----------------------------------------------------------
   Aparece encima de todo al cargar la página (a menos que el
   usuario haya elegido "No mostrarla" desde Ajustes de cuenta →
   Pantalla de bienvenida; esa preferencia se guarda en
   localStorage, por navegador/dispositivo). Se puede cerrar de
   dos formas: presionando "Ver Mapa", o en pantallas de celular,
   deslizándola hacia arriba con el dedo. Al cerrarse, el mapa se
   centra en la Plaza de Armas de Morelia y se deja activo el
   filtro de "Plazas" (que ya es el filtro por defecto, pero se
   vuelve a aplicar aquí por si el usuario lo había quitado en una
   visita anterior — aunque el filtro no se guarda entre visitas,
   esto asegura el comportamiento pedido de "mostrar Plazas" cada
   vez que se cierra la bienvenida).
   ========================================================= */
const PLAZA_DE_ARMAS_MORELIA = [19.7024222, -101.1936501];
const pantallaBienvenida = document.getElementById('pantallaBienvenida');
const btnVerMapa = document.getElementById('btnVerMapa');
const CLAVE_MOSTRAR_BIENVENIDA = 'mapaMostrarBienvenida';

// Por defecto (si nunca se ha guardado nada) la pantalla SÍ se muestra.
function debeMostrarBienvenida() {
  return localStorage.getItem(CLAVE_MOSTRAR_BIENVENIDA) !== '0';
}

function cerrarBienvenidaYMostrarMapa() {
  pantallaBienvenida.classList.add('oculta');
  map.setView(PLAZA_DE_ARMAS_MORELIA, 17);
  aplicarFiltroCategoria('Plazas');
}

btnVerMapa.addEventListener('click', cerrarBienvenidaYMostrarMapa);

// ---- Deslizar hacia arriba para cerrarla (pensado para celulares) ----
// Sigue el dedo mientras se desliza hacia arriba; si se suelta habiendo
// recorrido más del umbral, se cierra la pantalla igual que con "Ver
// Mapa". Si se suelta antes, vuelve a su lugar con una animación.
let bienvenidaTocandoY = null;
let bienvenidaDesplazamiento = 0;
const UMBRAL_CIERRE_BIENVENIDA = 110; // píxeles hacia arriba para que cuente como "cerrar"

pantallaBienvenida.addEventListener('touchstart', (e) => {
  bienvenidaTocandoY = e.touches[0].clientY;
  pantallaBienvenida.classList.add('arrastrando');
}, { passive: true });

pantallaBienvenida.addEventListener('touchmove', (e) => {
  if (bienvenidaTocandoY === null) return;
  const deltaY = e.touches[0].clientY - bienvenidaTocandoY;
  bienvenidaDesplazamiento = Math.min(0, deltaY); // solo se permite deslizar hacia arriba
  pantallaBienvenida.style.transform = `translateY(${bienvenidaDesplazamiento}px)`;
  pantallaBienvenida.style.opacity = String(1 - Math.min(.6, Math.abs(bienvenidaDesplazamiento) / 400));
}, { passive: true });

function terminarArrastreBienvenida() {
  pantallaBienvenida.classList.remove('arrastrando');
  if (Math.abs(bienvenidaDesplazamiento) > UMBRAL_CIERRE_BIENVENIDA) {
    cerrarBienvenidaYMostrarMapa();
  }
  pantallaBienvenida.style.transform = '';
  pantallaBienvenida.style.opacity = '';
  bienvenidaTocandoY = null;
  bienvenidaDesplazamiento = 0;
}

pantallaBienvenida.addEventListener('touchend', terminarArrastreBienvenida);
pantallaBienvenida.addEventListener('touchcancel', terminarArrastreBienvenida);

/* =========================================================
   MI UBICACIÓN
   -----------------------------------------------------------
   Al presionar el botón, el navegador muestra su propio aviso
   nativo de permiso de ubicación (con las opciones "Mientras
   se usa la app / Solo esta vez / Nunca" o equivalentes según
   el navegador). Ese aviso no se puede diseñar desde el sitio;
   simplemente aparece al llamar a navigator.geolocation.
   ========================================================= */
const btnUbicacion = document.getElementById('btnUbicacion');
const toastUbicacion = document.getElementById('toastUbicacion');
let marcadorUbicacion = null;
let circuloPrecisionUbicacion = null;
let toastUbicacionTimeout = null;

function mostrarToastUbicacion(texto) {
  toastUbicacion.textContent = texto;
  toastUbicacion.classList.add('visible');
  clearTimeout(toastUbicacionTimeout);
  toastUbicacionTimeout = setTimeout(() => {
    toastUbicacion.classList.remove('visible');
  }, 5000);
}

function alObtenerUbicacionExito(pos) {
  btnUbicacion.classList.remove('cargando');
  const { latitude, longitude, accuracy } = pos.coords;

  if (!marcadorUbicacion) {
    marcadorUbicacion = L.circleMarker([latitude, longitude], {
      radius: 8,
      color: '#fff',
      weight: 3,
      fillColor: '#1a73e8',
      fillOpacity: 1
    }).addTo(map);
  } else {
    marcadorUbicacion.setLatLng([latitude, longitude]);
  }

  if (!circuloPrecisionUbicacion) {
    circuloPrecisionUbicacion = L.circle([latitude, longitude], {
      radius: accuracy,
      color: '#1a73e8',
      weight: 1,
      fillColor: '#1a73e8',
      fillOpacity: .12
    }).addTo(map);
  } else {
    circuloPrecisionUbicacion.setLatLng([latitude, longitude]);
    circuloPrecisionUbicacion.setRadius(accuracy);
  }

  map.setView([latitude, longitude], 17);
}

function alObtenerUbicacionError(err) {
  btnUbicacion.classList.remove('cargando');
  if (err.code === err.PERMISSION_DENIED) {
    mostrarToastUbicacion('Bloqueaste el acceso a tu ubicación. Actívalo desde los permisos del sitio en tu navegador si quieres usar esta función.');
  } else if (err.code === err.TIMEOUT) {
    mostrarToastUbicacion('No pudimos obtener tu ubicación a tiempo. Inténtalo de nuevo.');
  } else {
    mostrarToastUbicacion('No se pudo obtener tu ubicación en este momento.');
  }
}

btnUbicacion.addEventListener('click', () => {
  if (!navigator.geolocation) {
    mostrarToastUbicacion('Tu navegador no soporta geolocalización.');
    return;
  }
  btnUbicacion.classList.add('cargando');
  navigator.geolocation.getCurrentPosition(alObtenerUbicacionExito, alObtenerUbicacionError, {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  });
});

/* =========================================================
   GOOGLE SHEETS: fuentes públicas de los negocios/lugares
   -----------------------------------------------------------
   Ahora solo se lee la Hoja 1 (antes se combinaban 4 hojas
   distintas; las hojas 2 y 3 se quitaron por completo). La
   pestaña "Tiendas" (antes Hoja 4) se conserva porque vive
   dentro del mismo archivo que la Hoja 1, solo que en otra
   pestaña identificada por su propio gid.

   Columnas de cada hoja (todas comparten el mismo orden):
     A Nombre · B Link · C Categoría · D Emoji · E Color ·
     F Latitud · G Longitud · H Links adicionales (separados por
     comas) · I Imagen del submenú (imgbb) · J Nombres de cada link
     (separados por comas) · K Colores de negocios extra (separados
     por comas, mismo orden que los links adicionales) · L Categorías
     de sub negocios (separadas por comas, mismo orden)

   La columna C (Categoría) puede traer varios términos separados
   por comas, por ejemplo "Plazas, Áreas Verdes, Espacios Abiertos,
   Bosque". El PRIMER término es la categoría "oficial": la que se
   usa como botón/chip en los filtros y como color del marcador. Los
   demás términos no aparecen como botón, pero sí sirven para que el
   buscador encuentre ese negocio si alguien escribe cualquiera de
   esos otros términos (ver categoriasBusqueda más abajo).

   La hoja debe estar compartida como "Cualquiera con el
   enlace, Lector" para que cualquier visitante de la página
   pueda leerla.
   ========================================================= */
const HOJAS = [
  { hoja: 1, id: '1AQQ8DqH7DFfgOvSrQd1E1ZbvwB7-5D1b62O5fD0FIDo', gid: 0 },
  { hoja: 4, id: '1AQQ8DqH7DFfgOvSrQd1E1ZbvwB7-5D1b62O5fD0FIDo', gid: 292452162 },
];

function urlCsvHoja(hoja) {
  return `https://docs.google.com/spreadsheets/d/${hoja.id}/export?format=csv&gid=${hoja.gid}`;
}

const NOMBRES_HOJA = {
  1: 'Hoja 1 — mini tiendas, mercados y supermercados',
  4: 'Tiendas',
};

// Calcula el número real de fila en la hoja de Google Sheets a partir
// del id interno de un negocio ('h{numeroHoja}-fila-{i}', ver parseCSV
// más abajo: i es el índice dentro de "filas", que ya viene sin el
// encabezado). Fila real = i + 2 (fila 1 es el encabezado, e i empieza
// en 0). Se usa para que "💾 Guardar cambios en la hoja" sepa en qué
// fila sobrescribir sin tener que buscar el negocio por nombre.
function filaSheetDeNegocio(id) {
  const match = /^h\d+-fila-(\d+)$/.exec(id || '');
  if (!match) return null;
  return Number(match[1]) + 2;
}

let negocios = []; // [{ nombre, url, categoria, emoji, color, lat, lng, activo, hoja, subCategorias, subColores }]
const referencias = {}; // marcadores de Leaflet por índice

/* =========================================================
   COLORES PERMANENTES POR CATEGORÍA
   -----------------------------------------------------------
   Cada categoría (farmacia, yesos, páginas web, clases de
   baile, etc.) tiene un único color permanente, guardado en
   localStorage. La primera vez que aparece una categoría se
   pide el color; de ahí en adelante ese color se usa siempre
   y solo se puede cambiar desde el menú "🎨 Categorías y
   colores".
   ========================================================= */
const CLAVE_COLORES_CATEGORIA = 'mapaColoresCategorias';

function normalizarCategoria(c) {
  return (c || '').trim().toLowerCase();
}

// Da formato consistente a una categoría escrita por el usuario: quita
// espacios sobrantes y deja la primera letra en mayúscula y el resto en
// minúscula, sin importar cómo se haya escrito originalmente en la hoja
// de Google Sheets (p. ej. "farmacia", "FARMACIA" y "Farmacia" se
// convierten todas en "Farmacia"). Así el buscador y los filtros de tipo
// de negocio nunca muestran la misma categoría dos veces por un problema
// de mayúsculas/minúsculas.
function formatearCategoria(c) {
  const limpio = (c || '').trim();
  if (!limpio) return '';
  return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
}

function cargarColoresCategoria() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_COLORES_CATEGORIA)) || {};
  } catch (e) {
    return {};
  }
}

function guardarColoresCategoriaEnStorage() {
  localStorage.setItem(CLAVE_COLORES_CATEGORIA, JSON.stringify(coloresCategoria));
}

let coloresCategoria = cargarColoresCategoria();

// Devuelve el color permanente guardado para una categoría, o undefined
// si esa categoría todavía no tiene uno asignado.
function obtenerColorCategoria(categoria) {
  const clave = normalizarCategoria(categoria);
  return clave ? coloresCategoria[clave] : undefined;
}

// Guarda (o sobrescribe, si se hace desde "Categorías y colores") el
// color permanente de una categoría.
function fijarColorCategoria(categoria, color) {
  const clave = normalizarCategoria(categoria);
  if (!clave || !color) return;
  coloresCategoria[clave] = color;
  guardarColoresCategoriaEnStorage();
}

// Junta todas las categorías conocidas: las que ya tienen negocios
// cargados, más las que ya tienen un color guardado (por si el
// negocio con esa categoría se borró de la hoja).
function categoriasConocidas() {
  const set = new Set();
  negocios.forEach(n => {
    if (n.categoria) set.add(n.categoria.trim());
    (n.subCategorias || []).forEach(c => { if (c) set.add(c.trim()); });
  });
  Object.keys(coloresCategoria).forEach(clave => {
    if (!set.has(clave)) set.add(clave);
  });
  return [...set].filter(c => c).sort((a, b) => a.localeCompare(b, 'es'));
}

// Al cargar los datos de las hojas, cualquier categoría que aún no
// tenga un color permanente adopta el color (columna E) que ya traía
// en la hoja como su color permanente de ahí en adelante. Así las
// categorías que ya existían no piden elegir color de nuevo; solo las
// categorías nuevas lo pedirán.
function inicializarColoresCategoriaDesdeDatos() {
  negocios.forEach(n => {
    if (n.categoria && !obtenerColorCategoria(n.categoria) && n.color) {
      fijarColorCategoria(n.categoria, n.color);
    }
  });
}

// Actualiza el campo de color y su nota de ayuda según si la
// categoría escrita ya tiene un color permanente o es nueva.
function actualizarNotaColor(campoCategoria, campoColor, notaEl) {
  if (!campoCategoria || !campoColor || !notaEl) return;
  const cat = campoCategoria.value.trim();
  if (!cat) {
    campoColor.disabled = false;
    notaEl.textContent = '';
    return;
  }
  const colorGuardado = obtenerColorCategoria(cat);
  if (colorGuardado) {
    campoColor.value = colorGuardado;
    campoColor.disabled = true;
    notaEl.textContent = `🔒 "${cat}" ya tiene un color permanente. Para cambiarlo, usa 🎨 Categorías y colores en el menú.`;
  } else {
    campoColor.disabled = false;
    notaEl.textContent = `✨ "${cat}" es una categoría nueva: el color que elijas aquí quedará guardado como su color permanente.`;
  }
}

// Separa una línea de CSV en columnas respetando comillas (evita
// el bug de campos "fantasma" vacíos que se generaba con comas simples)
function dividirLineaCSV(linea) {
  const resultado = [];
  let actual = '';
  let dentroComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      if (dentroComillas && linea[i + 1] === '"') { actual += '"'; i++; }
      else dentroComillas = !dentroComillas;
    } else if (c === ',' && !dentroComillas) {
      resultado.push(actual);
      actual = '';
    } else {
      actual += c;
    }
  }
  resultado.push(actual);
  return resultado;
}

// numeroHoja: 1, 2 o 3 — identifica de qué hoja de Google Sheets viene
// cada fila, para poder combinarlas y luego filtrarlas/consultarlas.
function parseCSV(texto, numeroHoja) {
  texto = texto.replace(/^\uFEFF/, ''); // quita BOM si Google lo agrega
  const lineas = texto.trim().split(/\r?\n/);
  const filas = lineas.slice(1); // saltamos encabezados
  const limpiar = c => (c || '').trim();

  return filas
    .map((linea, i) => {
      const campos = dividirLineaCSV(linea).map(limpiar);
      // Columnas: A Nombre(0) · B Link(1) · C Categoría(2) · D Emoji(3) ·
      // E Color(4) · F Latitud(5) · G Longitud(6) · H Links
      // adicionales(7) · I Imagen imgbb(8) · J Nombres de cada link /
      // etiquetas(9) · K Colores de negocios extra(10) · L Categorías
      // de sub negocios(11)
      const lat = parseFloat(campos[5]);
      const lng = parseFloat(campos[6]);
      const url = campos[1] || '';
      // Columna C: puede traer varios términos separados por comas
      // ("Plazas, Áreas Verdes, Espacios Abiertos, Bosque"). El
      // primero es la categoría "oficial" (botón de filtro + color);
      // todos (incluido el primero) quedan en categoriasBusqueda para
      // que el buscador encuentre el negocio con cualquiera de ellos.
      const terminosCategoria = (campos[2] || '')
        .split(',')
        .map(t => formatearCategoria(t.trim()))
        .filter(t => t);
      const categoria = terminosCategoria[0] || '';
      const categoriasBusqueda = terminosCategoria;
      // Columna H: una o varias páginas web adicionales (perfil de
      // empresa, redes sociales, etc.) separadas por comas. Solo se
      // interpreta así cuando el negocio SÍ tiene link principal (columna
      // B); si no tiene link, la columna H se usa como descripción (ver
      // abajo) en vez de como lista de links.
      const perfiles = url
        ? (campos[7] || '').split(',').map(p => p.trim()).filter(p => p)
        : [];
      // Columna I: foto que se muestra arriba en el submenú "Ver negocio" (link de imgbb)
      const imagen = campos[8] || '';
      // Columna H, cuando el negocio NO tiene link principal (columna B
      // vacía): en vez de leerse como "links adicionales", se usa como
      // texto de descripción para el submenú "Ver negocio" (por ejemplo,
      // negocios sin ninguna forma de contacto: recicladoras, oficinas de
      // gobierno, etc.). El marcador se ve igual de "activo" con o sin
      // link: lo único que cambia es que aquí no hay botones de link.
      const descripcion = !url ? (campos[7] || '') : '';
      // Columna J: nombre/etiqueta que aparece en el botón de cada link,
      // en el mismo orden que Link (B) + Links adicionales (H)
      const etiquetas = (campos[9] || '')
        .split(',')
        .map(e => e.trim());
      // Columna K: color propio de cada "sub negocio" (otros negocios/
      // empresas del mismo marcador), en el mismo orden que los links
      // adicionales (H). Si viene vacío para alguno, ese negocio usa el
      // color de su categoría (columna L) en vez de un color propio.
      const subColores = (campos[10] || '')
        .split(',')
        .map(c => c.trim());
      // Columna L: categoría de cada "sub negocio" (otros negocios/empresas
      // del mismo marcador), en el mismo orden que los links adicionales (H)
      const subCategorias = (campos[11] || '')
        .split(',')
        .map(c => formatearCategoria(c.trim()));
      return {
        id: 'h' + numeroHoja + '-fila-' + i,
        hoja: numeroHoja,
        nombre: campos[0] || '',
        url: url,
        categoria: categoria,
        categoriasBusqueda: categoriasBusqueda,
        emoji: campos[3] || '',
        color: campos[4] || '#1a73e8',
        lat: lat,
        lng: lng,
        perfiles: perfiles,
        imagen: imagen,
        descripcion: descripcion,
        etiquetas: etiquetas,
        subCategorias: subCategorias,
        subColores: subColores,
        // "tieneLink": si hay un link principal en la columna B. Ya NO
        // decide el aspecto del marcador (todos se ven igual, con color y
        // emoji): solo decide si la columna H se interpreta como "links
        // adicionales" o como "descripción", y si el panel "Ver negocio"
        // muestra botones de link o solo la descripción.
        tieneLink: !!url
      };
    })
    .filter(n => n.nombre && !isNaN(n.lat) && !isNaN(n.lng));
}

function crearIcono(n) {
  // Todos los marcadores se ven igual (color + emoji), tengan o no un
  // link principal: hay negocios (recicladoras, oficinas de gobierno,
  // etc.) que nunca van a tener una forma de contacto propia, y aun así
  // deben verse como cualquier otro negocio en el mapa.
  //
  // El color de la categoría (si ya tiene uno permanente asignado) manda
  // sobre el color guardado en la hoja, para que cambiar el color de una
  // categoría desde "🎨 Categorías y colores" repinte todos sus
  // marcadores sin tener que editar la hoja.
  const color = obtenerColorCategoria(n.categoria) || n.color || '#1a73e8';
  return L.divIcon({
    className: '',
    html: `<div class="marker-activo" style="background:${color}"><span>${n.emoji || '📍'}</span></div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38]
  });
}

// Une el link principal (B) y los links adicionales (H) en una sola
// lista, emparejando cada uno con su etiqueta de la columna J, su
// color propio de la columna K (si tiene) y su categoría (la del
// negocio principal, o la de la columna L para cada "sub negocio" /
// "otro negocio o empresa")
function obtenerLinksNegocio(n) {
  const links = [];
  if (n.url) {
    links.push({
      url: n.url,
      etiqueta: (n.etiquetas && n.etiquetas[0]) || '',
      categoria: n.categoria || '',
      esPrincipal: true
    });
  }
  (n.perfiles || []).forEach((p, idx) => {
    links.push({
      url: p,
      etiqueta: (n.etiquetas && n.etiquetas[idx + 1]) || '',
      categoria: (n.subCategorias && n.subCategorias[idx]) || '',
      color: (n.subColores && n.subColores[idx]) || '',
      esPrincipal: false
    });
  });
  return links;
}

function limpiarMarcadoresDelMapa() {
  Object.values(referencias).forEach(ref => {
    if (ref.marker) map.removeLayer(ref.marker);
  });
  for (const k in referencias) delete referencias[k];
}

// Filtro activo por hoja: null = mostrar todos los negocios; un número
// (1, 2 o 3) = mostrar solo los de esa hoja (usado por "🌐 Páginas web
// de Polo", que filtra a la Hoja 1). Se puede quitar con "🗺️ Mostrar todo".
let filtroHojaActual = null;
// Al abrir la página, el filtro de tipo de negocio activo por
// defecto es "Plazas" (se puede quitar tocando su chip de nuevo o
// con "✖️ Quitar filtro").
let filtroCategoriaActual = 'Plazas';

function negociosVisibles() {
  let lista = filtroHojaActual ? negocios.filter(n => n.hoja === filtroHojaActual) : negocios;
  if (filtroCategoriaActual) {
    lista = lista.filter(n => (n.categoria || '') === filtroCategoriaActual);
  }
  return lista;
}

function dibujarNegociosEnMapa() {
  limpiarMarcadoresDelMapa();
  negociosVisibles().forEach(n => {
    const marker = L.marker([n.lat, n.lng], { icon: crearIcono(n) }).addTo(map);
    // Antes esto abría un popup de Leaflet con un botón "Ver negocio"
    // que, al presionarlo, abría este mismo panel — un paso de más.
    // Ahora el clic en el marcador abre el panel directamente.
    marker.on('click', () => abrirPanelNegocio(n.id));
    referencias[n.id] = { marker };
  });
}

function renderListaMarcadores() {
  listaMarcadores.innerHTML = '';
  const visibles = negociosVisibles();

  if (visibles.length === 0) {
    const vacio = document.createElement('div');
    vacio.className = 'vacio';
    vacio.textContent = negocios.length === 0
      ? 'Aún no hay negocios cargados desde tu hoja.'
      : 'No hay negocios con este filtro.';
    listaMarcadores.appendChild(vacio);
    return;
  }

  visibles.forEach(n => {
    const fila = document.createElement('div');
    fila.className = 'marcador-casilla';

    const nombreSpan = document.createElement('div');
    nombreSpan.className = 'nombre-btn';
    nombreSpan.textContent = n.nombre;

    const btnUbicar = document.createElement('button');
    btnUbicar.className = 'btn-ubicar';
    btnUbicar.textContent = 'Ubicar';
    btnUbicar.addEventListener('click', () => {
      map.flyTo([n.lat, n.lng], 17);
      abrirPanelNegocio(n.id);
      sidebar.classList.remove('abierto');
    });

    fila.appendChild(nombreSpan);
    fila.appendChild(btnUbicar);
    listaMarcadores.appendChild(fila);
  });
}

async function cargarUnaHoja(hoja) {
  // se agrega un parámetro cambiante para evitar que el navegador
  // o Google entreguen una versión vieja guardada en caché
  const urlSinCache = `${urlCsvHoja(hoja)}&_=${Date.now()}`;
  const resp = await fetch(urlSinCache, { cache: 'no-store' });
  if (!resp.ok) throw new Error('respuesta no OK (hoja ' + hoja.hoja + ')');
  const texto = await resp.text();
  return parseCSV(texto, hoja.hoja);
}

async function cargarNegociosDesdeSheet() {
  estadoCarga.textContent = 'Cargando negocios desde las hojas de Google Sheets…';
  estadoCarga.classList.remove('ok', 'error');
  try {
    const resultados = await Promise.allSettled(HOJAS.map(cargarUnaHoja));

    const combinados = [];
    let hojasConError = [];
    resultados.forEach((r, idx) => {
      if (r.status === 'fulfilled') combinados.push(...r.value);
      else hojasConError.push(HOJAS[idx].hoja);
    });

    negocios = combinados;
    inicializarColoresCategoriaDesdeDatos();
    dibujarNegociosEnMapa();
    renderListaMarcadores();
    renderListaCategoriasMarcadores();
    renderCategorias();
    renderResultadosBuscar();
    renderFiltroTipoNegocio();
    actualizarCajaFiltroActivo();

    if (hojasConError.length === 0) {
      estadoCarga.textContent = `${negocios.length} lugar(es) cargado(s) de todas las hojas.`;
      estadoCarga.classList.add('ok');
    } else {
      estadoCarga.textContent = `${negocios.length} lugar(es) cargado(s). No se pudo leer la hoja ${hojasConError.join(', ')} (revisa que esté compartida como "Cualquiera con el enlace - Lector").`;
      estadoCarga.classList.add('error');
    }
  } catch (e) {
    estadoCarga.textContent = 'No se pudieron leer las hojas. Revisa que estén compartidas como "Cualquiera con el enlace - Lector".';
    estadoCarga.classList.add('error');
  }
}

// Aplica el filtro "🌐 Páginas web de Polo" (Hoja 1: los negocios a los
// que ya se les creó una página web) o lo quita con "🗺️ Mostrar todo".
function aplicarFiltroHoja(hoja) {
  filtroHojaActual = hoja;
  dibujarNegociosEnMapa();
  renderListaMarcadores();
  btnFiltroPoloWeb.classList.toggle('activo', filtroHojaActual === 1);

  const visibles = negociosVisibles();
  estadoCarga.classList.remove('ok', 'error');
  estadoCarga.textContent = filtroHojaActual === 1
    ? `${visibles.length} página(s) web de Polo mostrada(s).`
    : `${visibles.length} lugar(es) mostrado(s) en total.`;
  estadoCarga.classList.add('ok');
}

/* =========================================================
   FILTRO POR TIPO DE NEGOCIO (botón 🔍 a la izquierda de Compartir)
   -----------------------------------------------------------
   Panel rápido, independiente del menú lateral, que deja filtrar
   los marcadores del mapa por categoría (tipo de negocio). Se
   puede combinar con el filtro de hoja ("🌐 Páginas web de Polo").
   ========================================================= */
const btnFiltroTipoNegocio = document.getElementById('btnFiltroTipoNegocio');
const panelFiltroTipoNegocio = document.getElementById('panelFiltroTipoNegocio');
const inputFiltroTipoNegocio = document.getElementById('inputFiltroTipoNegocio');
const listaFiltroTipoNegocio = document.getElementById('listaFiltroTipoNegocio');
const btnQuitarFiltroTipoNegocio = document.getElementById('btnQuitarFiltroTipoNegocio');

function renderFiltroTipoNegocio() {
  const termino = normalizarTexto(inputFiltroTipoNegocio.value.trim());
  let categorias = categoriasConocidas();

  if (termino) {
    categorias = categorias.filter(c => normalizarTexto(c).includes(termino));
  }

  if (categorias.length === 0) {
    listaFiltroTipoNegocio.innerHTML = '<div class="vacio">No hay tipos de negocio con ese nombre.</div>';
    return;
  }

  listaFiltroTipoNegocio.innerHTML = categorias.map(cat => `
    <button type="button" class="chip-tipo-negocio${cat === filtroCategoriaActual ? ' activa' : ''}" data-cat="${cat}">${cat}</button>
  `).join('');
}

// Recuadro central (arriba del mapa) que muestra el nombre del
// filtro de tipo de negocio activo en este momento. Si no hay
// ninguno activo (se quitó con "✖️ Quitar filtro" o "🗺️ Mostrar
// todo"), muestra un texto genérico en vez de dejarlo vacío.
const cajaFiltroActivo = document.getElementById('cajaFiltroActivo');
const textoFiltroActivo = document.getElementById('textoFiltroActivo');

// Color de fondo (dentro del borde negro) según el TIPO de negocio,
// para reconocerlo de un vistazo: verde para plazas/parques, café
// para cafeterías, blanco para hospitales, azul para gobierno/policía,
// rojo para bomberos/carnicerías/ferreterías, azul claro para
// papelerías/veterinarias, amarillo para cerrajerías, etc. Se busca
// por coincidencia de palabra dentro del nombre de la categoría (sin
// acentos ni mayúsculas), así que "Cafetería", "Cafeterías y postres"
// o "Café internet" caen todas en el mismo color. Si la categoría no
// coincide con ningún grupo, se usa el café claro de siempre.
const COLOR_CAJA_FILTRO_POR_DEFECTO = 'linear-gradient(180deg, #f2e1c7, #e6cda3)';
const COLORES_CAJA_FILTRO_POR_TIPO = [
  { patrones: ['plaza', 'jardin', 'parque'], color: 'linear-gradient(180deg, #c9edbf, #a9dd9c)' },
  { patrones: ['cafe', 'cafeteria'], color: COLOR_CAJA_FILTRO_POR_DEFECTO },
  { patrones: ['hospital', 'clinica', 'consultorio', 'farmacia', 'salud'], color: 'linear-gradient(180deg, #ffffff, #f1f1f1)' },
  { patrones: ['policia', 'gobierno', 'ayuntamiento', 'municipio'], color: 'linear-gradient(180deg, #b8d4f5, #9bc0ec)' },
  { patrones: ['bombero'], color: 'linear-gradient(180deg, #f7b3b3, #f19999)' },
  { patrones: ['carniceria'], color: 'linear-gradient(180deg, #f2b0b0, #e99a9a)' },
  { patrones: ['papeleria'], color: 'linear-gradient(180deg, #bfe0f5, #9fcdee)' },
  { patrones: ['ferreteria'], color: 'linear-gradient(180deg, #f0a8a8, #e88f8f)' },
  { patrones: ['veterinaria'], color: 'linear-gradient(180deg, #bfe0f5, #9fcdee)' },
  { patrones: ['cerrajeria'], color: 'linear-gradient(180deg, #f7e28a, #f0d566)' },
];

function colorCajaFiltroActivo(categoria) {
  if (!categoria) return COLOR_CAJA_FILTRO_POR_DEFECTO;
  const texto = normalizarTexto(categoria);
  const grupo = COLORES_CAJA_FILTRO_POR_TIPO.find(g => g.patrones.some(p => texto.includes(p)));
  return grupo ? grupo.color : COLOR_CAJA_FILTRO_POR_DEFECTO;
}

function actualizarCajaFiltroActivo() {
  if (!textoFiltroActivo) return;
  textoFiltroActivo.textContent = filtroCategoriaActual || 'Todos los lugares';
  // El color se pone en línea (no por clase CSS) para que, sin
  // importar si el modo oscuro está activo o no, este recuadro
  // siempre se vea con el color de su tipo de negocio: un estilo en
  // línea siempre gana sobre las reglas "body.modo-oscuro
  // #cajaFiltroActivo" del CSS.
  if (cajaFiltroActivo) {
    cajaFiltroActivo.style.background = colorCajaFiltroActivo(filtroCategoriaActual);
    cajaFiltroActivo.style.color = '#2b2f36';
  }
}

function aplicarFiltroCategoria(categoria) {
  filtroCategoriaActual = categoria;
  dibujarNegociosEnMapa();
  renderListaMarcadores();
  renderFiltroTipoNegocio();
  actualizarCajaFiltroActivo();
  btnFiltroTipoNegocio.classList.toggle('activo', !!filtroCategoriaActual);

  const visibles = negociosVisibles();
  estadoCarga.classList.remove('ok', 'error');
  estadoCarga.textContent = filtroCategoriaActual
    ? `${visibles.length} lugar(es) de "${filtroCategoriaActual}" mostrado(s).`
    : `${visibles.length} lugar(es) mostrado(s) en total.`;
  estadoCarga.classList.add('ok');
}

btnFiltroTipoNegocio.addEventListener('click', () => {
  panelFiltroTipoNegocio.classList.toggle('abierto');
  if (panelFiltroTipoNegocio.classList.contains('abierto')) {
    renderFiltroTipoNegocio();
    inputFiltroTipoNegocio.focus();
  }
});

document.addEventListener('click', (e) => {
  if (!panelFiltroTipoNegocio.classList.contains('abierto')) return;
  if (panelFiltroTipoNegocio.contains(e.target) || e.target === btnFiltroTipoNegocio) return;
  panelFiltroTipoNegocio.classList.remove('abierto');
});

inputFiltroTipoNegocio.addEventListener('input', renderFiltroTipoNegocio);

listaFiltroTipoNegocio.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip-tipo-negocio');
  if (!chip) return;
  const cat = chip.dataset.cat;
  aplicarFiltroCategoria(filtroCategoriaActual === cat ? null : cat);
});

btnQuitarFiltroTipoNegocio.addEventListener('click', () => {
  inputFiltroTipoNegocio.value = '';
  aplicarFiltroCategoria(null);
});

/* =========================================================
   PANEL "VER NEGOCIO" (submenú abierto desde el popup del mapa)
   ========================================================= */
const overlayNegocio = document.getElementById('overlayNegocio');
const imgPanelNegocio = document.getElementById('imgPanelNegocio');
const imgPanelNegocioVacia = document.getElementById('imgPanelNegocioVacia');
const nombrePanelNegocio = document.getElementById('nombrePanelNegocio');
const listaLinksPanelNegocio = document.getElementById('listaLinksPanelNegocio');
const btnCerrarPanelNegocio = document.getElementById('btnCerrarPanelNegocio');
const btnConfigNegocio = document.getElementById('btnConfigNegocio');

let negocioAbiertoId = null;

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto || '';
  return div.innerHTML;
}

function abrirPanelNegocio(id) {
  const n = negocios.find(x => x.id === id);
  if (!n) return;
  negocioAbiertoId = id;

  if (n.imagen) {
    imgPanelNegocio.src = n.imagen;
    imgPanelNegocio.style.display = 'block';
    imgPanelNegocioVacia.style.display = 'none';
  } else {
    imgPanelNegocio.style.display = 'none';
    imgPanelNegocioVacia.style.display = 'flex';
  }

  nombrePanelNegocio.textContent = n.nombre;

  // Si el negocio tiene links (principal y/o adicionales), se muestran
  // como botones normales. Si no tiene ningún link (negocios sin forma
  // de contacto propia: recicladoras, oficinas de gobierno, etc.), se
  // muestra la descripción (columna H) en su lugar.
  const links = obtenerLinksNegocio(n);
  if (links.length) {
    listaLinksPanelNegocio.innerHTML = renderListaLinksNegocio(n, links);
  } else if (n.descripcion) {
    listaLinksPanelNegocio.innerHTML = `<div class="descripcion-panel-negocio">${escaparHtml(n.descripcion)}</div>`;
  } else {
    listaLinksPanelNegocio.innerHTML = '<div class="etiqueta-link">Este negocio aún no tiene links.</div>';
  }

  overlayNegocio.classList.add('abierto');
}

// Dibuja el negocio principal (primer link) y, debajo, un separador
// "Otros Negocios/Empresas" con el resto de los negocios del mismo
// marcador, un poco separados visualmente pero agrupados para que se
// note que son de la misma persona. Cada uno (menos el principal)
// tiene un botón ⚙️ para elegirle su categoría.
function renderListaLinksNegocio(n, links) {
  const principal = links[0];
  const otros = links.slice(1);

  let html = cajaLinkHtml(principal, 0, true);

  if (otros.length) {
    html += `
      <div class="separador-otros-negocios">
        <span class="titulo-separador">Otros Negocios/Empresas</span>
        <span class="subtitulo-separador">Mismo dueño, distintos servicios</span>
      </div>
      <div class="contenedor-otros-negocios">
        ${otros.map((l, idx) => cajaLinkHtml(l, idx, false)).join('')}
      </div>`;
  }

  return html;
}

function cajaLinkHtml(l, indiceSub, esPrincipal) {
  // El color propio del negocio (columna K) manda sobre el color de su
  // categoría; si no tiene ninguno de los dos, se muestra un punto gris.
  const color = l.color || obtenerColorCategoria(l.categoria);
  const tituloPunto = l.color
    ? 'Color propio de este negocio'
    : (l.categoria || 'Sin categoría ni color asignado');
  const punto = esPrincipal
    ? ''
    : `<span class="punto-categoria" style="background:${color || '#c7cbd1'}" title="${tituloPunto}"></span>`;
  const gear = esPrincipal
    ? ''
    : `<button type="button" class="btn-gear-subnegocio" title="Elegir categoría de este negocio" onclick="abrirSelectorCategoriaSub('${negocioAbiertoId}', ${indiceSub})">⚙️</button>`;

  return `
    <div class="caja-link ${esPrincipal ? 'principal' : 'secundario'}">
      <a class="btn-visitar-link" href="${l.url}" target="_blank" rel="noopener">${punto}${l.etiqueta || 'Visitar página'}</a>
      ${gear}
    </div>`;
}

function cerrarPanelNegocio() {
  overlayNegocio.classList.remove('abierto');
}

btnCerrarPanelNegocio.addEventListener('click', cerrarPanelNegocio);
overlayNegocio.addEventListener('click', (e) => {
  if (e.target === overlayNegocio) cerrarPanelNegocio();
});

btnConfigNegocio.addEventListener('click', () => {
  if (!negocioAbiertoId) return;
  // Ahora todos los negocios (tengan o no un link principal) abren el
  // mismo panel completo de configuración: pueden editar categoría,
  // emoji, color, links y su descripción por igual.
  abrirModalEditarNegocio(negocioAbiertoId);
});

/* =========================================================
   MODAL "CONFIGURACIÓN" (editar los datos de un negocio existente)
   ========================================================= */
const overlayEditarNegocio = document.getElementById('overlayEditarNegocio');
const inpEditLat = document.getElementById('inpEditLat');
const inpEditLng = document.getElementById('inpEditLng');
const inpEditNombre = document.getElementById('inpEditNombre');
const inpEditHoja = document.getElementById('inpEditHoja');
const inpEditCategoria = document.getElementById('inpEditCategoria');
const inpEditEmoji = document.getElementById('inpEditEmoji');
const inpEditColor = document.getElementById('inpEditColor');
const notaColorPrincipalEdit = document.getElementById('notaColorPrincipalEdit');
const inpEditImagen = document.getElementById('inpEditImagen');
const listaLinksEditables = document.getElementById('listaLinksEditables');
const btnAnadirLink = document.getElementById('btnAnadirLink');
const filaCopiarNegocio = document.getElementById('filaCopiarNegocio');
const avisoCopiadoNegocio = document.getElementById('avisoCopiadoNegocio');
const btnCopiarFilaNegocio = document.getElementById('btnCopiarFilaNegocio');
const btnCerrarEditarNegocio = document.getElementById('btnCerrarEditarNegocio');
const panelEmojisEdit = document.getElementById('panelEmojisEdit');
const inpEditDescripcionOpcional = document.getElementById('inpEditDescripcionOpcional');
const btnSubirImagenEdit = document.getElementById('btnSubirImagenEdit');
const inpArchivoImagenEdit = document.getElementById('inpArchivoImagenEdit');
const estadoSubidaImagenEdit = document.getElementById('estadoSubidaImagenEdit');
const btnGuardarDirectoNegocio = document.getElementById('btnGuardarDirectoNegocio');

// Base64 (.webp) de una imagen nueva elegida desde el modal de edición
// (si el usuario no elige ninguna, "Guardar cambios en la hoja" manda
// vacío y el Apps Script conserva la imagen que ya estaba en la hoja).
let imagenBase64ElegidaEdit = null;

let contadorFilaLink = 0;

function crearFilaLinkEditable(url, etiqueta, categoria, esPrincipal, color) {
  contadorFilaLink++;
  const fila = document.createElement('div');
  fila.className = 'fila-link-editable';
  fila.dataset.id = 'link-edit-' + contadorFilaLink;
  fila.dataset.principal = esPrincipal ? '1' : '0';
  const tieneColorPropio = !esPrincipal && !!color;
  fila.innerHTML = `
    <input type="text" class="inp-etiqueta-link" placeholder="Nombre que se mostrará en el botón (ej. Facebook, Catálogo)" value="${etiqueta || ''}">
    <input type="url" class="inp-url-link" placeholder="https://..." value="${url || ''}">
    ${esPrincipal ? '' : `<input type="text" class="inp-categoria-link" placeholder="Categoría de este negocio (ej. Farmacia, Clases de baile…)" value="${categoria || ''}">`}
    ${esPrincipal ? '' : `
    <div class="fila-color-link">
      <label class="chk-color-propio">
        <input type="checkbox" class="chk-usar-color-link" ${tieneColorPropio ? 'checked' : ''}>
        Color propio para este negocio
      </label>
      <input type="color" class="inp-color-link" value="${color || '#1a73e8'}" ${tieneColorPropio ? '' : 'disabled'}>
    </div>`}
    <button type="button" class="btn-quitar-link">✕ Quitar link</button>
  `;
  fila.querySelector('.btn-quitar-link').addEventListener('click', () => {
    fila.remove();
    actualizarFilaCopiarNegocio();
  });
  const chkColor = fila.querySelector('.chk-usar-color-link');
  const inpColorLink = fila.querySelector('.inp-color-link');
  if (chkColor && inpColorLink) {
    chkColor.addEventListener('change', () => {
      inpColorLink.disabled = !chkColor.checked;
      actualizarFilaCopiarNegocio();
    });
  }
  fila.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', actualizarFilaCopiarNegocio);
  });
  listaLinksEditables.appendChild(fila);
}

btnAnadirLink.addEventListener('click', () => {
  crearFilaLinkEditable('', '', '', false, '');
  actualizarFilaCopiarNegocio();
});

function abrirModalEditarNegocio(id) {
  const n = negocios.find(x => x.id === id);
  if (!n) return;

  inpEditLat.value = n.lat;
  inpEditLng.value = n.lng;
  inpEditNombre.value = n.nombre;
  inpEditHoja.value = NOMBRES_HOJA[n.hoja] || ('Hoja ' + n.hoja);
  inpEditCategoria.value = n.categoria || '';
  inpEditEmoji.value = n.emoji;
  inpEditColor.value = n.color || '#1a73e8';
  inpEditImagen.value = n.imagen || '';
  inpEditDescripcionOpcional.value = n.descripcion || '';
  imagenBase64ElegidaEdit = null;
  estadoSubidaImagenEdit.textContent = '';

  listaLinksEditables.innerHTML = '';
  const links = obtenerLinksNegocio(n);
  if (links.length) {
    links.forEach(l => crearFilaLinkEditable(l.url, l.etiqueta, l.categoria, l.esPrincipal, l.color));
  } else {
    crearFilaLinkEditable('', '', '', true, '');
  }

  panelEmojisEdit.classList.remove('abierto');
  avisoCopiadoNegocio.textContent = '';
  actualizarNotaColor(inpEditCategoria, inpEditColor, notaColorPrincipalEdit);
  actualizarFilaCopiarNegocio();
  overlayEditarNegocio.classList.add('abierto');
}

function cerrarModalEditarNegocio() {
  overlayEditarNegocio.classList.remove('abierto');
}

function actualizarFilaCopiarNegocio() {
  const filasLink = Array.from(listaLinksEditables.querySelectorAll('.fila-link-editable'));
  // Nos quedamos solo con las filas que sí tienen link, para no
  // desalinear links/etiquetas/categorías entre sí
  const filasConUrl = filasLink.filter(f => f.querySelector('.inp-url-link').value.trim());
  const urls = filasConUrl.map(f => f.querySelector('.inp-url-link').value.trim());
  const etiquetas = filasConUrl.map(f => f.querySelector('.inp-etiqueta-link').value.trim());
  // Las categorías y los colores propios de "sub negocios" solo existen
  // en las filas que no son la principal (la principal usa el campo
  // Categoría / Color de arriba)
  const filasSub = filasConUrl.filter(f => f.dataset.principal !== '1');
  const categoriasSub = filasSub.map(f => {
    const campo = f.querySelector('.inp-categoria-link');
    return campo ? campo.value.trim() : '';
  });
  const coloresSub = filasSub.map(f => {
    const chk = f.querySelector('.chk-usar-color-link');
    const campo = f.querySelector('.inp-color-link');
    return (chk && chk.checked && campo) ? campo.value.trim() : '';
  });

  const linkPrincipal = urls[0] || '';
  // Columna H: si hay al menos un link, es la lista de links
  // adicionales; si no hay ningún link, se usa la descripción en su
  // lugar (negocios sin ninguna forma de contacto propia).
  const linksAdicionales = urls.length
    ? urls.slice(1).join(',')
    : inpEditDescripcionOpcional.value.trim();

  const partes = [
    inpEditNombre.value.trim(),
    linkPrincipal,
    inpEditCategoria.value.trim(),
    inpEditEmoji.value.trim(),
    inpEditColor.value,
    inpEditLat.value,
    inpEditLng.value,
    linksAdicionales,
    inpEditImagen.value.trim(),
    etiquetas.join(','),
    coloresSub.join(','),
    categoriasSub.join(',')
  ];
  filaCopiarNegocio.textContent = `[${inpEditHoja.value}]  ${partes.join('   |   ')}`;
  return partes.join('\t');
}

[inpEditNombre, inpEditEmoji, inpEditImagen, inpEditDescripcionOpcional].forEach(campo => {
  campo.addEventListener('input', actualizarFilaCopiarNegocio);
});

inpEditCategoria.addEventListener('input', () => {
  actualizarNotaColor(inpEditCategoria, inpEditColor, notaColorPrincipalEdit);
  actualizarFilaCopiarNegocio();
});

inpEditColor.addEventListener('input', actualizarFilaCopiarNegocio);

btnCerrarEditarNegocio.addEventListener('click', cerrarModalEditarNegocio);
overlayEditarNegocio.addEventListener('click', (e) => {
  if (e.target === overlayEditarNegocio) cerrarModalEditarNegocio();
});

btnCopiarFilaNegocio.addEventListener('click', async () => {
  // Si la categoría principal es nueva, el color elegido aquí se
  // vuelve su color permanente a partir de ahora
  const catNueva = inpEditCategoria.value.trim();
  if (catNueva && !obtenerColorCategoria(catNueva)) {
    fijarColorCategoria(catNueva, inpEditColor.value);
  }
  const filaTexto = actualizarFilaCopiarNegocio();
  try {
    await navigator.clipboard.writeText(filaTexto);
    avisoCopiadoNegocio.textContent = `¡Copiado! Pega esta línea sobre la fila del negocio en ${inpEditHoja.value} (Ctrl/Cmd + V).`;
  } catch (e) {
    avisoCopiadoNegocio.textContent = 'No se pudo copiar automático: selecciona el texto de arriba y cópialo manualmente.';
  }
});

btnSubirImagenEdit.addEventListener('click', () => inpArchivoImagenEdit.click());

inpArchivoImagenEdit.addEventListener('change', async () => {
  const archivo = inpArchivoImagenEdit.files[0];
  inpArchivoImagenEdit.value = '';
  if (!archivo) return;

  estadoSubidaImagenEdit.textContent = '⏳ Convirtiendo a .webp…';
  btnSubirImagenEdit.disabled = true;
  try {
    imagenBase64ElegidaEdit = await convertirArchivoAWebpBase64(archivo);
    estadoSubidaImagenEdit.textContent = `✅ "${archivo.name}" lista — se sube al presionar "Guardar cambios en la hoja".`;
  } catch (err) {
    console.error(err);
    imagenBase64ElegidaEdit = null;
    estadoSubidaImagenEdit.textContent = '❌ No se pudo preparar la imagen: ' + err.message;
  } finally {
    btnSubirImagenEdit.disabled = false;
  }
});

/* =========================================================
   GUARDAR CAMBIOS DIRECTO EN LA HOJA (editar negocio existente)
   -----------------------------------------------------------
   Igual que "💾 Guardar directo en la hoja" del modal "Nuevo
   marcador", pero manda accion:'actualizar' junto con el número
   de fila (calculado con filaSheetDeNegocio), así el Apps Script
   sobrescribe esa fila en vez de agregar una nueva.
   ========================================================= */
btnGuardarDirectoNegocio.addEventListener('click', async () => {
  const n = negocios.find(x => x.id === negocioAbiertoId);
  if (!n) return;

  const fila = filaSheetDeNegocio(n.id);
  if (!fila) {
    avisoCopiadoNegocio.textContent = '❌ No se pudo calcular la fila de este negocio en la hoja.';
    return;
  }

  const usuario = window.firebaseAuth && window.firebaseAuth.currentUser;
  if (!usuario) {
    avisoCopiadoNegocio.textContent = 'Debes iniciar sesión con una cuenta autorizada para guardar directo.';
    return;
  }

  // Si la categoría principal es nueva, el color elegido aquí se
  // vuelve su color permanente a partir de ahora
  const catNueva = inpEditCategoria.value.trim();
  if (catNueva && !obtenerColorCategoria(catNueva)) {
    fijarColorCategoria(catNueva, inpEditColor.value);
  }

  actualizarFilaCopiarNegocio(); // por si acaso, deja la vista previa al día

  const filasLink = Array.from(listaLinksEditables.querySelectorAll('.fila-link-editable'));
  const filasConUrl = filasLink.filter(f => f.querySelector('.inp-url-link').value.trim());
  const urls = filasConUrl.map(f => f.querySelector('.inp-url-link').value.trim());
  const etiquetas = filasConUrl.map(f => f.querySelector('.inp-etiqueta-link').value.trim());
  const filasSub = filasConUrl.filter(f => f.dataset.principal !== '1');
  const categoriasSub = filasSub.map(f => {
    const campo = f.querySelector('.inp-categoria-link');
    return campo ? campo.value.trim() : '';
  });
  const coloresSub = filasSub.map(f => {
    const chk = f.querySelector('.chk-usar-color-link');
    const campo = f.querySelector('.inp-color-link');
    return (chk && chk.checked && campo) ? campo.value.trim() : '';
  });
  const linkPrincipal = urls[0] || '';
  const linksAdicionales = urls.length
    ? urls.slice(1).join(',')
    : inpEditDescripcionOpcional.value.trim();

  btnGuardarDirectoNegocio.disabled = true;
  avisoCopiadoNegocio.textContent = '⏳ Guardando cambios en la hoja…';
  try {
    const idToken = await usuario.getIdToken();
    const resp = await fetch(APPSCRIPT_GUARDAR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        idToken: idToken,
        accion: 'actualizar',
        gid: gidDeHoja(n.hoja),
        fila: fila,
        nombre: inpEditNombre.value.trim(),
        url: linkPrincipal,
        categoria: inpEditCategoria.value.trim(),
        emoji: inpEditEmoji.value.trim(),
        color: inpEditColor.value,
        lat: inpEditLat.value,
        lng: inpEditLng.value,
        descripcion: linksAdicionales,
        imagenUrl: inpEditImagen.value.trim(),
        imagenBase64: imagenBase64ElegidaEdit || '',
        etiquetasLinks: etiquetas.join(','),
        coloresExtra: coloresSub.join(','),
        categoriasSub: categoriasSub.join(',')
      })
    });
    const datos = await resp.json();
    if (!datos.ok) throw new Error(datos.error || 'Error desconocido al guardar.');

    if (datos.imagen) inpEditImagen.value = datos.imagen;
    imagenBase64ElegidaEdit = null;
    estadoSubidaImagenEdit.textContent = '';
    avisoCopiadoNegocio.textContent = `✅ ¡Guardado! Se actualizó la fila ${datos.fila} en tu hoja.`;
    await cargarNegociosDesdeSheet(); // refresca el mapa con los cambios
  } catch (err) {
    console.error(err);
    avisoCopiadoNegocio.textContent = '❌ No se pudo guardar: ' + err.message;
  } finally {
    btnGuardarDirectoNegocio.disabled = false;
  }
});

/* =========================================================
   MODAL "CONFIGURACIÓN" para negocios sin link (punto gris):
   solo nombre, descripción (columna H) e imagen (columna I).
   ========================================================= */
const overlayEditarNegocioInactivo = document.getElementById('overlayEditarNegocioInactivo');
const inpEditHojaInactivo = document.getElementById('inpEditHojaInactivo');
const inpEditNombreInactivo = document.getElementById('inpEditNombreInactivo');
const inpEditDescripcionInactivo = document.getElementById('inpEditDescripcionInactivo');
const inpEditImagenInactivo = document.getElementById('inpEditImagenInactivo');
const filaCopiarNegocioInactivo = document.getElementById('filaCopiarNegocioInactivo');
const avisoCopiadoNegocioInactivo = document.getElementById('avisoCopiadoNegocioInactivo');
const btnCopiarFilaNegocioInactivo = document.getElementById('btnCopiarFilaNegocioInactivo');
const btnCerrarEditarNegocioInactivo = document.getElementById('btnCerrarEditarNegocioInactivo');
const btnSubirImagenInactivo = document.getElementById('btnSubirImagenInactivo');
const inpArchivoImagenInactivo = document.getElementById('inpArchivoImagenInactivo');
const estadoSubidaImagenInactivo = document.getElementById('estadoSubidaImagenInactivo');
const btnGuardarDirectoNegocioInactivo = document.getElementById('btnGuardarDirectoNegocioInactivo');

let negocioEditandoInactivoId = null;

// Base64 (.webp) de una imagen nueva elegida desde este modal (si el
// usuario no elige ninguna, se conserva la imagen que ya estaba).
let imagenBase64ElegidaEditInactivo = null;

function abrirModalEditarNegocioInactivo(id) {
  const n = negocios.find(x => x.id === id);
  if (!n) return;
  negocioEditandoInactivoId = id;

  inpEditHojaInactivo.value = NOMBRES_HOJA[n.hoja] || ('Hoja ' + n.hoja);
  inpEditNombreInactivo.value = n.nombre;
  inpEditDescripcionInactivo.value = n.descripcion || '';
  inpEditImagenInactivo.value = n.imagen || '';
  imagenBase64ElegidaEditInactivo = null;
  estadoSubidaImagenInactivo.textContent = '';

  avisoCopiadoNegocioInactivo.textContent = '';
  actualizarFilaCopiarNegocioInactivo();
  overlayEditarNegocioInactivo.classList.add('abierto');
}

function cerrarModalEditarNegocioInactivo() {
  overlayEditarNegocioInactivo.classList.remove('abierto');
}

// Arma la fila completa (mismas 12 columnas que el resto de la hoja)
// para copiar y pegar sobre la fila del negocio: conserva los valores
// que no se editan aquí (categoría, emoji, color, lat/lng, etc.) y
// solo actualiza Nombre (A), Descripción (H) e Imagen (I).
function actualizarFilaCopiarNegocioInactivo() {
  const n = negocios.find(x => x.id === negocioEditandoInactivoId);
  if (!n) return '';
  const partes = [
    inpEditNombreInactivo.value.trim(),
    '',
    n.categoria || '',
    n.emoji || '',
    n.color || '',
    n.lat,
    n.lng,
    inpEditDescripcionInactivo.value.trim(),
    inpEditImagenInactivo.value.trim(),
    (n.etiquetas || []).join(','),
    (n.subColores || []).join(','),
    (n.subCategorias || []).join(',')
  ];
  filaCopiarNegocioInactivo.textContent = `[${inpEditHojaInactivo.value}]  ${partes.join('   |   ')}`;
  return partes.join('\t');
}

[inpEditNombreInactivo, inpEditDescripcionInactivo, inpEditImagenInactivo].forEach(campo => {
  campo.addEventListener('input', actualizarFilaCopiarNegocioInactivo);
});

btnCerrarEditarNegocioInactivo.addEventListener('click', cerrarModalEditarNegocioInactivo);
overlayEditarNegocioInactivo.addEventListener('click', (e) => {
  if (e.target === overlayEditarNegocioInactivo) cerrarModalEditarNegocioInactivo();
});

btnCopiarFilaNegocioInactivo.addEventListener('click', async () => {
  const filaTexto = actualizarFilaCopiarNegocioInactivo();
  try {
    await navigator.clipboard.writeText(filaTexto);
    avisoCopiadoNegocioInactivo.textContent = `¡Copiado! Pega esta línea sobre la fila del negocio en ${inpEditHojaInactivo.value} (Ctrl/Cmd + V).`;
  } catch (e) {
    avisoCopiadoNegocioInactivo.textContent = 'No se pudo copiar automático: selecciona el texto de arriba y cópialo manualmente.';
  }
});

btnSubirImagenInactivo.addEventListener('click', () => inpArchivoImagenInactivo.click());

inpArchivoImagenInactivo.addEventListener('change', async () => {
  const archivo = inpArchivoImagenInactivo.files[0];
  inpArchivoImagenInactivo.value = '';
  if (!archivo) return;

  estadoSubidaImagenInactivo.textContent = '⏳ Convirtiendo a .webp…';
  btnSubirImagenInactivo.disabled = true;
  try {
    imagenBase64ElegidaEditInactivo = await convertirArchivoAWebpBase64(archivo);
    estadoSubidaImagenInactivo.textContent = `✅ "${archivo.name}" lista — se sube al presionar "Guardar cambios en la hoja".`;
  } catch (err) {
    console.error(err);
    imagenBase64ElegidaEditInactivo = null;
    estadoSubidaImagenInactivo.textContent = '❌ No se pudo preparar la imagen: ' + err.message;
  } finally {
    btnSubirImagenInactivo.disabled = false;
  }
});

/* =========================================================
   GUARDAR CAMBIOS DIRECTO EN LA HOJA (negocio sin link)
   -----------------------------------------------------------
   Conserva categoría, emoji, color, lat/lng y links/etiquetas
   tal como están (este modal solo edita Nombre, Descripción e
   Imagen) y manda accion:'actualizar' con el número de fila
   calculado por filaSheetDeNegocio.
   ========================================================= */
btnGuardarDirectoNegocioInactivo.addEventListener('click', async () => {
  const n = negocios.find(x => x.id === negocioEditandoInactivoId);
  if (!n) return;

  const fila = filaSheetDeNegocio(n.id);
  if (!fila) {
    avisoCopiadoNegocioInactivo.textContent = '❌ No se pudo calcular la fila de este negocio en la hoja.';
    return;
  }

  const usuario = window.firebaseAuth && window.firebaseAuth.currentUser;
  if (!usuario) {
    avisoCopiadoNegocioInactivo.textContent = 'Debes iniciar sesión con una cuenta autorizada para guardar directo.';
    return;
  }

  btnGuardarDirectoNegocioInactivo.disabled = true;
  avisoCopiadoNegocioInactivo.textContent = '⏳ Guardando cambios en la hoja…';
  try {
    const idToken = await usuario.getIdToken();
    const resp = await fetch(APPSCRIPT_GUARDAR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        idToken: idToken,
        accion: 'actualizar',
        gid: gidDeHoja(n.hoja),
        fila: fila,
        nombre: inpEditNombreInactivo.value.trim(),
        url: '',
        categoria: n.categoria || '',
        emoji: n.emoji || '',
        color: n.color || '#1a73e8',
        lat: n.lat,
        lng: n.lng,
        descripcion: inpEditDescripcionInactivo.value.trim(),
        imagenUrl: inpEditImagenInactivo.value.trim(),
        imagenBase64: imagenBase64ElegidaEditInactivo || '',
        etiquetasLinks: (n.etiquetas || []).join(','),
        coloresExtra: (n.subColores || []).join(','),
        categoriasSub: (n.subCategorias || []).join(',')
      })
    });
    const datos = await resp.json();
    if (!datos.ok) throw new Error(datos.error || 'Error desconocido al guardar.');

    if (datos.imagen) inpEditImagenInactivo.value = datos.imagen;
    imagenBase64ElegidaEditInactivo = null;
    estadoSubidaImagenInactivo.textContent = '';
    avisoCopiadoNegocioInactivo.textContent = `✅ ¡Guardado! Se actualizó la fila ${datos.fila} en tu hoja.`;
    await cargarNegociosDesdeSheet(); // refresca el mapa con los cambios
  } catch (err) {
    console.error(err);
    avisoCopiadoNegocioInactivo.textContent = '❌ No se pudo guardar: ' + err.message;
  } finally {
    btnGuardarDirectoNegocioInactivo.disabled = false;
  }
});

/* =========================================================
   BARRA LATERAL
   ========================================================= */
const sidebar = document.getElementById('sidebar');
const btnMenu = document.getElementById('btnMenu');
const btnMarcadores = document.getElementById('btnMarcadores');
const submenuMarcadores = document.getElementById('submenuMarcadores');
const listaMarcadores = document.getElementById('listaMarcadores');
const btnFiltroPoloWeb = document.getElementById('btnFiltroPoloWeb');
const btnActualizarLista = document.getElementById('btnActualizarLista');
const btnNuevoMarcador = document.getElementById('btnNuevoMarcador');
const btnMostrarTodo = document.getElementById('btnMostrarTodo');
const avisoColocar = document.getElementById('avisoColocar');
const estadoCarga = document.getElementById('estadoCarga');

btnMenu.addEventListener('click', () => sidebar.classList.toggle('abierto'));

/* =========================================================
   COMPARTIR (botón circular + QR)
   ========================================================= */
const btnCompartir = document.getElementById('btnCompartir');
const overlayCompartir = document.getElementById('overlayCompartir');
const qrCompartir = document.getElementById('qrCompartir');
const inpEnlaceCompartir = document.getElementById('inpEnlaceCompartir');
const btnCopiarEnlaceCompartir = document.getElementById('btnCopiarEnlaceCompartir');
const avisoCopiadoCompartir = document.getElementById('avisoCopiadoCompartir');
const btnCerrarCompartir = document.getElementById('btnCerrarCompartir');
const btnCompartirNativo = document.getElementById('btnCompartirNativo');

let qrCompartirGenerado = false;

function abrirModalCompartir() {
  const enlace = window.location.href;
  inpEnlaceCompartir.value = enlace;
  avisoCopiadoCompartir.textContent = '';

  if (!qrCompartirGenerado) {
    new QRCode(qrCompartir, {
      text: enlace,
      width: 190,
      height: 190,
      colorDark: '#202124',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
    qrCompartirGenerado = true;
  }

  // En móviles con soporte para compartir nativo (WhatsApp, etc.)
  if (navigator.share) {
    btnCompartirNativo.style.display = 'block';
  }

  overlayCompartir.classList.add('abierto');
}

function cerrarModalCompartir() {
  overlayCompartir.classList.remove('abierto');
}

btnCompartir.addEventListener('click', abrirModalCompartir);
btnCerrarCompartir.addEventListener('click', cerrarModalCompartir);
overlayCompartir.addEventListener('click', (e) => {
  if (e.target === overlayCompartir) cerrarModalCompartir();
});

btnCopiarEnlaceCompartir.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(inpEnlaceCompartir.value);
    avisoCopiadoCompartir.textContent = '¡Enlace copiado!';
  } catch (e) {
    inpEnlaceCompartir.select();
    avisoCopiadoCompartir.textContent = 'No se pudo copiar automático: selecciona el texto de arriba y cópialo manualmente.';
  }
});

btnCompartirNativo.addEventListener('click', async () => {
  try {
    await navigator.share({
      title: document.title,
      url: inpEnlaceCompartir.value
    });
  } catch (e) {
    // El usuario canceló el diálogo de compartir; no hacemos nada.
  }
});
btnMarcadores.addEventListener('click', () => {
  submenuMarcadores.classList.toggle('abierto');
  if (submenuMarcadores.classList.contains('abierto')) {
    renderListaCategoriasMarcadores();
    renderListaMarcadores();
  }
});
btnActualizarLista.addEventListener('click', cargarNegociosDesdeSheet);
btnFiltroPoloWeb.addEventListener('click', () => aplicarFiltroHoja(1));

// "Mostrar todo" primero vuelve a leer las hojas de Google Sheets
// (para traer altas recientes, como un negocio que acabas de agregar)
// y después quita cualquier filtro que estuviera activo.
btnMostrarTodo.addEventListener('click', async () => {
  await cargarNegociosDesdeSheet();
  aplicarFiltroHoja(null);
  aplicarFiltroCategoria(null);
});

/* =========================================================
   BUSCAR (por nombre y por categoría, con chips de categoría)
   ========================================================= */
const btnBuscar = document.getElementById('btnBuscar');
const submenuBuscar = document.getElementById('submenuBuscar');
const inputBuscar = document.getElementById('inputBuscar');
const categoriasBuscar = document.getElementById('categoriasBuscar');
const resultadosBuscar = document.getElementById('resultadosBuscar');

let categoriaSeleccionada = null;

btnBuscar.addEventListener('click', () => {
  submenuBuscar.classList.toggle('abierto');
  if (submenuBuscar.classList.contains('abierto')) {
    renderCategorias();
    renderResultadosBuscar();
    inputBuscar.focus();
  }
});

function renderCategorias() {
  const categorias = [...new Set(
    negocios.map(n => (n.categoria || '').trim()).filter(c => c)
  )].sort((a, b) => a.localeCompare(b, 'es'));

  if (categoriaSeleccionada && !categorias.includes(categoriaSeleccionada)) {
    categoriaSeleccionada = null;
  }

  if (categorias.length === 0) {
    categoriasBuscar.innerHTML = '';
    return;
  }

  categoriasBuscar.innerHTML = categorias.map(cat => `
    <button type="button" class="chip-categoria${cat === categoriaSeleccionada ? ' activa' : ''}" data-cat="${cat}">${cat}</button>
  `).join('');
}

categoriasBuscar.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip-categoria');
  if (!chip) return;
  const cat = chip.dataset.cat;
  categoriaSeleccionada = (categoriaSeleccionada === cat) ? null : cat;
  renderCategorias();
  renderResultadosBuscar();
});

function renderResultadosBuscar() {
  const termino = normalizarTexto(inputBuscar.value.trim());

  let resultados = negocios;

  if (categoriaSeleccionada) {
    resultados = resultados.filter(n => (n.categoria || '') === categoriaSeleccionada);
  }

  if (termino) {
    resultados = resultados.filter(n => {
      // Se busca en el nombre y en TODOS los términos de la columna
      // Categoría (no solo el primero), para que escribir "Bosque"
      // encuentre un lugar cuyo filtro oficial es "Plazas" pero que
      // también tiene "Bosque" como uno de sus términos.
      const texto = normalizarTexto(
        (n.nombre || '') + ' ' + (n.categoriasBusqueda || []).join(' ')
      );
      return texto.includes(termino);
    });
  }

  if (!termino && !categoriaSeleccionada) {
    resultadosBuscar.innerHTML = '<div class="vacio">Escribe un nombre o elige una categoría para buscar.</div>';
    return;
  }

  if (resultados.length === 0) {
    resultadosBuscar.innerHTML = '<div class="vacio">No se encontraron lugares.</div>';
    return;
  }

  resultadosBuscar.innerHTML = '';
  resultados.forEach(n => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'resultado-casilla';
    boton.innerHTML = `
      <span class="resultado-emoji">${n.emoji || '📍'}</span>
      <span class="resultado-texto">
        <span class="resultado-nombre">${n.nombre}</span>
        ${n.categoria ? `<span class="resultado-categoria">${n.categoria}</span>` : ''}
      </span>`;
    boton.addEventListener('click', () => {
      map.flyTo([n.lat, n.lng], 17);
      abrirPanelNegocio(n.id);
      sidebar.classList.remove('abierto');
    });
    resultadosBuscar.appendChild(boton);
  });
}

inputBuscar.addEventListener('input', renderResultadosBuscar);

/* =========================================================
   CATEGORÍAS Y COLORES (dentro de "📍 Marcadores"; único lugar
   para cambiar el color permanente que ya tiene asignado una
   categoría)
   ========================================================= */
const listaCategoriasMarcadores = document.getElementById('listaCategoriasMarcadores');

function renderListaCategoriasMarcadores() {
  const cats = categoriasConocidas();
  if (!cats.length) {
    listaCategoriasMarcadores.innerHTML = '<div class="vacio">Aún no hay categorías guardadas.</div>';
    return;
  }
  listaCategoriasMarcadores.innerHTML = cats.map(c => {
    const color = obtenerColorCategoria(c) || '#c7cbd1';
    return `
      <div class="fila-categoria-color">
        <span class="punto-categoria" style="background:${color}"></span>
        <span class="nombre-categoria-color">${c}</span>
        <input type="color" class="input-color-categoria" data-cat="${c}" value="${color}" title="Cambiar el color permanente de ${c}">
      </div>`;
  }).join('');
}

listaCategoriasMarcadores.addEventListener('input', (e) => {
  const inp = e.target.closest('.input-color-categoria');
  if (!inp) return;
  fijarColorCategoria(inp.dataset.cat, inp.value);
  renderListaCategoriasMarcadores();
  dibujarNegociosEnMapa();
});

/* =========================================================
   MODAL: elegir la categoría de un "sub negocio" (otro
   negocio/empresa del mismo marcador), abierto con el botón
   ⚙️ de cada uno en el panel "Ver negocio"
   ========================================================= */
const overlayCategoriaSub = document.getElementById('overlayCategoriaSub');
const chipsCategoriaSub = document.getElementById('chipsCategoriaSub');
const inputNuevaCategoriaSub = document.getElementById('inputNuevaCategoriaSub');
const filaColorNuevaCategoriaSub = document.getElementById('filaColorNuevaCategoriaSub');
const colorNuevaCategoriaSub = document.getElementById('colorNuevaCategoriaSub');
const avisoCategoriaSub = document.getElementById('avisoCategoriaSub');
const btnCerrarCategoriaSub = document.getElementById('btnCerrarCategoriaSub');
const btnGuardarCategoriaSub = document.getElementById('btnGuardarCategoriaSub');

let contextoCategoriaSub = null; // { negocioId, indiceSub }

function abrirSelectorCategoriaSub(negocioId, indiceSub) {
  const n = negocios.find(x => x.id === negocioId);
  if (!n) return;
  contextoCategoriaSub = { negocioId, indiceSub };
  renderChipsCategoriaSub();
  inputNuevaCategoriaSub.value = '';
  colorNuevaCategoriaSub.value = '#1a73e8';
  filaColorNuevaCategoriaSub.style.display = 'none';
  avisoCategoriaSub.textContent = '';
  overlayCategoriaSub.classList.add('abierto');
}

function renderChipsCategoriaSub() {
  const cats = categoriasConocidas();
  chipsCategoriaSub.innerHTML = cats.length
    ? cats.map(c => {
        const color = obtenerColorCategoria(c) || '#c7cbd1';
        return `<button type="button" class="chip-categoria-color" data-cat="${c}" style="border-color:${color}">
          <span class="punto-categoria" style="background:${color}"></span>${c}
        </button>`;
      }).join('')
    : '<div class="vacio" style="padding:6px 0; font-size:12px; color:#888;">Aún no hay categorías guardadas.</div>';
}

chipsCategoriaSub.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip-categoria-color');
  if (!chip) return;
  guardarCategoriaSub(chip.dataset.cat);
});

inputNuevaCategoriaSub.addEventListener('input', () => {
  const cat = inputNuevaCategoriaSub.value.trim();
  const yaTieneColor = cat && obtenerColorCategoria(cat);
  filaColorNuevaCategoriaSub.style.display = (cat && !yaTieneColor) ? 'block' : 'none';
});

btnGuardarCategoriaSub.addEventListener('click', () => {
  const cat = inputNuevaCategoriaSub.value.trim();
  if (!cat) {
    avisoCategoriaSub.textContent = 'Escribe un nombre de categoría o elige una de la lista de arriba.';
    return;
  }
  if (!obtenerColorCategoria(cat)) {
    fijarColorCategoria(cat, colorNuevaCategoriaSub.value);
  }
  guardarCategoriaSub(cat);
});

function guardarCategoriaSub(categoria) {
  if (!contextoCategoriaSub) return;
  const { negocioId, indiceSub } = contextoCategoriaSub;
  const n = negocios.find(x => x.id === negocioId);
  if (!n) return;
  if (!n.subCategorias) n.subCategorias = [];
  n.subCategorias[indiceSub] = categoria;
  overlayCategoriaSub.classList.remove('abierto');
  // Vuelve a abrir el panel para mostrar el punto de color actualizado
  abrirPanelNegocio(negocioId);
}

btnCerrarCategoriaSub.addEventListener('click', () => overlayCategoriaSub.classList.remove('abierto'));
overlayCategoriaSub.addEventListener('click', (e) => {
  if (e.target === overlayCategoriaSub) overlayCategoriaSub.classList.remove('abierto');
});

/* =========================================================
   MODO "AÑADIR MARCADOR": el siguiente clic en el mapa
   coloca un punto de vista previa y abre el formulario
   ========================================================= */
let modoColocar = false;
let marcadorPrevio = null;

btnNuevoMarcador.addEventListener('click', () => {
  modoColocar = true;
  avisoColocar.style.display = 'block';
  sidebar.classList.remove('abierto');
});

map.on('click', function (e) {
  if (!modoColocar) return;
  modoColocar = false;
  avisoColocar.style.display = 'none';

  if (marcadorPrevio) map.removeLayer(marcadorPrevio);
  marcadorPrevio = L.marker([e.latlng.lat, e.latlng.lng], {
    icon: L.divIcon({ className: '', html: '<div class="marker-previo"></div>', iconSize: [26, 26], iconAnchor: [13, 13] })
  }).addTo(map);

  abrirModalNuevo(e.latlng.lat, e.latlng.lng);
});

/* =========================================================
   MODAL: generar los datos de un marcador nuevo para copiar
   ========================================================= */
const overlayModal = document.getElementById('overlayModal');
const inpLat = document.getElementById('inpLat');
const inpLng = document.getElementById('inpLng');
const inpNombre = document.getElementById('inpNombre');
const inpCategoria = document.getElementById('inpCategoria');
const inpEmoji = document.getElementById('inpEmoji');
const inpColor = document.getElementById('inpColor');
const inpUrl = document.getElementById('inpUrl');
const inpDescripcion = document.getElementById('inpDescripcion');
const inpImagen = document.getElementById('inpImagen');
// Ya no se elige hoja de destino desde el formulario: todo marcador
// nuevo se guarda en la Hoja 1 (ver HOJAS más arriba).
const HOJA_DESTINO_MARCADOR_NUEVO = 1;
const filaCopiar = document.getElementById('filaCopiar');
const avisoCopiado = document.getElementById('avisoCopiado');
const btnCopiarFila = document.getElementById('btnCopiarFila');
const btnCerrarModal = document.getElementById('btnCerrarModal');
const notaColorPrincipal = document.getElementById('notaColorPrincipal');

function abrirModalNuevo(lat, lng) {
  inpLat.value = lat.toFixed(6);
  inpLng.value = lng.toFixed(6);
  inpNombre.value = '';
  inpCategoria.value = '';
  inpEmoji.value = '';
  inpColor.value = '#1a73e8';
  inpColor.disabled = false;
  inpUrl.value = '';
  inpDescripcion.value = '';
  inpImagen.value = '';
  imagenBase64Elegida = null;
  estadoSubidaImagen.textContent = '';
  avisoCopiado.textContent = '';
  notaColorPrincipal.textContent = '';
  panelEmojis.classList.remove('abierto');
  actualizarFilaCopiar();
  overlayModal.classList.add('abierto');
}

function cerrarModal() {
  overlayModal.classList.remove('abierto');
  if (marcadorPrevio) { map.removeLayer(marcadorPrevio); marcadorPrevio = null; }
}

function actualizarFilaCopiar() {
  const partes = [
    inpNombre.value.trim(),
    inpUrl.value.trim(),
    inpCategoria.value.trim(),
    inpEmoji.value.trim(),
    inpColor.value,
    inpLat.value,
    inpLng.value,
    inpDescripcion.value.trim(),
    inpImagen.value.trim(),
    '', // Nombres de cada link (columna J): se completan después desde "Ver negocio → ⚙️ Configuración" si hay varios links
    '', // Colores de negocios extra (columna K): se completan después desde "Ver negocio → ⚙️ Configuración"
    '' // Categorías de sub negocios (columna L): se completan después desde "Ver negocio → ⚙️" en cada botón
  ];
  filaCopiar.textContent = partes.join('   |   ');
  return partes.join('\t');
}

[inpNombre, inpUrl, inpEmoji, inpColor, inpDescripcion, inpImagen].forEach(campo => {
  campo.addEventListener('input', actualizarFilaCopiar);
});

inpCategoria.addEventListener('input', () => {
  actualizarNotaColor(inpCategoria, inpColor, notaColorPrincipal);
  actualizarFilaCopiar();
});

btnCerrarModal.addEventListener('click', cerrarModal);

btnCopiarFila.addEventListener('click', async () => {
  // Si la categoría es nueva, el color elegido aquí se vuelve su
  // color permanente a partir de ahora
  const catNueva = inpCategoria.value.trim();
  if (catNueva && !obtenerColorCategoria(catNueva)) {
    fijarColorCategoria(catNueva, inpColor.value);
  }
  const filaTexto = actualizarFilaCopiar();
  try {
    await navigator.clipboard.writeText(filaTexto);
    avisoCopiado.textContent = '¡Copiado! Pégalo como nueva fila en tu hoja (Ctrl/Cmd + V).';
  } catch (e) {
    avisoCopiado.textContent = 'No se pudo copiar automático: selecciona el texto de arriba y cópialo manualmente.';
  }
});

/* =========================================================
   GUARDAR EL MARCADOR DIRECTAMENTE EN LA HOJA (backend seguro)
   -----------------------------------------------------------
   El botón "💾 Guardar directo en la hoja" manda todos los datos
   del formulario, junto con el token de sesión de Firebase, a tu
   Apps Script (apps-script-mapa-morelia.gs). Ese Apps Script:
     1. Verifica el token contra Firebase (que la sesión sea real).
     2. Verifica que el correo esté en su lista de autorizados.
     3. Si el usuario eligió una imagen, la sube a tu álbum de imgbb.
     4. Agrega la fila directamente en la pestaña correcta de tu
        Google Sheet (usando el mismo gid que ya usa HOJAS arriba,
        así no importa cuál pestaña esté abierta en ese momento).

   La imagen se convierte a .webp en el navegador (más liviana) en
   cuanto se elige el archivo, y se manda ya convertida cuando se
   presiona "Guardar directo".

   ⚠️ PENDIENTE DE CONFIGURAR: si cambias de Apps Script más
   adelante, actualiza la URL de abajo (termina en /exec).
   ========================================================= */
const APPSCRIPT_GUARDAR_URL = 'https://script.google.com/macros/s/AKfycbyhpsrNKsNv2uZBnBChJz8wQpk8NDMGbRVEqmaPhlRJ0MFXqNc2H87pOlXMEipOSLXy/exec';

// Redimensiona (si hace falta) y convierte un archivo de imagen a
// WebP usando un <canvas>; regresa el resultado en base64 SIN el
// prefijo "data:image/webp;base64,".
function convertirArchivoAWebpBase64(archivo, calidad = 0.82, ladoMaximo = 1600) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    lector.onload = () => {
      const imagen = new Image();
      imagen.onerror = () => reject(new Error('El archivo elegido no es una imagen válida.'));
      imagen.onload = () => {
        let ancho = imagen.width;
        let alto = imagen.height;
        if (ancho > ladoMaximo || alto > ladoMaximo) {
          const escala = ladoMaximo / Math.max(ancho, alto);
          ancho = Math.round(ancho * escala);
          alto = Math.round(alto * escala);
        }
        const canvas = document.createElement('canvas');
        canvas.width = ancho;
        canvas.height = alto;
        canvas.getContext('2d').drawImage(imagen, 0, 0, ancho, alto);
        const dataUrlWebp = canvas.toDataURL('image/webp', calidad);
        resolve(dataUrlWebp.split(',')[1]);
      };
      imagen.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });
}

// gid de la pestaña de Google Sheets correspondiente a un número de
// hoja (1 o 4), tomado del mismo arreglo HOJAS de arriba, para que
// el backend guarde en la pestaña correcta sin depender de nombres.
function gidDeHoja(numeroHoja) {
  const h = HOJAS.find(x => x.hoja === Number(numeroHoja));
  return h ? h.gid : 0;
}

const btnSubirImagen = document.getElementById('btnSubirImagen');
const inpArchivoImagen = document.getElementById('inpArchivoImagen');
const estadoSubidaImagen = document.getElementById('estadoSubidaImagen');
const btnGuardarDirecto = document.getElementById('btnGuardarDirecto');

// Base64 (.webp) de la imagen ya elegida, lista para mandarse junto
// con el resto del formulario al presionar "Guardar directo". Se
// reinicia cada vez que se abre el modal (ver abrirModalNuevo).
let imagenBase64Elegida = null;

btnSubirImagen.addEventListener('click', () => inpArchivoImagen.click());

inpArchivoImagen.addEventListener('change', async () => {
  const archivo = inpArchivoImagen.files[0];
  inpArchivoImagen.value = ''; // para poder elegir el mismo archivo otra vez si hace falta
  if (!archivo) return;

  estadoSubidaImagen.textContent = '⏳ Convirtiendo a .webp…';
  btnSubirImagen.disabled = true;
  try {
    imagenBase64Elegida = await convertirArchivoAWebpBase64(archivo);
    estadoSubidaImagen.textContent = `✅ "${archivo.name}" lista — se sube al presionar "Guardar directo".`;
  } catch (err) {
    console.error(err);
    imagenBase64Elegida = null;
    estadoSubidaImagen.textContent = '❌ No se pudo preparar la imagen: ' + err.message;
  } finally {
    btnSubirImagen.disabled = false;
  }
});

btnGuardarDirecto.addEventListener('click', async () => {
  if (!inpNombre.value.trim() || !inpLat.value || !inpLng.value) {
    avisoCopiado.textContent = 'Falta el nombre del negocio (la ubicación se toma del clic en el mapa).';
    return;
  }

  const usuario = window.firebaseAuth && window.firebaseAuth.currentUser;
  if (!usuario) {
    avisoCopiado.textContent = 'Debes iniciar sesión con una cuenta autorizada para guardar directo.';
    return;
  }

  // Si la categoría es nueva, el color elegido aquí se vuelve su
  // color permanente a partir de ahora (igual que con "Copiar fila")
  const catNueva = inpCategoria.value.trim();
  if (catNueva && !obtenerColorCategoria(catNueva)) {
    fijarColorCategoria(catNueva, inpColor.value);
  }

  btnGuardarDirecto.disabled = true;
  avisoCopiado.textContent = '⏳ Guardando en la hoja…';
  try {
    const idToken = await usuario.getIdToken();
    const resp = await fetch(APPSCRIPT_GUARDAR_URL, {
      method: 'POST',
      // "text/plain" evita que el navegador mande una petición de
      // verificación (preflight) que Apps Script no sabe responder;
      // el cuerpo sigue siendo JSON de todos modos.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        idToken: idToken,
        accion: 'agregar',
        gid: gidDeHoja(HOJA_DESTINO_MARCADOR_NUEVO),
        nombre: inpNombre.value.trim(),
        url: inpUrl.value.trim(),
        categoria: inpCategoria.value.trim(),
        emoji: inpEmoji.value.trim(),
        color: inpColor.value,
        lat: inpLat.value,
        lng: inpLng.value,
        descripcion: inpDescripcion.value.trim(),
        imagenBase64: imagenBase64Elegida || ''
      })
    });
    const datos = await resp.json();
    if (!datos.ok) throw new Error(datos.error || 'Error desconocido al guardar.');

    if (datos.imagen) inpImagen.value = datos.imagen;
    avisoCopiado.textContent = `✅ ¡Guardado! Se agregó como fila ${datos.fila} en tu hoja.`;
    await cargarNegociosDesdeSheet(); // refresca el mapa con el negocio recién guardado
  } catch (err) {
    console.error(err);
    avisoCopiado.textContent = '❌ No se pudo guardar: ' + err.message;
  } finally {
    btnGuardarDirecto.disabled = false;
  }
});

/* =========================================================
   SELECTOR DE EMOJIS (buscador + categorías, catálogo amplio)
   ========================================================= */
const EMOJI_CATEGORIAS = [
  {
    nombre: "Comida y bebida",
    emojis: [
      ["🥖", "pan baguette panaderia bakery"],
      ["🍞", "pan panaderia bread rebanada"],
      ["🥐", "cuerno croissant panaderia"],
      ["🥯", "bagel pan panaderia"],
      ["🧁", "cupcake pastel panaderia reposteria"],
      ["🍰", "pastel rebanada reposteria dulceria"],
      ["🎂", "pastel cumpleanos torta reposteria"],
      ["🍩", "dona donut panaderia dulceria"],
      ["🍪", "galleta panaderia dulceria"],
      ["🥧", "pay tarta panaderia reposteria"],
      ["🍫", "chocolate dulceria dulce"],
      ["🍬", "dulce caramelo dulceria"],
      ["🍭", "paleta caramelo dulceria"],
      ["🍯", "miel dulceria"],
      ["☕", "cafe cafeteria bebida"],
      ["🍵", "te cafeteria bebida"],
      ["🧃", "jugo bebida caja"],
      ["🥤", "refresco bebida vaso soda"],
      ["🧋", "bubble tea te boba bebida"],
      ["🍺", "cerveza bar cantina"],
      ["🍻", "cerveza brindis bar"],
      ["🍷", "vino bar restaurante"],
      ["🥂", "brindis copas bar celebracion"],
      ["🍸", "coctel bar"],
      ["🍹", "coctel tropical bar"],
      ["🥃", "whisky licor bar"],
      ["🍶", "sake bebida bar"],
      ["🍾", "champana botella celebracion bar"],
      ["🧉", "mate bebida"],
      ["🍼", "biberon bebe leche"],
      ["🥛", "leche lacteos bebida"],
      ["🫖", "tetera te bebida"],
      ["🍕", "pizza restaurante comida rapida"],
      ["🍔", "hamburguesa restaurante comida rapida"],
      ["🌭", "hot dog perro caliente comida rapida"],
      ["🌮", "taco tacos restaurante mexicano"],
      ["🌯", "burrito tacos restaurante mexicano"],
      ["🫓", "tortilla pan plano"],
      ["🥙", "pita sandwich comida rapida"],
      ["🥪", "sandwich torta comida rapida"],
      ["🧆", "falafel comida"],
      ["🍟", "papas fritas comida rapida"],
      ["🍗", "pollo pierna carne restaurante"],
      ["🍖", "carne hueso restaurante asador"],
      ["🥩", "carne bistec res asador carniceria"],
      ["🥓", "tocino carniceria"],
      ["🍤", "camaron mariscos restaurante"],
      ["🍣", "sushi restaurante japones"],
      ["🍱", "bento sushi restaurante japones"],
      ["🥟", "empanada dumpling restaurante"],
      ["🦪", "ostra mariscos"],
      ["🍙", "onigiri arroz japones"],
      ["🍚", "arroz comida"],
      ["🍘", "galleta arroz japones"],
      ["🍥", "pastel pescado japones"],
      ["🥠", "galleta fortuna china"],
      ["🥮", "pastel luna chino"],
      ["🍢", "brocheta oden japones"],
      ["🍡", "dango dulce japones"],
      ["🍧", "raspado nieve postre"],
      ["🍨", "helado nieve heladeria postre"],
      ["🍦", "helado cono heladeria postre"],
      ["🥧", "pay postre"],
      ["🍮", "flan postre"],
      ["🍿", "palomitas cine snack"],
      ["🌽", "elote maiz mercado"],
      ["🥕", "zanahoria verduleria mercado"],
      ["🥦", "brocoli verduleria mercado"],
      ["🥬", "lechuga verduleria mercado"],
      ["🥒", "pepino verduleria mercado"],
      ["🌶️", "chile picante mercado"],
      ["🫑", "pimiento verduleria mercado"],
      ["🫒", "aceituna mercado"],
      ["🧄", "ajo mercado"],
      ["🧅", "cebolla mercado"],
      ["🥔", "papa mercado"],
      ["🍠", "camote mercado"],
      ["🍅", "jitomate tomate mercado"],
      ["🍆", "berenjena mercado"],
      ["🥑", "aguacate mercado"],
      ["🍏", "manzana verde fruteria mercado"],
      ["🍎", "manzana roja fruteria mercado"],
      ["🍐", "pera fruteria mercado"],
      ["🍊", "naranja fruteria mercado citricos"],
      ["🍋", "limon fruteria mercado citricos"],
      ["🍌", "platano fruteria mercado"],
      ["🍉", "sandia fruteria mercado"],
      ["🍇", "uvas fruteria mercado"],
      ["🍓", "fresa fruteria mercado"],
      ["🫐", "arandano fruteria mercado"],
      ["🍈", "melon fruteria mercado"],
      ["🍒", "cereza fruteria mercado"],
      ["🍑", "durazno fruteria mercado"],
      ["🥭", "mango fruteria mercado"],
      ["🍍", "pina fruteria mercado"],
      ["🥥", "coco fruteria mercado"],
      ["🥝", "kiwi fruteria mercado"],
      ["🍄", "hongo champinon mercado"],
      ["🥜", "cacahuate nuez mercado"],
      ["🌰", "castana nuez mercado"],
      ["🧀", "queso lacteos cremeria"],
      ["🥚", "huevo mercado"],
      ["🍳", "huevo frito desayuno"],
      ["🧈", "mantequilla lacteos"],
      ["🥞", "hotcakes panqueques desayuno"],
      ["🧇", "waffle desayuno"],
      ["🥘", "paella guiso restaurante"],
      ["🍲", "guiso caldo restaurante"],
      ["🍝", "pasta espagueti restaurante italiano"],
      ["🍜", "sopa ramen restaurante"],
      ["🍛", "curry arroz restaurante"],
      ["🥗", "ensalada restaurante saludable"],
      ["🫕", "fondue restaurante"],
      ["🥫", "lata conserva mercado"],
      ["🧂", "sal condimento"],
      ["🧊", "hielo bebida"],
    ]
  },
  {
    nombre: "Personas y profesiones",
    emojis: [
      ["👨‍🍳", "chef cocinero restaurante"],
      ["👩‍🍳", "chef cocinera restaurante"],
      ["👨‍🔧", "mecanico tecnico taller"],
      ["👩‍🔧", "mecanica tecnica taller"],
      ["👨‍🏭", "obrero fabrica industria"],
      ["👩‍🏭", "obrera fabrica industria"],
      ["👨‍💼", "oficinista negocio empresario"],
      ["👩‍💼", "oficinista negocio empresaria"],
      ["👨‍⚕️", "doctor medico salud"],
      ["👩‍⚕️", "doctora medica salud"],
      ["👨‍🌾", "agricultor granjero campo"],
      ["👩‍🌾", "agricultora granjera campo"],
      ["👨‍🎓", "graduado estudiante escuela"],
      ["👩‍🎓", "graduada estudiante escuela"],
      ["👨‍🏫", "profesor maestro escuela"],
      ["👩‍🏫", "profesora maestra escuela"],
      ["👨‍💻", "programador tecnologia oficina"],
      ["👩‍💻", "programadora tecnologia oficina"],
      ["👨‍🎨", "artista pintor"],
      ["👩‍🎨", "artista pintora"],
      ["👨‍✈️", "piloto aviacion"],
      ["👩‍✈️", "piloto aviacion"],
      ["👨‍🚀", "astronauta"],
      ["👩‍🚀", "astronauta"],
      ["👨‍🚒", "bombero"],
      ["👩‍🚒", "bombera"],
      ["👮", "policia seguridad"],
      ["🕵️", "detective investigador"],
      ["💂", "guardia seguridad"],
      ["👷", "construccion obrero casco"],
      ["🤴", "principe realeza"],
      ["👸", "princesa realeza"],
      ["👳", "turbante persona"],
      ["👲", "gorro persona"],
      ["🧕", "hiyab persona"],
      ["🤵", "novio traje formal"],
      ["👰", "novia vestido boda"],
      ["🤰", "embarazada"],
      ["🤱", "lactancia bebe"],
      ["👼", "angel bebe"],
      ["🎅", "santa claus navidad"],
      ["🤶", "mama noel navidad"],
      ["🦸", "superheroe"],
      ["🦹", "supervillano"],
      ["🧙", "mago magia"],
      ["🧚", "hada"],
      ["🧜", "sirena"],
      ["🧞", "genio"],
      ["💆", "spa masaje relajacion"],
      ["💇", "corte cabello estetica peluqueria"],
      ["🚶", "caminar peaton"],
      ["🏃", "correr ejercicio"],
      ["💃", "baile danza fiesta"],
      ["🕺", "baile danza fiesta"],
      ["🧘", "yoga meditacion relajacion"],
      ["🛀", "banar spa"],
      ["👤", "persona silueta"],
      ["👥", "personas equipo grupo"],
      ["🗣️", "hablar orador vocero"],
      ["👶", "bebe recien nacido"],
      ["🧒", "nino infante"],
      ["👦", "nino"],
      ["👧", "nina"],
      ["🧑", "persona adulto"],
      ["👨", "hombre"],
      ["👩", "mujer"],
      ["🧓", "persona mayor"],
      ["👴", "abuelo anciano"],
      ["👵", "abuela anciana"],
      ["💪", "fuerza musculo gimnasio"],
      ["🙌", "celebracion manos exito"],
      ["👏", "aplauso felicitacion"],
      ["🤝", "acuerdo trato negocio saludo"],
      ["👍", "bien aprobado like"],
      ["👎", "mal desaprobado dislike"],
      ["✍️", "firmar escribir documento"],
      ["💅", "manicure unas estetica"],
    ]
  },
  {
    nombre: "Animales y naturaleza",
    emojis: [
      ["🐶", "perro mascota veterinaria"],
      ["🐕", "perro mascota veterinaria"],
      ["🐩", "perro poodle mascota estetica"],
      ["🐈", "gato mascota veterinaria"],
      ["🐱", "gato mascota veterinaria"],
      ["🐭", "raton mascota"],
      ["🐹", "hamster mascota"],
      ["🐰", "conejo mascota"],
      ["🦊", "zorro animal"],
      ["🐻", "oso animal"],
      ["🐼", "panda animal"],
      ["🐨", "koala animal"],
      ["🐯", "tigre animal"],
      ["🦁", "leon animal"],
      ["🐮", "vaca ganaderia rancho"],
      ["🐷", "cerdo granja rancho"],
      ["🐽", "cerdo nariz granja"],
      ["🐸", "rana animal"],
      ["🐵", "mono animal"],
      ["🐔", "gallina pollo granja avicola"],
      ["🐧", "pinguino animal"],
      ["🐦", "ave pajaro"],
      ["🐤", "pollito ave granja"],
      ["🦆", "pato ave granja"],
      ["🦅", "aguila ave"],
      ["🦉", "buho ave"],
      ["🦇", "murcielago animal"],
      ["🐺", "lobo animal"],
      ["🐗", "jabali animal"],
      ["🐴", "caballo equino rancho"],
      ["🦄", "unicornio fantasia"],
      ["🐝", "abeja miel apicultura"],
      ["🐛", "oruga insecto"],
      ["🦋", "mariposa insecto"],
      ["🐌", "caracol insecto"],
      ["🐞", "mariquita insecto"],
      ["🐜", "hormiga insecto"],
      ["🕷️", "arana insecto"],
      ["🐢", "tortuga animal"],
      ["🐍", "serpiente animal"],
      ["🦎", "lagartija reptil"],
      ["🐙", "pulpo mariscos mar"],
      ["🦑", "calamar mariscos mar"],
      ["🦐", "camaron mariscos"],
      ["🦞", "langosta mariscos"],
      ["🦀", "cangrejo mariscos"],
      ["🐡", "pez globo pescaderia"],
      ["🐠", "pez tropical acuario"],
      ["🐟", "pez pescaderia"],
      ["🐬", "delfin mar"],
      ["🐳", "ballena mar"],
      ["🐋", "ballena mar"],
      ["🦈", "tiburon mar"],
      ["🐊", "cocodrilo reptil"],
      ["🐅", "tigre animal"],
      ["🐆", "leopardo animal"],
      ["🦓", "cebra animal"],
      ["🦍", "gorila animal"],
      ["🐘", "elefante animal"],
      ["🦛", "hipopotamo animal"],
      ["🐪", "camello animal"],
      ["🦒", "jirafa animal"],
      ["🐄", "vaca ganaderia rancho"],
      ["🐎", "caballo equino rancho"],
      ["🐖", "cerdo granja"],
      ["🐑", "oveja lana ganaderia"],
      ["🦙", "llama animal"],
      ["🐐", "cabra ganaderia"],
      ["🦌", "venado animal"],
      ["🐕‍🦺", "perro guia servicio"],
      ["🦮", "perro guia servicio"],
      ["🐓", "gallo granja avicola"],
      ["🦃", "pavo granja avicola"],
      ["🦚", "pavorreal ave"],
      ["🦜", "loro ave mascota"],
      ["🦢", "cisne ave"],
      ["🕊️", "paloma ave paz"],
      ["🐇", "conejo mascota"],
      ["🦔", "erizo animal"],
      ["🐾", "huellas mascota veterinaria"],
      ["🌵", "cactus planta vivero"],
      ["🎄", "arbol navidad decoracion"],
      ["🌲", "pino arbol vivero"],
      ["🌳", "arbol vivero jardin"],
      ["🌴", "palmera jardin vivero"],
      ["🌱", "planta germinado vivero jardin"],
      ["🌿", "hierba planta vivero jardin"],
      ["☘️", "trebol planta suerte"],
      ["🍀", "trebol cuatro hojas suerte jardin"],
      ["🪴", "maceta planta vivero"],
      ["🍃", "hojas jardin naturaleza"],
      ["🍂", "hojas otono jardin"],
      ["🍁", "hoja arce otono jardin"],
      ["🌾", "trigo agricultura campo"],
      ["💐", "ramo flores floreria"],
      ["🌷", "tulipan flor floreria"],
      ["🌹", "rosa flor floreria"],
      ["🥀", "flor marchita floreria"],
      ["🌺", "flor tropical floreria"],
      ["🌸", "flor cerezo floreria"],
      ["🌼", "flor margarita floreria"],
      ["🌻", "girasol flor floreria"],
      ["☀️", "sol clima soleado"],
      ["⛅", "nublado clima"],
      ["🌈", "arcoiris clima"],
      ["⭐", "estrella"],
      ["🌙", "luna noche"],
      ["🔥", "fuego calor"],
      ["💧", "gota agua"],
      ["🌊", "ola mar playa"],
    ]
  },
  {
    nombre: "Viajes y lugares",
    emojis: [
      ["🚗", "auto carro automotriz taller"],
      ["🚕", "taxi transporte"],
      ["🚙", "suv camioneta automotriz"],
      ["🚌", "autobus transporte"],
      ["🚎", "trolebus transporte"],
      ["🏎️", "auto carreras deportivo"],
      ["🚓", "patrulla policia"],
      ["🚑", "ambulancia emergencia salud"],
      ["🚒", "bomberos emergencia"],
      ["🚐", "van transporte"],
      ["🛻", "pickup camioneta automotriz"],
      ["🚚", "camion carga transporte"],
      ["🚛", "camion trailer transporte carga"],
      ["🚜", "tractor agricultura"],
      ["🛵", "moto scooter delivery"],
      ["🏍️", "motocicleta automotriz"],
      ["🛺", "mototaxi transporte"],
      ["🚲", "bicicleta bici transporte"],
      ["🛴", "patineta scooter"],
      ["🛹", "patineta skate deporte"],
      ["🚨", "sirena emergencia alerta"],
      ["🚔", "patrulla policia"],
      ["🚍", "autobus transporte"],
      ["🚘", "auto automotriz"],
      ["🚖", "taxi transporte"],
      ["🚡", "teleferico transporte"],
      ["🚠", "teleferico montana transporte"],
      ["🚟", "tren suspendido transporte"],
      ["🚃", "vagon tren transporte"],
      ["🚋", "tranvia transporte"],
      ["🚞", "tren montana transporte"],
      ["🚄", "tren bala transporte"],
      ["🚅", "tren bala transporte"],
      ["🚈", "tren ligero transporte"],
      ["🚂", "locomotora tren transporte"],
      ["🚆", "tren transporte"],
      ["🚇", "metro subterraneo transporte"],
      ["🚊", "tranvia transporte"],
      ["🚉", "estacion tren transporte"],
      ["✈️", "avion aerolinea viajes"],
      ["🛫", "despegue avion viajes"],
      ["🛬", "aterrizaje avion viajes"],
      ["🛩️", "avioneta viajes"],
      ["💺", "asiento avion viajes"],
      ["🛰️", "satelite tecnologia"],
      ["🚀", "cohete lanzamiento startup"],
      ["🚁", "helicoptero transporte"],
      ["🛶", "canoa lancha mar"],
      ["⛵", "velero barco mar"],
      ["🚤", "lancha rapida mar"],
      ["🛥️", "yate barco mar"],
      ["🛳️", "crucero barco viajes"],
      ["⛴️", "ferry barco transporte"],
      ["🚢", "barco transporte mar"],
      ["⚓", "ancla barco mar"],
      ["⛽", "gasolina combustible estacion"],
      ["🚧", "construccion obra precaucion"],
      ["🚦", "semaforo transito"],
      ["🚥", "semaforo transito"],
      ["🚏", "parada autobus transporte"],
      ["🗺️", "mapa viajes ubicacion"],
      ["🗽", "monumento turismo"],
      ["🗼", "torre turismo"],
      ["🏰", "castillo turismo"],
      ["🏯", "castillo japones turismo"],
      ["🏟️", "estadio deportes"],
      ["🎡", "rueda fortuna feria"],
      ["🎢", "montana rusa feria"],
      ["🎠", "carrusel feria"],
      ["⛲", "fuente parque"],
      ["⛱️", "sombrilla playa"],
      ["🏖️", "playa turismo"],
      ["🏝️", "isla playa turismo"],
      ["🏜️", "desierto turismo"],
      ["🌋", "volcan turismo"],
      ["⛰️", "montana turismo"],
      ["🏔️", "montana nevada turismo"],
      ["🗻", "montana fuji turismo"],
      ["🏕️", "campamento turismo"],
      ["⛺", "tienda campana camping"],
      ["🏠", "casa hogar inmobiliaria"],
      ["🏡", "casa jardin inmobiliaria"],
      ["🏘️", "casas colonia inmobiliaria"],
      ["🏚️", "casa abandonada"],
      ["🏗️", "construccion edificio obra"],
      ["🏭", "fabrica industria"],
      ["🏢", "edificio oficina negocio"],
      ["🏬", "centro comercial tienda"],
      ["🏣", "oficina correos japon"],
      ["🏤", "oficina correos"],
      ["🏥", "hospital salud clinica"],
      ["🏦", "banco finanzas"],
      ["🏨", "hotel hospedaje"],
      ["🏪", "tienda conveniencia minisuper"],
      ["🏫", "escuela educacion"],
      ["🏩", "hotel amor"],
      ["💒", "boda iglesia matrimonio"],
      ["🏛️", "edificio gobierno museo"],
      ["⛪", "iglesia religion"],
      ["🕌", "mezquita religion"],
      ["🕍", "sinagoga religion"],
      ["🛕", "templo religion"],
      ["🕋", "kaaba religion"],
      ["⛩️", "santuario religion"],
      ["🗾", "mapa japon"],
      ["🎑", "luna llena celebracion"],
      ["🏞️", "paisaje parque naturaleza"],
      ["🧭", "brujula navegacion viajes"],
    ]
  },
  {
    nombre: "Actividades y deportes",
    emojis: [
      ["⚽", "futbol deporte balon"],
      ["🏀", "basquetbol deporte balon"],
      ["🏈", "futbol americano deporte"],
      ["⚾", "beisbol deporte"],
      ["🥎", "softbol deporte"],
      ["🎾", "tenis deporte raqueta"],
      ["🏐", "voleibol deporte"],
      ["🏉", "rugby deporte"],
      ["🥏", "frisbee deporte"],
      ["🎱", "billar deporte"],
      ["🪀", "yoyo juguete"],
      ["🏓", "ping pong deporte"],
      ["🏸", "badminton deporte raqueta"],
      ["🏒", "hockey deporte"],
      ["🏑", "hockey cesped deporte"],
      ["🥍", "lacrosse deporte"],
      ["🏏", "criquet deporte"],
      ["🥅", "porteria gol deporte"],
      ["⛳", "golf deporte"],
      ["🪁", "cometa juguete"],
      ["🏹", "arqueria deporte"],
      ["🎣", "pesca deporte"],
      ["🤿", "buceo esnorquel deporte"],
      ["🥊", "boxeo deporte"],
      ["🥋", "artes marciales deporte"],
      ["🎽", "carrera atletismo deporte"],
      ["🛹", "patineta skate deporte"],
      ["🛼", "patines deporte"],
      ["🛷", "trineo deporte invierno"],
      ["⛸️", "patinaje hielo deporte"],
      ["🥌", "curling deporte"],
      ["🎿", "esqui deporte invierno"],
      ["⛷️", "esquiar deporte invierno"],
      ["🏂", "snowboard deporte invierno"],
      ["🏋️", "levantamiento pesas gimnasio"],
      ["🤼", "lucha deporte"],
      ["🤸", "gimnasia deporte"],
      ["⛹️", "basquetbol jugador deporte"],
      ["🤺", "esgrima deporte"],
      ["🤾", "balonmano deporte"],
      ["🏌️", "golf jugador deporte"],
      ["🏇", "hipica caballo deporte"],
      ["🧘", "yoga meditacion gimnasio"],
      ["🏄", "surf deporte agua"],
      ["🏊", "natacion deporte alberca"],
      ["🤽", "polo agua deporte"],
      ["🚣", "remo deporte agua"],
      ["🧗", "escalada deporte"],
      ["🚵", "ciclismo montana deporte"],
      ["🚴", "ciclismo deporte"],
      ["🏆", "trofeo campeonato ganador"],
      ["🥇", "medalla oro ganador"],
      ["🥈", "medalla plata ganador"],
      ["🥉", "medalla bronce ganador"],
      ["🏅", "medalla deporte premio"],
      ["🎖️", "medalla militar honor"],
      ["🎗️", "listón conciencia campana"],
      ["🎫", "boleto entrada evento"],
      ["🎟️", "boleto entrada evento espectaculo"],
      ["🎪", "circo carpa evento"],
      ["🤹", "malabares circo"],
      ["🎭", "teatro drama mascara"],
      ["🩰", "ballet danza"],
      ["🎨", "arte pintura taller"],
      ["🎬", "cine pelicula produccion"],
      ["🎤", "microfono karaoke musica"],
      ["🎧", "audifonos musica"],
      ["🎼", "partitura musica"],
      ["🎹", "piano musica instrumento"],
      ["🥁", "tambor musica instrumento"],
      ["🪘", "conga musica instrumento"],
      ["🎷", "saxofon musica instrumento"],
      ["🎺", "trompeta musica instrumento"],
      ["🪗", "acordeon musica instrumento"],
      ["🎸", "guitarra musica instrumento"],
      ["🪕", "banjo musica instrumento"],
      ["🎻", "violin musica instrumento"],
      ["🎲", "dados juegos"],
      ["♟️", "ajedrez juegos estrategia"],
      ["🎯", "dardos diana juegos"],
      ["🎳", "boliche deporte juegos"],
      ["🎮", "videojuegos gaming"],
      ["🎰", "tragamonedas casino juegos"],
      ["🧩", "rompecabezas puzzle juegos"],
    ]
  },
  {
    nombre: "Objetos y negocios",
    emojis: [
      ["⌚", "reloj accesorio relojeria"],
      ["📱", "celular telefono tecnologia"],
      ["💻", "laptop computadora tecnologia oficina"],
      ["⌨️", "teclado tecnologia oficina"],
      ["🖥️", "computadora escritorio tecnologia oficina"],
      ["🖨️", "impresora oficina papeleria"],
      ["🖱️", "mouse tecnologia oficina"],
      ["🕹️", "control videojuegos"],
      ["💽", "disco almacenamiento tecnologia"],
      ["💾", "guardar disco tecnologia"],
      ["💿", "cd disco tecnologia"],
      ["📷", "camara fotografia"],
      ["📸", "camara flash fotografia"],
      ["📹", "videocamara fotografia"],
      ["🎥", "camara cine produccion"],
      ["📞", "telefono llamada"],
      ["☎️", "telefono fijo llamada"],
      ["📠", "fax oficina"],
      ["📺", "television tienda electronica"],
      ["📻", "radio tienda electronica"],
      ["🎙️", "microfono podcast estudio"],
      ["🧭", "brujula navegacion"],
      ["⏱️", "cronometro tiempo"],
      ["⏰", "alarma reloj despertador"],
      ["🕰️", "reloj antiguo relojeria"],
      ["⌛", "reloj arena tiempo"],
      ["⏳", "reloj arena tiempo espera"],
      ["📡", "antena satelital tecnologia"],
      ["🔋", "bateria energia"],
      ["🔌", "enchufe electricidad"],
      ["💡", "foco idea electricidad iluminacion"],
      ["🕯️", "vela iluminacion decoracion"],
      ["🧯", "extintor seguridad"],
      ["🛢️", "barril petroleo combustible"],
      ["💸", "dinero volando finanzas gastos"],
      ["💵", "billete dinero finanzas"],
      ["💴", "yenes dinero finanzas"],
      ["💶", "euros dinero finanzas"],
      ["💷", "libras dinero finanzas"],
      ["🪙", "moneda dinero finanzas"],
      ["💰", "dinero bolsa finanzas ahorro"],
      ["💳", "tarjeta credito pago finanzas"],
      ["🧾", "recibo factura finanzas"],
      ["💎", "diamante joyeria lujo"],
      ["⚖️", "balanza justicia legal abogado"],
      ["🧰", "caja herramientas taller"],
      ["🔧", "llave herramienta taller mecanico"],
      ["🔨", "martillo herramienta taller"],
      ["⚒️", "martillo pico herramienta taller"],
      ["🛠️", "herramientas taller reparacion"],
      ["⛏️", "pico herramienta mineria"],
      ["🔩", "tornillo herramienta ferreteria"],
      ["⚙️", "engranaje mecanica taller"],
      ["🧱", "ladrillo construccion"],
      ["⛓️", "cadena herrajeria"],
      ["🧲", "iman herramienta"],
      ["🪓", "hacha herramienta"],
      ["🔪", "cuchillo cocina"],
      ["🩹", "curita primeros auxilios salud"],
      ["🩺", "estetoscopio doctor salud"],
      ["💊", "medicina pastilla farmacia"],
      ["💉", "jeringa vacuna salud"],
      ["🧬", "adn laboratorio salud"],
      ["🦠", "microbio laboratorio salud"],
      ["🧫", "laboratorio ciencia"],
      ["🌡️", "termometro salud clima"],
      ["🧹", "escoba limpieza"],
      ["🪠", "destapacano plomeria"],
      ["🧺", "canasta lavanderia"],
      ["🧻", "papel higienico limpieza"],
      ["🚽", "inodoro plomeria bano"],
      ["🚰", "llave agua plomeria"],
      ["🚿", "regadera bano plomeria"],
      ["🛁", "tina bano spa"],
      ["🧴", "botella crema cuidado personal"],
      ["🧼", "jabon limpieza"],
      ["🪥", "cepillo dientes dental"],
      ["🪒", "rastrillo afeitar barberia"],
      ["🧽", "esponja limpieza"],
      ["🪣", "cubeta limpieza"],
      ["🛒", "carrito compras supermercado"],
      ["🎁", "regalo tienda regalos"],
      ["🎀", "moño regalo decoracion"],
      ["🪄", "varita magica magia"],
      ["🪅", "piñata fiesta"],
      ["🎈", "globo fiesta decoracion"],
      ["🎏", "banderin decoracion carpa"],
      ["🎐", "campanilla viento decoracion"],
      ["🧧", "sobre rojo regalo dinero"],
      ["✉️", "sobre correo"],
      ["📩", "correo mensaje sobre"],
      ["📨", "correo entrante mensaje"],
      ["📧", "email correo electronico"],
      ["💌", "carta amor correo"],
      ["📥", "bandeja entrada correo"],
      ["📤", "bandeja salida correo"],
      ["📦", "paquete caja envio delivery"],
      ["🏷️", "etiqueta precio producto"],
      ["📪", "buzon correo cerrado"],
      ["📫", "buzon correo"],
      ["📬", "buzon correo abierto"],
      ["📭", "buzon correo vacio"],
      ["📮", "buzon postal correo"],
      ["📯", "corneta postal"],
      ["📜", "pergamino documento"],
      ["📃", "documento papel"],
      ["📄", "documento pagina papel"],
      ["📑", "documentos marcador"],
      ["📊", "grafica estadistica negocio"],
      ["📈", "grafica creciente ventas negocio"],
      ["📉", "grafica decreciente ventas negocio"],
      ["🗒️", "notas libreta oficina"],
      ["🗓️", "calendario planificacion oficina"],
      ["📆", "calendario fecha oficina"],
      ["📅", "calendario evento oficina"],
      ["🗑️", "basura reciclaje"],
      ["📇", "tarjetero contacto oficina"],
      ["🗃️", "archivo caja oficina"],
      ["🗳️", "urna votacion"],
      ["🗄️", "archivero oficina"],
      ["📋", "portapapeles lista oficina"],
      ["📁", "carpeta archivo oficina"],
      ["📂", "carpeta abierta archivo oficina"],
      ["🗂️", "carpetas indice oficina"],
      ["📰", "periodico noticias"],
      ["📓", "libreta cuaderno oficina"],
      ["📔", "diario libreta oficina"],
      ["📒", "libro contabilidad oficina"],
      ["📕", "libro cerrado libreria"],
      ["📗", "libro verde libreria"],
      ["📘", "libro azul libreria"],
      ["📙", "libro naranja libreria"],
      ["📚", "libros libreria biblioteca educacion"],
      ["📖", "libro abierto lectura educacion"],
      ["🔖", "marcador libro"],
      ["🔗", "enlace link"],
      ["📎", "clip oficina papeleria"],
      ["🖇️", "clips oficina papeleria"],
      ["📐", "escuadra regla oficina"],
      ["📏", "regla medicion oficina"],
      ["🧮", "abaco calculo matematicas"],
      ["📌", "chincheta pin oficina"],
      ["📍", "ubicacion pin mapa"],
      ["✂️", "tijeras oficina papeleria estetica"],
      ["🖊️", "pluma bolografo oficina"],
      ["🖋️", "pluma fuente escritura"],
      ["✒️", "pluma tinta escritura"],
      ["🖌️", "pincel arte pintura"],
      ["🖍️", "crayon arte"],
      ["📝", "nota lapiz escritura oficina"],
      ["✏️", "lapiz escritura papeleria"],
      ["🔍", "lupa buscar"],
      ["🔎", "lupa investigar buscar"],
      ["🔒", "candado cerrado seguridad"],
      ["🔓", "candado abierto seguridad"],
      ["🔑", "llave inmobiliaria acceso"],
      ["🗝️", "llave antigua acceso"],
      ["🪪", "identificacion credencial"],
    ]
  },
  {
    nombre: "Símbolos y señales",
    emojis: [
      ["❤️", "corazon amor"],
      ["🧡", "corazon naranja"],
      ["💛", "corazon amarillo"],
      ["💚", "corazon verde"],
      ["💙", "corazon azul"],
      ["💜", "corazon morado"],
      ["🖤", "corazon negro"],
      ["🤍", "corazon blanco"],
      ["🤎", "corazon cafe"],
      ["💯", "cien puntos perfecto"],
      ["✅", "correcto listo aprobado"],
      ["❌", "incorrecto cancelar cerrado"],
      ["⭕", "circulo ok"],
      ["🛑", "alto stop pare"],
      ["⛔", "prohibido no entrar"],
      ["📛", "nombre etiqueta prohibido"],
      ["🚫", "prohibido no permitido"],
      ["💢", "enojo simbolo"],
      ["♨️", "caliente vapor spa"],
      ["🚷", "prohibido caminar"],
      ["🚯", "prohibido tirar basura"],
      ["🚳", "prohibido bicicletas"],
      ["🚱", "agua no potable"],
      ["🔞", "prohibido menores"],
      ["📵", "prohibido celulares"],
      ["🚭", "prohibido fumar"],
      ["❗", "exclamacion importante"],
      ["❓", "pregunta duda"],
      ["‼️", "doble exclamacion"],
      ["⁉️", "exclamacion pregunta"],
      ["⚠️", "advertencia precaucion"],
      ["🚸", "cruce escolar precaucion"],
      ["🔱", "tridente simbolo"],
      ["⚜️", "flor de lis simbolo"],
      ["♻️", "reciclaje ecologico"],
      ["✳️", "asterisco simbolo"],
      ["❇️", "destello simbolo"],
      ["〽️", "simbolo japones"],
      ["💠", "diamante simbolo"],
      ["🌐", "globo internet web"],
      ["Ⓜ️", "metro simbolo m"],
      ["🌀", "ciclon espiral"],
      ["💤", "dormir zzz descanso"],
      ["🏧", "cajero automatico banco"],
      ["🚾", "bano wc"],
      ["♿", "accesibilidad silla ruedas"],
      ["🅿️", "estacionamiento parking"],
      ["🚹", "hombres bano"],
      ["🚺", "mujeres bano"],
      ["🚼", "bebe cambiador"],
      ["🚻", "banos publicos"],
      ["🚮", "tirar basura contenedor"],
      ["🎦", "cine simbolo"],
      ["📶", "senal wifi tecnologia"],
      ["🔤", "letras abecedario"],
      ["ℹ️", "informacion info"],
      ["🆗", "ok simbolo"],
      ["🆕", "nuevo simbolo"],
      ["🆓", "gratis simbolo"],
      ["🆒", "genial simbolo"],
      ["🔟", "numero diez"],
      ["🔢", "numeros simbolo"],
      ["#️⃣", "numeral hashtag"],
      ["➕", "mas suma"],
      ["➖", "menos resta"],
      ["➗", "division simbolo"],
      ["✖️", "multiplicacion por"],
      ["♾️", "infinito simbolo"],
      ["💲", "peso dolar signo"],
      ["™️", "marca registrada"],
      ["©️", "derechos autor copyright"],
      ["®️", "marca registrada simbolo"],
      ["〰️", "onda simbolo"],
      ["➰", "rizo simbolo"],
      ["🔚", "fin final"],
      ["🔙", "atras regresar"],
      ["🔛", "encendido activo"],
      ["🔝", "arriba top"],
      ["🔜", "proximamente pronto"],
      ["✔️", "palomita correcto"],
      ["☑️", "casilla marcada correcto"],
      ["🔘", "boton radio simbolo"],
      ["🔴", "circulo rojo"],
      ["🟠", "circulo naranja"],
      ["🟡", "circulo amarillo"],
      ["🟢", "circulo verde abierto"],
      ["🔵", "circulo azul"],
      ["🟣", "circulo morado"],
      ["⚫", "circulo negro"],
      ["⚪", "circulo blanco"],
      ["🟤", "circulo cafe"],
      ["🔺", "triangulo rojo"],
      ["🔻", "triangulo rojo abajo"],
      ["🔸", "diamante naranja pequeno"],
      ["🔹", "diamante azul pequeno"],
      ["🔶", "diamante naranja grande"],
      ["🔷", "diamante azul grande"],
      ["🔳", "cuadro blanco boton"],
      ["🔲", "cuadro negro boton"],
      ["▪️", "cuadro pequeno negro"],
      ["▫️", "cuadro pequeno blanco"],
      ["◾", "cuadro mediano negro"],
      ["◽", "cuadro mediano blanco"],
      ["◼️", "cuadro grande negro"],
      ["◻️", "cuadro grande blanco"],
      ["🟥", "cuadro rojo"],
      ["🟧", "cuadro naranja"],
      ["🟨", "cuadro amarillo"],
      ["🟩", "cuadro verde"],
      ["🟦", "cuadro azul"],
      ["🟪", "cuadro morado"],
      ["⬛", "cuadro grande negro"],
      ["⬜", "cuadro grande blanco"],
      ["🟫", "cuadro cafe"],
    ]
  },
  {
    nombre: "Caras y emociones",
    emojis: [
      ["😀", "cara feliz sonrisa contento"],
      ["😃", "cara feliz sonrisa alegre"],
      ["😄", "cara feliz risa alegre"],
      ["😁", "cara feliz sonrisa dientes"],
      ["😆", "cara risa carcajada"],
      ["😅", "cara risa nervioso sudor"],
      ["🤣", "carcajada risa muy divertido"],
      ["😂", "risa lagrimas divertido"],
      ["🙂", "sonrisa leve amable"],
      ["🙃", "cara al reves"],
      ["😉", "guino cara"],
      ["😊", "cara feliz sonrojado amable"],
      ["😇", "angel cara inocente"],
      ["🥰", "enamorado corazones cara"],
      ["😍", "enamorado ojos corazon"],
      ["🤩", "cara emocionado estrella wow"],
      ["😘", "beso cara enamorado"],
      ["😋", "cara antojo sabroso"],
      ["😛", "cara lengua juguetona"],
      ["🤪", "cara loca divertida"],
      ["😝", "cara lengua guino"],
      ["🤑", "cara dinero avaro"],
      ["🤗", "abrazo cara"],
      ["🤭", "cara riendo tapando boca"],
      ["🤫", "cara silencio shh"],
      ["🤔", "cara pensando duda"],
      ["🤨", "cara ceja duda sospecha"],
      ["😐", "cara neutral seria"],
      ["😑", "cara sin expresion aburrida"],
      ["😶", "cara sin boca"],
      ["😏", "cara sonrisa picara"],
      ["😒", "cara fastidiada molesta"],
      ["🙄", "cara ojos en blanco fastidio"],
      ["😬", "cara nerviosa mueca"],
      ["😌", "cara aliviada tranquila"],
      ["😔", "cara triste pensativa"],
      ["😪", "cara sonolienta cansada"],
      ["🤤", "cara babeando"],
      ["😴", "cara durmiendo sueno"],
      ["😷", "cara mascarilla enfermo"],
      ["🤒", "cara termometro enfermo fiebre"],
      ["🤕", "cara vendada herido"],
      ["🤢", "cara nauseas asco"],
      ["🤮", "cara vomitando enfermo"],
      ["🥵", "cara calor sofocado"],
      ["🥶", "cara frio congelado"],
      ["😵", "cara mareada aturdida"],
      ["🤯", "cara explotando sorpresa"],
      ["🥳", "cara fiesta celebracion"],
      ["😎", "cara lentes sol genial"],
      ["🤓", "cara nerd lentes"],
      ["😕", "cara confundida"],
      ["😟", "cara preocupada"],
      ["🙁", "cara triste"],
      ["😮", "cara sorprendida boca abierta"],
      ["😲", "cara asombrada"],
      ["🥺", "cara suplicante ojos tiernos"],
      ["😢", "cara llorando triste"],
      ["😭", "cara llorando fuerte"],
      ["😱", "cara gritando miedo"],
      ["😡", "cara enojada furiosa"],
      ["😠", "cara molesta"],
      ["🥱", "cara bostezo cansancio"],
    ]
  },
];

// Quita acentos para que la búsqueda sea más flexible
function normalizarTexto(t) {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Íconos representativos por categoría, usados como pestaña
const ICONO_CATEGORIA = {
  'Comida y bebida': '🍔',
  'Personas y profesiones': '👩‍⚕️',
  'Animales y naturaleza': '🐶',
  'Viajes y lugares': '🚗',
  'Actividades y deportes': '⚽',
  'Objetos y negocios': '💼',
  'Símbolos y señales': '✅',
  'Caras y emociones': '😀'
};

const TODOS_LOS_EMOJIS = EMOJI_CATEGORIAS.flatMap(cat =>
  cat.emojis.map(([e, k]) => ({
    e,
    cat: cat.nombre,
    texto: normalizarTexto(k + ' ' + cat.nombre)
  }))
);

// Inserta un texto en la posición del cursor de un input/textarea,
// sin borrar lo que ya estaba escrito (usado para agregar emojis
// dentro de la descripción, que es un campo de texto libre).
function insertarTextoEnCursor(campo, texto) {
  const inicio = campo.selectionStart ?? campo.value.length;
  const fin = campo.selectionEnd ?? campo.value.length;
  campo.value = campo.value.slice(0, inicio) + texto + campo.value.slice(fin);
  const nuevaPosicion = inicio + texto.length;
  campo.focus();
  campo.setSelectionRange(nuevaPosicion, nuevaPosicion);
}

// Crea una instancia independiente del selector de emojis (buscador +
// categorías) para un input dado. Se usa para el campo de Emoji del
// modal "Nuevo marcador", el de "Configuración" del negocio, y para
// el campo de Descripción (con modo "insertar": agrega el emoji en
// el cursor en vez de reemplazar todo el texto).
function crearSelectorEmoji({ btnId, panelId, inputId, buscarId, tabsId, gridId, alCambiar, modo = 'reemplazar' }) {
  const btn = document.getElementById(btnId);
  const panel = document.getElementById(panelId);
  const input = document.getElementById(inputId);
  const buscar = document.getElementById(buscarId);
  const tabs = document.getElementById(tabsId);
  const grid = document.getElementById(gridId);
  let categoriaActiva = EMOJI_CATEGORIAS[0].nombre;

  function renderTabs() {
    tabs.innerHTML = EMOJI_CATEGORIAS
      .map(cat => `<button type="button" class="tab-categoria${cat.nombre === categoriaActiva ? ' activa' : ''}" data-cat="${cat.nombre}" title="${cat.nombre}">${ICONO_CATEGORIA[cat.nombre] || '🔸'}</button>`)
      .join('');
  }

  function renderGrid() {
    const termino = normalizarTexto(buscar.value.trim());

    if (termino) {
      tabs.style.display = 'none';
      const resultados = TODOS_LOS_EMOJIS.filter(item => item.texto.includes(termino));
      grid.innerHTML = resultados.length
        ? resultados.map(item => `<button type="button" title="${item.cat}">${item.e}</button>`).join('')
        : '<div class="sin-resultados">Sin resultados para tu búsqueda</div>';
      return;
    }

    tabs.style.display = 'flex';
    const cat = EMOJI_CATEGORIAS.find(c => c.nombre === categoriaActiva) || EMOJI_CATEGORIAS[0];
    grid.innerHTML = cat.emojis
      .map(([e]) => `<button type="button">${e}</button>`)
      .join('');
  }

  renderTabs();
  renderGrid();

  btn.addEventListener('click', () => {
    panel.classList.toggle('abierto');
    if (panel.classList.contains('abierto')) {
      buscar.value = '';
      renderTabs();
      renderGrid();
      buscar.focus();
    }
  });

  buscar.addEventListener('input', renderGrid);

  tabs.addEventListener('click', (e) => {
    const boton = e.target.closest('.tab-categoria');
    if (!boton) return;
    categoriaActiva = boton.dataset.cat;
    renderTabs();
    renderGrid();
  });

  grid.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      if (modo === 'insertar') {
        insertarTextoEnCursor(input, e.target.textContent);
      } else {
        input.value = e.target.textContent;
      }
      panel.classList.remove('abierto');
      if (alCambiar) alCambiar();
    }
  });
}

crearSelectorEmoji({
  btnId: 'btnAbrirEmojis', panelId: 'panelEmojis', inputId: 'inpEmoji',
  buscarId: 'buscarEmoji', tabsId: 'tabsEmojiCategorias', gridId: 'gridEmojis',
  alCambiar: actualizarFilaCopiar
});

crearSelectorEmoji({
  btnId: 'btnAbrirEmojisEdit', panelId: 'panelEmojisEdit', inputId: 'inpEditEmoji',
  buscarId: 'buscarEmojiEdit', tabsId: 'tabsEmojiCategoriasEdit', gridId: 'gridEmojisEdit',
  alCambiar: actualizarFilaCopiarNegocio
});

crearSelectorEmoji({
  btnId: 'btnAbrirEmojisDescripcion', panelId: 'panelEmojisDescripcion', inputId: 'inpDescripcion',
  buscarId: 'buscarEmojiDescripcion', tabsId: 'tabsEmojiCategoriasDescripcion', gridId: 'gridEmojisDescripcion',
  alCambiar: actualizarFilaCopiar, modo: 'insertar'
});

/* =========================================================
   AVISO DE COOKIES / ALMACENAMIENTO LOCAL
   -----------------------------------------------------------
   Se guarda en localStorage si el usuario ya respondió al
   aviso (con "Aceptar" o "Ignorar"). Una vez respondido, no
   se le vuelve a mostrar en este navegador, sin importar si
   inició sesión o no.
   ========================================================= */
const CLAVE_COOKIES_ACEPTADAS = 'mapaCookiesRespondidas';
const barraCookies = document.getElementById('barraCookies');

function mostrarBarraCookiesSiHaceFalta() {
  if (!localStorage.getItem(CLAVE_COOKIES_ACEPTADAS)) {
    barraCookies.classList.add('visible');
  }
}

function ocultarBarraCookies() {
  localStorage.setItem(CLAVE_COOKIES_ACEPTADAS, '1');
  barraCookies.classList.remove('visible');
}

document.getElementById('btnAceptarCookies').addEventListener('click', ocultarBarraCookies);
document.getElementById('btnIgnorarCookies').addEventListener('click', ocultarBarraCookies);

mostrarBarraCookiesSiHaceFalta();

/* =========================================================
   MODAL "AVISO DE PRIVACIDAD"
   ========================================================= */
const overlayPrivacidad = document.getElementById('overlayPrivacidad');

function abrirAvisoPrivacidad() {
  overlayPrivacidad.classList.add('abierto');
}
function cerrarAvisoPrivacidad() {
  overlayPrivacidad.classList.remove('abierto');
}

document.getElementById('btnAvisoPrivacidad').addEventListener('click', () => {
  sidebar.classList.remove('abierto');
  abrirAvisoPrivacidad();
});
document.getElementById('btnVerPrivacidadCookies').addEventListener('click', abrirAvisoPrivacidad);
document.getElementById('btnCerrarPrivacidad').addEventListener('click', cerrarAvisoPrivacidad);
overlayPrivacidad.addEventListener('click', (e) => {
  if (e.target === overlayPrivacidad) cerrarAvisoPrivacidad();
});

/* =========================================================
   AJUSTES DE CUENTA (nombre visible, modo oscuro y color de
   acento). El modo oscuro y el color de acento se guardan en
   localStorage: son una preferencia "de este navegador", no
   algo que se comparta con nadie más. El apodo se guarda por
   cuenta (uid de Google) para que cada quien vea su propio
   nombre en este mismo navegador.
   ========================================================= */
const overlayAjustesCuenta = document.getElementById('overlayAjustesCuenta');
const imgAjustesCuenta = document.getElementById('imgAjustesCuenta');
const nombreAjustesCuenta = document.getElementById('nombreAjustesCuenta');
const correoAjustesCuenta = document.getElementById('correoAjustesCuenta');
const inpApodoCuenta = document.getElementById('inpApodoCuenta');
const btnGuardarApodo = document.getElementById('btnGuardarApodo');
const btnModoClaro = document.getElementById('btnModoClaro');
const btnModoOscuro = document.getElementById('btnModoOscuro');
const inpColorAcento = document.getElementById('inpColorAcento');
const btnBienvenidaSi = document.getElementById('btnBienvenidaSi');
const btnBienvenidaNo = document.getElementById('btnBienvenidaNo');
const btnCerrarSesionAjustes = document.getElementById('btnCerrarSesionAjustes');
const btnCerrarAjustesCuenta = document.getElementById('btnCerrarAjustesCuenta');

const CLAVE_MODO_OSCURO = 'mapaModoOscuro';
const CLAVE_COLOR_ACENTO = 'mapaColorAcento';
const claveApodo = (uid) => 'mapaApodo_' + uid;

function aplicarModoOscuro(activo) {
  document.body.classList.toggle('modo-oscuro', activo);
  btnModoClaro.classList.toggle('activo', !activo);
  btnModoOscuro.classList.toggle('activo', activo);
  localStorage.setItem(CLAVE_MODO_OSCURO, activo ? '1' : '0');
}

function aplicarColorAcento(color) {
  document.documentElement.style.setProperty('--color-acento', color);
  inpColorAcento.value = color;
  localStorage.setItem(CLAVE_COLOR_ACENTO, color);
}

// Preferencia de la pantalla de bienvenida (mostrarla o no al entrar
// o recargar la página). CLAVE_MOSTRAR_BIENVENIDA y
// debeMostrarBienvenida() ya están definidas arriba, junto con el
// resto de la lógica de la pantalla de bienvenida.
function aplicarPreferenciaBienvenida(mostrar) {
  btnBienvenidaSi.classList.toggle('activo', mostrar);
  btnBienvenidaNo.classList.toggle('activo', !mostrar);
  localStorage.setItem(CLAVE_MOSTRAR_BIENVENIDA, mostrar ? '1' : '0');
}

// Aplica de inmediato las preferencias que ya estaban guardadas en
// este navegador (funciona haya o no sesión iniciada).
aplicarModoOscuro(localStorage.getItem(CLAVE_MODO_OSCURO) === '1');
const colorAcentoGuardado = localStorage.getItem(CLAVE_COLOR_ACENTO);
if (colorAcentoGuardado) aplicarColorAcento(colorAcentoGuardado);
aplicarPreferenciaBienvenida(debeMostrarBienvenida());

btnModoClaro.addEventListener('click', () => aplicarModoOscuro(false));
btnModoOscuro.addEventListener('click', () => aplicarModoOscuro(true));
inpColorAcento.addEventListener('input', (e) => aplicarColorAcento(e.target.value));
btnBienvenidaSi.addEventListener('click', () => aplicarPreferenciaBienvenida(true));
btnBienvenidaNo.addEventListener('click', () => aplicarPreferenciaBienvenida(false));

btnCerrarAjustesCuenta.addEventListener('click', () => overlayAjustesCuenta.classList.remove('abierto'));
overlayAjustesCuenta.addEventListener('click', (e) => {
  if (e.target === overlayAjustesCuenta) overlayAjustesCuenta.classList.remove('abierto');
});

// El botón de cuenta (arriba a la derecha y en el menú) abre este
// panel cuando ya hay sesión iniciada; el propio script de Firebase
// (más abajo) llama a esta función y a cerrarSesionGoogle().
window.abrirAjustesCuenta = function (usuario) {
  const apodoGuardado = localStorage.getItem(claveApodo(usuario.uid));
  imgAjustesCuenta.style.display = usuario.photoURL ? 'block' : 'none';
  if (usuario.photoURL) imgAjustesCuenta.src = usuario.photoURL;
  nombreAjustesCuenta.textContent = apodoGuardado || usuario.displayName || 'Tu cuenta';
  correoAjustesCuenta.textContent = usuario.email || '';
  inpApodoCuenta.value = apodoGuardado || '';
  overlayAjustesCuenta.classList.add('abierto');
};

btnGuardarApodo.addEventListener('click', () => {
  const usuario = window.firebaseAuth && window.firebaseAuth.currentUser;
  if (!usuario) return;
  const nuevoApodo = inpApodoCuenta.value.trim();
  if (nuevoApodo) localStorage.setItem(claveApodo(usuario.uid), nuevoApodo);
  else localStorage.removeItem(claveApodo(usuario.uid));
  nombreAjustesCuenta.textContent = nuevoApodo || usuario.displayName || 'Tu cuenta';
  if (window.refrescarUiCuenta) window.refrescarUiCuenta();
});

btnCerrarSesionAjustes.addEventListener('click', () => {
  overlayAjustesCuenta.classList.remove('abierto');
  if (window.cerrarSesionGoogle) window.cerrarSesionGoogle();
});

/* =========================================================
   ARRANQUE
   ========================================================= */
actualizarCajaFiltroActivo();
cargarNegociosDesdeSheet();

// Si el usuario ya eligió "No mostrarla" en Ajustes de cuenta →
// Pantalla de bienvenida, se salta directo al mapa (sin animación,
// como si la pantalla no existiera).
if (!debeMostrarBienvenida()) {
  pantallaBienvenida.style.transition = 'none';
  cerrarBienvenidaYMostrarMapa();
}
