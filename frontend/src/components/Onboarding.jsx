import { useEffect, useState } from 'react';
import Joyride, { ACTIONS, EVENTS, STATUS } from 'react-joyride';

import { useApp } from '../context/AppContext';

const STEPS = [
  {
    target: '.tour-search',
    title: 'Busca lo que quieras',
    content:
      'Escribe el nombre de una cancion, un artista o un album. COARIFY consulta Deezer y YouTube al mismo tiempo, sin que tengas que elegir.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '.tour-results',
    title: 'Explora los resultados',
    content:
      'Cada fila indica de donde viene la cancion. Deezer aporta las portadas y los datos del album; YouTube pone el audio. Doble clic para reproducir.',
    // El bloque de resultados es mas alto que la pantalla: anclado arriba o
    // abajo el globo se sale del viewport, asi que va centrado.
    placement: 'center',
  },
  {
    target: '.tour-player',
    title: 'Controla tu musica',
    content:
      'Aqui tienes play, pausa, cola, volumen y la barra de progreso. Tambien funciona con el teclado: espacio, flechas, N y P.',
    placement: 'top',
  },
  {
    target: '.tour-download',
    title: 'Descarga tus favoritas',
    content:
      'Este boton convierte la cancion a MP3 y la guarda en tu dispositivo. La calidad se elige en Configuracion.',
    placement: 'top',
  },
];

/** Tutorial de bienvenida (4 pasos). Solo aparece la primera vez. */
export function Onboarding() {
  const { tutorialSeen, setTutorialSeen, theme } = useApp();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Pequeno retraso: da tiempo a que se monten los objetivos del recorrido.
  useEffect(() => {
    if (tutorialSeen) return undefined;
    const timer = setTimeout(() => setRun(true), 700);
    return () => clearTimeout(timer);
  }, [tutorialSeen]);

  const handleCallback = (data) => {
    const { status, type, action, index } = data;

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
      setStepIndex(0);
      setTutorialSeen(true);
      return;
    }

    if ([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND].includes(type)) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }
  };

  if (tutorialSeen) return null;

  const light = theme === 'light';

  return (
    <Joyride
      steps={STEPS}
      run={run}
      stepIndex={stepIndex}
      callback={handleCallback}
      continuous
      showProgress
      showSkipButton
      disableScrolling
      disableOverlayClose
      scrollToFirstStep={false}
      locale={{
        back: 'Atras',
        close: 'Cerrar',
        last: 'Empezar a escuchar',
        next: 'Siguiente',
        // Sin esta clave, react-joyride cae en su texto en ingles al mostrar el progreso.
        nextLabelWithProgress: 'Siguiente ({step} de {steps})',
        skip: 'Saltar',
      }}
      floaterProps={{ disableAnimation: true }}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: '#D4AF37',
          backgroundColor: light ? '#ffffff' : '#131a28',
          textColor: light ? '#12203a' : '#eef2fb',
          arrowColor: light ? '#ffffff' : '#131a28',
          overlayColor: 'rgba(5, 8, 15, .72)',
          width: 380,
        },
        tooltipTitle: { fontSize: 16, fontWeight: 800, marginBottom: 6 },
        tooltipContent: { fontSize: 13.5, lineHeight: 1.6, padding: '6px 0 2px' },
        buttonNext: {
          backgroundColor: '#D4AF37',
          color: '#10182a',
          fontWeight: 700,
          borderRadius: 10,
          padding: '9px 16px',
          fontSize: 13,
        },
        buttonBack: { color: light ? '#5b6a88' : '#94a0bb', fontSize: 13, marginRight: 8 },
        buttonSkip: { color: light ? '#5b6a88' : '#94a0bb', fontSize: 13 },
        tooltip: { borderRadius: 16, padding: 20 },
      }}
    />
  );
}

export default Onboarding;
