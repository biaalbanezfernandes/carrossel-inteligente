/**
 * ==========================================================================
 * CARROSSEL INTELIGENTE MAKER - RECONHECIMENTO DE VOZ ULTRA-RÁPIDO (voice.js)
 * ==========================================================================
 * - Resposta Imediata (Zero Delay).
 * - Desliga e Liga sem hesitação.
 * - Tratamento universal de termos e sinônimos.
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
    this.recognition.continuous = false; // Mais confiável no Android e iOS
    this.recognition.interimResults = true; // Permite pegar a palavra no mesmo milissegundo
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

      // Remove acentos e caracteres especiais
      const clean = transcript.normalize("NFD")
                              .replace(/[\u0300-\u036f]/g, "")
                              .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
                              .toLowerCase()
                              .trim();

      if (!clean) return;

      // 1. RECONHECIMENTO DE DESLIGAR (PRIORIDADE ABSOLUTA)
      const isDesligar = clean.includes('deslig') ||
                         clean.includes('parar') ||
                         clean.includes('pare') ||
                         clean.includes('para') ||
                         clean.includes('apag') ||
                         clean.includes('stop') ||
                         clean.includes('desat') ||
                         clean.includes('corta');

      // 2. RECONHECIMENTO DE LIGAR (SÓ SE NÃO FOR DESLIGAR)
      const isLigar = !isDesligar && (
                         clean.includes('lig') ||
                         clean.includes('inici') ||
                         clean.includes('ativ') ||
                         clean.includes('rod') ||
                         clean.includes('gir') ||
                         clean.includes('start')
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
