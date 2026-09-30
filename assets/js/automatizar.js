// Calculadora «¿Compensa automatizarlo?». Todo ocurre en el navegador:
// no guarda nada, no envía nada y no usa cookies ni almacenamiento.
(function () {
  'use strict';

  var MINUTOS_HORA = 60;
  var MESES_AÑO = 12;

  // Cálculo puro (minutos). Devuelve null si algún dato no es válido.
  function calcular(d) {
    var valores = [d.vecesAño, d.minutosAhorrados, d.horasConstruir, d.minutosMantenimientoMes, d.años];
    if (valores.some(function (v) { return !isFinite(v) || v < 0; }) || d.años === 0) return null;

    var ahorroAnual = d.vecesAño * d.minutosAhorrados;
    var mantenimientoAnual = d.minutosMantenimientoMes * MESES_AÑO;
    var construccion = d.horasConstruir * MINUTOS_HORA;
    var ahorro = ahorroAnual * d.años;
    var coste = construccion + mantenimientoAnual * d.años;
    var margenAnual = ahorroAnual - mantenimientoAnual;

    return {
      ahorro: ahorro,
      coste: coste,
      neto: ahorro - coste,
      // Años hasta recuperar la construcción; null = no se recupera nunca.
      equilibrio: margenAnual > 0 ? construccion / margenAnual : null
    };
  }

  var numero = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

  function horas(minutos) {
    return numero.format(minutos / MINUTOS_HORA) + ' h';
  }

  function plazo(años) {
    if (años === null) return 'Nunca, con estos números: el mantenimiento se come el ahorro.';
    if (años === 0) return 'Inmediato.';
    var meses = años * MESES_AÑO;
    return meses < 24 ? 'Unos ' + numero.format(Math.max(meses, 0.1)) + ' meses.' : 'Unos ' + numero.format(años) + ' años.';
  }

  function leer(form) {
    var n = function (id) { return form.elements[id].value === '' ? NaN : Number(form.elements[id].value); };
    return {
      vecesAño: n('veces'),
      minutosAhorrados: n('minutos'),
      horasConstruir: n('construir'),
      minutosMantenimientoMes: n('mantenimiento'),
      años: n('horizonte')
    };
  }

  function pintar(form, salida) {
    var r = calcular(leer(form));
    var campos = salida.querySelectorAll('[data-resultado]');
    if (!r) {
      salida.setAttribute('data-estado', 'error');
      salida.querySelector('[data-mensaje]').textContent = 'Revisa los datos: todos deben ser números positivos y el horizonte mayor que cero.';
      campos.forEach(function (el) { el.textContent = '—'; });
      return;
    }
    salida.setAttribute('data-estado', r.neto >= 0 ? 'compensa' : 'no-compensa');
    salida.querySelector('[data-resultado="ahorro"]').textContent = horas(r.ahorro);
    salida.querySelector('[data-resultado="coste"]').textContent = horas(r.coste);
    salida.querySelector('[data-resultado="neto"]').textContent = (r.neto > 0 ? '+' : '') + horas(r.neto);
    salida.querySelector('[data-resultado="equilibrio"]').textContent = plazo(r.equilibrio);
    salida.querySelector('[data-mensaje]').textContent = r.neto >= 0
      ? 'En este horizonte ganas tiempo. Antes de empezar, piensa cómo te enterarás si falla.'
      : 'En este horizonte pierdes tiempo. Quizá compense si la tarea va a durar más, o puede que no haga falta automatizarla.';
  }

  var form = document.getElementById('calculadora');
  if (!form) return;
  var salida = document.getElementById('resultado');
  form.addEventListener('input', function () { pintar(form, salida); });
  form.addEventListener('submit', function (e) { e.preventDefault(); pintar(form, salida); });
  form.hidden = false;
  salida.hidden = false;
  document.getElementById('sin-js').hidden = true;
  pintar(form, salida);
})();
