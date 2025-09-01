// main.ts

import {
  App,
  Modal,
  Notice,
  Plugin,
  getLanguage, // requer minAppVersion 1.8.0
} from 'obsidian';
import { VIEW_TYPE_SPIRITSBOOK, SpiritsBookView } from './spiritsbookView';

// ── Dados embutidos no bundle (esbuild loader .json) ───────────────────────────
import livroPt from './data/livro_pt-BR.json';
import livroEn from './data/livro_en.json';
import livroEs from './data/livro_es.json';
import livroFr from './data/livro_fr.json';

type Pergunta = { numero: number; pergunta: string; resposta: string };
type Livro = { perguntas: Pergunta[] };

/** Seleciona o JSON pelo idioma do Obsidian e normaliza para { perguntas: [...] } */
function selecionarLivroPorIdioma(): { lang: string; livro: Livro } {
  const lang = getLanguage(); // "pt-BR" | "en" | "es" | "fr"
  const map: Record<string, any> = {
    'pt-BR': livroPt,
    'en':    livroEn,
    'es':    livroEs,
    'fr':    livroFr,
  };
  let bruto = map[lang] ?? map['en'];

  // Aceita tanto um array puro quanto um objeto com { perguntas: [...] }
  const perguntas: Pergunta[] = Array.isArray(bruto)
    ? bruto
    : (Array.isArray(bruto?.perguntas) ? bruto.perguntas : []);

  if (!perguntas.length) {
    console.warn('[SpiritsBook] Nenhuma pergunta encontrada para o idioma', lang);
  }

  return { lang, livro: { perguntas } };
}

export default class SpiritsBookPlugin extends Plugin {
  /** Idioma atual reportado pelo Obsidian (ex.: "pt-BR") */
  public lang: string = 'en';
  /** Conteúdo atual do livro normalizado */
  public livro: Livro = { perguntas: [] };

  async onload() {
    // Seleciona dados de acordo com o idioma do Obsidian
    const { lang, livro } = selecionarLivroPorIdioma();
    this.lang = lang;
    this.livro = livro;

    console.log('[SpiritsBook] Language:', this.lang);
    console.log('[SpiritsBook] Perguntas carregadas:', this.livro.perguntas.length);

    // Ribbon: abre a view do plugin
    const ribbonIconEl = this.addRibbonIcon('book', 'Open The Spirit\'s Book', () => {
      new Notice('SpiritsBook activated!');
      this.activateView();
    });
    ribbonIconEl.addClass('spiritsbook-ribbon-class');

    // ÚNICO comando para abrir a view
    this.addCommand({
      id: 'open-spiritsbook-view',
      name: 'Open The Spirit’s Book',
      callback: async () => {
        await this.activateView();
      },
    });

    // Registrar a view personalizada
    this.registerView(VIEW_TYPE_SPIRITSBOOK, (leaf) => new SpiritsBookView(leaf, this));

    // Auto-ativar a view quando o layout estiver pronto
    this.app.workspace.onLayoutReady(() => {
      this.activateView();
    });
  }

  onunload() {}

  // Abre a lateral direita com a view
  async activateView() {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_SPIRITSBOOK)[0];
    if (existing) {
      await this.app.workspace.revealLeaf(existing);
    } else {
      const leaf = this.app.workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_SPIRITSBOOK,
          active: true,
        });
      } else {
        console.warn('[SpiritsBook] Could not obtain a right-side leaf.');
      }
    }
  }
}

// (Opcional) Modal de teste interno
class SpiritsBookModal extends Modal {
  constructor(app: App) { super(app); }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    const lang = getLanguage();
    console.log('[SpiritsBook] Current language:', lang);

    const container = contentEl.createDiv({ cls: 'spiritsbook-container' });
    container.createEl('div', { cls: 'spiritsbook-question', text: '1019. Where is the law of God written?' });
    container.createEl('div', { cls: 'spiritsbook-answer', text: 'In the conscience.' });

    const buttons = container.createDiv({ cls: 'spiritsbook-buttons' });
    const closeBtn = buttons.createEl('button', { cls: 'spiritsbook-button', text: 'Close' });
    closeBtn.addEventListener('click', () => this.close());
  }
  onClose() { this.contentEl.empty(); }
}
