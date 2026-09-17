  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-analytics.js";
  import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
  } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

  // Configuración de tu app Firebase (elpolodancer)
  const firebaseConfig = {
    apiKey: "AIzaSyA80l29AWAR3x1NCDoRPyhtM6c0JOYqoAA",
    authDomain: "elpolodancer.firebaseapp.com",
    projectId: "elpolodancer",
    storageBucket: "elpolodancer.firebasestorage.app",
    messagingSenderId: "397139900415",
    appId: "1:397139900415:web:607e9bf57256af3363d9ca",
    measurementId: "G-Q1EQZX0EZK"
  };

  const firebaseApp = initializeApp(firebaseConfig);
  const analytics = getAnalytics(firebaseApp);

  // Se exponen por si luego quieres usarlos desde el script principal
  // (por ejemplo, para registrar eventos con logEvent(analytics, "...")).
  window.firebaseApp = firebaseApp;
  window.firebaseAnalytics = analytics;

  /* =========================================================
     INICIO DE SESIÓN CON GOOGLE (Firebase Authentication)
     -----------------------------------------------------------
     Botón circular #btnCuenta (arriba a la derecha) e ítem del
     menú lateral #btnCuentaSidebar hacen lo mismo: si no hay
     sesión, abren el popup de Google; si ya hay sesión, piden
     confirmación para cerrarla. onAuthStateChanged mantiene
     ambos elementos sincronizados con el estado real de Firebase.
     ========================================================= */
  const auth = getAuth(firebaseApp);
  const proveedorGoogle = new GoogleAuthProvider();
  window.firebaseAuth = auth;

  const btnCuenta = document.getElementById('btnCuenta');
  const btnCuentaSidebar = document.getElementById('btnCuentaSidebar');
  const cuentaInfoSidebar = document.getElementById('cuentaInfoSidebar');

  /* =========================================================
     BOTONES DE ADMINISTRADOR: solo visibles para tus correos
     -----------------------------------------------------------
     "➕ Nuevo marcador" (barra lateral), "⚙️ Configuración"
     (dentro del panel "Ver negocio") y "💾 Guardar cambios en la
     hoja" (dentro de los dos modales de edición) están ocultos
     por defecto en styles.css y aquí se muestran solo si la
     sesión activa es una de las cuentas autorizadas — la misma
     lista de correos que ya usa el Apps Script (ADMIN_EMAILS en
     apps-script-mapa-morelia.gs). Si agregas o quitas un correo,
     actualiza los dos lugares.

     Ocultar estos botones en el navegador NO es seguridad real
     (cualquiera con algo de conocimiento técnico podría mostrarlos
     a mano desde las herramientas de desarrollador): solo evita
     que alguien los vea o los use por accidente. La protección de
     verdad — que nadie no autorizado pueda escribir en tu hoja —
     está en el Apps Script, que valida el correo del idToken en
     el servidor antes de guardar o actualizar cualquier fila.
     ========================================================= */
  const CORREOS_ADMIN = [
    'dulceprincesa086@gmail.com',
    'polo.pericoperico55@gmail.com'
  ];

  function actualizarVisibilidadBotonesAdmin(usuario) {
    const correo = (usuario && usuario.email || '').toLowerCase();
    const esAdmin = CORREOS_ADMIN.includes(correo);
    const ids = ['btnNuevoMarcador', 'btnConfigNegocio', 'filaBotonAdminNegocio', 'filaBotonAdminNegocioInactivo'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.display = esAdmin ? 'flex' : 'none';
    });
  }

  async function iniciarSesionGoogle() {
    try {
      await signInWithPopup(auth, proveedorGoogle);
    } catch (error) {
      console.error('No se pudo iniciar sesión con Google:', error);
      alert('No se pudo iniciar sesión con Google. Inténtalo de nuevo.');
    }
  }

  async function cerrarSesionGoogle() {
    if (confirm('¿Cerrar la sesión de tu cuenta de Google?')) {
      await signOut(auth);
    }
  }
  window.cerrarSesionGoogle = cerrarSesionGoogle;

  function actualizarUiCuenta(usuario) {
    if (usuario) {
      // Si la persona guardó un apodo desde "Ajustes de cuenta", ese
      // nombre manda sobre el nombre de su cuenta de Google — solo
      // en este navegador (se guarda con localStorage).
      const apodoGuardado = localStorage.getItem('mapaApodo_' + usuario.uid);
      const nombreMostrado = apodoGuardado || usuario.displayName || usuario.email;

      btnCuenta.classList.add('conectado');
      btnCuenta.title = `Sesión iniciada como ${nombreMostrado} — clic para ver ajustes de cuenta`;
      btnCuenta.innerHTML = usuario.photoURL
        ? `<img src="${usuario.photoURL}" alt="${nombreMostrado}">`
        : '🙂';

      cuentaInfoSidebar.innerHTML = usuario.photoURL
        ? `<img src="${usuario.photoURL}" alt=""> <span class="cuenta-nombre">${nombreMostrado}</span>`
        : `👤 <span class="cuenta-nombre">${nombreMostrado}</span>`;
    } else {
      btnCuenta.classList.remove('conectado');
      btnCuenta.title = 'Iniciar sesión con Google';
      btnCuenta.innerHTML = '👤';
      cuentaInfoSidebar.innerHTML = '👤 Iniciar sesión con Google';
    }
  }

  // Permite que "Ajustes de cuenta" refresque el botón y el menú
  // en cuanto se guarda un apodo nuevo, sin esperar a otro evento.
  window.refrescarUiCuenta = () => actualizarUiCuenta(auth.currentUser);

  onAuthStateChanged(auth, (usuario) => {
    actualizarUiCuenta(usuario);
    actualizarVisibilidadBotonesAdmin(usuario);
  });

  function alPresionarBotonCuenta() {
    if (auth.currentUser) {
      if (window.abrirAjustesCuenta) window.abrirAjustesCuenta(auth.currentUser);
    } else {
      iniciarSesionGoogle();
    }
  }

  btnCuenta.addEventListener('click', alPresionarBotonCuenta);
  btnCuentaSidebar.addEventListener('click', alPresionarBotonCuenta);
