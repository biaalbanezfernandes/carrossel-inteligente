/**
 * ==========================================================================
 * CARROSSEL INTELIGENTE MAKER - RECONHECIMENTO DE VOZ ULTRA-RÁPIDO (voice.js)
 * ==========================================================================
 * - Comandos: POWER_ON (Ligar) e POWER_OFF (Desligar)
 * - Resposta Imediata (Zero Delay).
 * - Prioridade absoluta para o comando de DESLIGAR.
 */

class VoiceRecognitionManager {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isSupported = false;
    this.alreadyHandled = false;

    this.onResultCallback = null;
    this.onStatusChangeCallback = null;

    this.init();
  }

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[Voice] Web Speech API não suportada neste navegador.');
      this.isSupported = false;
      return;
    }

    this.isSupported = true;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'pt-BR';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.alreadyHandled = false;
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback('listening', 'Escutando... Diga "Ligar" ou "Desligar"');
      }
    };

    this.recognition.onresult = (event) => {
      if (this.alreadyHandled) return;

      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript + ' ';
      }
      transcript = transcript.trim();

      // Normaliza sem acentos e sem pontuações
      const clean = transcript.normalize("NFD")
                              .replace(/[\u0300-\u036f]/g, "")
                              .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
                              .toLowerCase()
                              .trim();

      if (!clean) return;

      // 1. RECONHECIMENTO DE DESLIGAR (PRIORIDADE TOTAL)
      const isDesligar = clean.includes('deslig') ||
                         clean.includes('parar') ||
                         clean.includes('pare') ||
                         clean.includes('para') ||
                         clean.includes('apag') ||
                         clean.includes('stop') ||
                         clean.includes('desat') ||
                         clean.includes('corta') ||
                         clean === 'off';

      // 2. RECONHECIMENTO DE LIGAR (SÓ SE NÃO FOR DESLIGAR)
      const isLigar = !isDesligar && (
                         clean.includes('lig') ||
                         clean.includes('inici') ||
                         clean.includes('ativ') ||
                         clean.includes('rod') ||
                         clean.includes('gir') ||
                         clean.includes('start') ||
                         clean === 'on'
                      );

      if (isDesligar) {
        this.alreadyHandled = true;

        // Dispara comando explícito POWER_OFF
        try {
          if (this.onResultCallback) {
            this.onResultCallback({
              command: 'POWER_OFF',
              action: 'POWER_OFF',
              value: false,
              raw: transcript
            });
          }
          if (window.carouselApplyPower) {
            window.carouselApplyPower(false);
          }
        } catch (err) {
          console.error('[Voice] Erro ao desligar:', err);
        }

        try { this.stop(); } catch (e) {}

      } else if (isLigar) {
        this.alreadyHandled = true;

        // Dispara comando explícito POWER_ON
        try {
          if (this.onResultCallback) {
            this.onResultCallback({
              command: 'POWER_ON',
              action: 'POWER_ON',
              value: true,
              raw: transcript
            });
          }
          if (window.carouselApplyPower) {
            window.carouselApplyPower(true);
          }
        } catch (err) {
          console.error('[Voice] Erro ao ligar:', err);
        }

        try { this.stop(); } catch (e) {}
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('[Voice Error]', event.error);
      this.isListening = false;
      if (this.onStatusChangeCallback) {
        let msg = 'Toque no botão e fale.';
        if (event.error === 'not-allowed') msg = 'Permita o acesso ao microfone.';
        this.onStatusChangeCallback('error', msg);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback('idle', 'Microfone em espera (Toque para falar)');
      }
    };
  }

  onCommand(callback) {
    this.onResultCallback = callback;
  }

  onStatusChange(callback) {
    this.onStatusChangeCallback = callback;
  }

  toggle() {
    if (!this.isSupported) {
      alert('Seu navegador não suporta reconhecimento de voz Web Speech API. Use o Google Chrome.');
      return;
    }

    if (this.isListening) {
      this.stop();
    } else {
      this.start();
    }
  }

  start() {
    try {
      this.alreadyHandled = false;
      this.recognition.start();
    } catch (e) {
      console.warn('Microfone já ativo:', e);
    }
  }

  stop() {
    try {
      this.isListening = false;
      this.recognition.stop();
    } catch (e) {}
  }
}

// Instância singleton global
window.carouselVoice = new VoiceRecognitionManager();
