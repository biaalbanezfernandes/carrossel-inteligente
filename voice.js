/**
 * ==========================================================================
 * CARROSSEL INTELIGENTE MAKER - RECONHECIMENTO DE VOZ INSTANTÂNEO (voice.js)
 * ==========================================================================
 * Resposta em TEMPO REAL (Zero Delay via interimResults).
 * Dispara o comando no exato milissegundo em que a palavra é dita.
 * Comandos obrigatórios:
 * - "Ligar" -> Liga o carrossel na hora
 * - "Desligar" -> Desliga o carrossel na hora
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
      console.warn('[Voice] Web Speech API não é suportada neste navegador.');
      this.isSupported = false;
      return;
    }

    this.isSupported = true;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'pt-BR';
    this.recognition.continuous = true;
    this.recognition.interimResults = true; // RESPOSTA INSTANTÂNEA EM TEMPO REAL!
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.alreadyHandled = false;
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback('listening', 'Ouvindo... Diga "Ligar" ou "Desligar"');
      }
    };

    this.recognition.onresult = (event) => {
      if (this.alreadyHandled) return;

      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript + ' ';
      }
      transcript = transcript.trim().toLowerCase();

      // Normalização sem acentos e remoção de pontuações (ex: "desligar.")
      const clean = transcript.normalize("NFD")
                              .replace(/[\u0300-\u036f]/g, "")
                              .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
                              .toLowerCase()
                              .trim();

      // 1. Prioridade absoluta para DESLIGAR
      const isDesligar = clean.includes('deslig') ||
                         clean.includes('desativ') ||
                         clean.includes('parar') ||
                         clean.includes('pare') ||
                         clean.includes('para') ||
                         clean.includes('stop') ||
                         clean.includes('corta');

      // 2. Comando LIGAR (somente se não for desligar)
      const isLigar = !isDesligar && (
                         clean.includes('lig') ||
                         clean.includes('inici') ||
                         clean.includes('ativ') ||
                         clean.includes('rodar') ||
                         clean.includes('gira')
                      );

      if (isDesligar) {
        this.alreadyHandled = true;
        this.stop();
        if (this.onResultCallback) {
          this.onResultCallback({ action: 'POWER', value: false, raw: transcript });
        }
      } else if (isLigar) {
        this.alreadyHandled = true;
        this.stop();
        if (this.onResultCallback) {
          this.onResultCallback({ action: 'POWER', value: true, raw: transcript });
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.error('[Voice Error]', event.error);
      this.isListening = false;
      let errorMsg = `Erro no microfone: ${event.error}`;
      if (event.error === 'not-allowed') {
        errorMsg = 'Permissão de microfone negada no navegador.';
      } else if (event.error === 'no-speech') {
        errorMsg = 'Nenhuma fala detectada. Toque no botão e fale.';
      }
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback('error', errorMsg);
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
      alert('Seu navegador atual não suporta reconhecimento de voz Web Speech API (pt-BR). Use o Google Chrome.');
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
      console.warn('Microfone já ativo ou ocupado:', e);
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
