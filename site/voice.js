/**
 * ==========================================================================
 * CARROSSEL INTELIGENTE MAKER - RECONHECIMENTO DE VOZ (voice.js)
 * ==========================================================================
 * Reconhecimento local no navegador/celular via Web Speech API (pt-BR).
 * Comandos obrigatórios:
 * - "Ligar" -> Aciona o carrossel completo
 * - "Desligar" -> Para o carrossel com segurança
 * Suporta sinônimos naturais e comandos pontuais.
 */

class VoiceRecognitionManager {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isSupported = false;

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
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 2;

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback('listening', 'Ouvindo... Fale "Ligar" ou "Desligar"');
      }
    };

    this.recognition.onresult = (event) => {
      let matchedText = '';
      for (let i = 0; i < event.results.length; i++) {
        matchedText += event.results[i][0].transcript.toLowerCase() + ' ';
      }
      matchedText = matchedText.trim();
      this.processTranscript(matchedText);
    };

    this.recognition.onerror = (event) => {
      console.error('[Voice Error]', event.error);
      this.isListening = false;
      let errorMsg = `Erro no reconhecimento: ${event.error}`;
      if (event.error === 'not-allowed') {
        errorMsg = 'Permissão de microfone negada no navegador.';
      } else if (event.error === 'no-speech') {
        errorMsg = 'Nenhuma fala detectada. Tente falar mais próximo ao microfone.';
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
      alert('Seu navegador atual não suporta reconhecimento de voz Web Speech API (pt-BR). Experimente o Google Chrome ou Microsoft Edge.');
      return;
    }

    if (this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
    } else {
      try {
        this.recognition.start();
      } catch (e) {
        console.error('Falha ao iniciar reconhecimento:', e);
      }
    }
  }

  processTranscript(text) {
    console.log('[Voice Transcript]', text);
    let identifiedAction = null;

    // Normalização sem acentos e remoção de pontuações (ex: "desligar.") para garantir precisão absoluta
    const clean = text.normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
                      .toLowerCase()
                      .trim();

    // 1. REGRA CRÍTICA: Checar DESLIGAR PRIMEIRO, pois a palavra "desligar" contém as letras "ligar" e "liga"
    const isDesligar = /\b(desligar|desliga|desligue|desativa|desativar|desative|parar|pare|para|interromper|corta)\b/.test(clean) ||
                       clean.includes('deslig') ||
                       clean.includes('desativ') ||
                       clean.includes('parar') ||
                       clean.includes('pare');

    // 2. Comandos de LIGAR
    const isLigar = /\b(ligar|liga|ligue|iniciar|inicia|inicie|ativar|ativa|ative|rodar|gira|girar)\b/.test(clean) ||
                    clean.includes('inici') ||
                    clean.includes('rodar') ||
                    clean.includes('ativ');

    if (isDesligar) {
      identifiedAction = { action: 'POWER', value: false, raw: text };
    } else if (isLigar || clean.includes('liga')) {
      identifiedAction = { action: 'POWER', value: true, raw: text };
    }

    if (this.onResultCallback && identifiedAction) {
      this.onResultCallback(identifiedAction);
    } else if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback('unrecognized', `Não entendi: "${text}". Diga "Ligar" ou "Desligar".`);
    }
  }
}

// Instância singleton global
window.carouselVoice = new VoiceRecognitionManager();
