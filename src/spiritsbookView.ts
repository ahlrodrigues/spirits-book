// src/spiritsbookView.ts
import { ItemView, WorkspaceLeaf, Notice } from "obsidian";
import type SpiritsBookPlugin from "./main";

export const VIEW_TYPE_SPIRITSBOOK = "spiritsbook-view";

type SupportedLanguage = 'pt-BR' | 'en' | 'es' | 'fr';

const i18n: Record<SupportedLanguage, Record<string, string>> = {
  "pt-BR": {
    title: "Livro dos Espíritos",
    question: "Pergunta",
    all: "📖 Todas",
    favorites: "⭐ Favoritas",
    favoritesTitle: "⭐ Perguntas favoritas:",
    previous: "⬅️ Anterior",
    next: "Próxima ➡️",
    favorite: "⭐ Favoritar",
    unfavorite: "❌ Desfavoritar",
    random: "🎲 Aleatória",
    removedFromFavorites: "❌ Removido dos favoritos",
    addedToFavorites: "⭐ Adicionado aos favoritos",
    randomShown: "🎲 Pergunta aleatória exibida",
    errorLoading: "Erro ao carregar o conteúdo do livro.",
    noFavorites: "Nenhuma pergunta favorita ainda."
  },
  "en": {
    title: "The Spirits' Book",
    question: "Question",
    all: "📖 All",
    favorites: "⭐ Favorites",
    favoritesTitle: "⭐ Favorite Questions:",
    previous: "⬅️ Previous",
    next: "Next ➡️",
    favorite: "⭐ Favorite",
    unfavorite: "❌ Unfavorite",
    random: "🎲 Random",
    removedFromFavorites: "❌ Removed from favorites",
    addedToFavorites: "⭐ Added to favorites",
    randomShown: "🎲 Random question shown",
    errorLoading: "Failed to load book content.",
    noFavorites: "No favorite questions yet."
  },
  "es": {
    title: "El Libro de los Espíritus",
    question: "Pregunta",
    all: "📖 Todas",
    favorites: "⭐ Favoritas",
    favoritesTitle: "⭐ Preguntas favoritas:",
    previous: "⬅️ Anterior",
    next: "Siguiente ➡️",
    favorite: "⭐ Favorita",
    unfavorite: "❌ Quitar favorita",
    random: "🎲 Aleatoria",
    removedFromFavorites: "❌ Eliminado de favoritos",
    addedToFavorites: "⭐ Añadido a favoritos",
    randomShown: "🎲 Pregunta aleatoria mostrada",
    errorLoading: "Error al cargar el contenido del libro.",
    noFavorites: "Aún no hay preguntas favoritas."
  },
  "fr": {
    title: "Le Livre des Esprits",
    question: "Question",
    all: "📖 Toutes",
    favorites: "⭐ Favoris",
    favoritesTitle: "⭐ Questions favorites :",
    previous: "⬅️ Précédente",
    next: "Suivante ➡️",
    favorite: "⭐ Favori",
    unfavorite: "❌ Retirer des favoris",
    random: "🎲 Aléatoire",
    removedFromFavorites: "❌ Supprimé des favoris",
    addedToFavorites: "⭐ Ajouté aux favoris",
    randomShown: "🎲 Question aléatoire affichée",
    errorLoading: "Échec du chargement du contenu du livre.",
    noFavorites: "Aucune question favorite pour le moment."
  }
};

export class SpiritsBookView extends ItemView {
  private plugin: SpiritsBookPlugin;
  private container!: HTMLElement;
  private questions: Array<{ numero: number; pergunta: string; resposta: string }> = [];
  private currentIndex = 0;
  private favorites = new Set<number>();
  private favBtnEl: HTMLButtonElement | null = null;
  private currentTab: 'all' | 'favorites' = 'all';

  constructor(leaf: WorkspaceLeaf, plugin: SpiritsBookPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() { return VIEW_TYPE_SPIRITSBOOK; }

  getDisplayText() {
    const lang = this.getLang();
    return i18n[lang].title;
  }

  getIcon() { return "book"; }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    this.container = contentEl;

    await this.loadQuestions();
    this.renderUI();
  }

  async onClose() {
    this.contentEl.empty();
  }

  // Language + data
  private getLang(): SupportedLanguage {
    const lang = (this.plugin?.lang ?? "en") as SupportedLanguage;
    return (['pt-BR','en','es','fr'] as SupportedLanguage[]).includes(lang) ? lang : 'en';
    // (se quiser, pode mapear "pt" → "pt-BR" aqui)
  }

  private async loadQuestions() {
    const lang = this.getLang();
    try {
      const livro: any = (this.plugin as any)?.livro;
      const qs = Array.isArray(livro) ? livro : (livro?.perguntas ?? []);
      this.questions = Array.isArray(qs) ? qs : [];
      console.log('[SpiritsBook] loadQuestions | lang:', lang, '| total:', this.questions.length);
      if (!this.questions.length) new Notice(i18n[lang].errorLoading);
    } catch (e) {
      console.error("[SpiritsBook] Error loading questions:", e);
      new Notice(i18n[lang].errorLoading);
      this.questions = [];
    }
  }

  // UI
  private renderUI() {
    if (!this.questions.length) return;

    const lang = this.getLang();
    const t = i18n[lang];
    this.currentTab = 'all';

    this.container.empty();
    const wrapper = this.container.createDiv({ cls: "spiritsbook-wrapper" });

    const title = wrapper.createEl("h1", { text: "📘 " + this.getDisplayText() });
    title.addClass("spiritsbook-title");

    const tabs = wrapper.createDiv({ cls: "spiritsbook-tabs" });
    // Estamos na aba "all": sempre ofereça ir para "favorites"
    const tabFav = tabs.createEl("button", { text: t.favorites });
    tabFav.onclick = () => this.renderFavorites();

    wrapper.createDiv({ cls: "spiritsbook-display" });

    const nav = wrapper.createDiv({ cls: "spiritsbook-nav" });
    const prevBtn = nav.createEl("button", { text: t.previous });
    const nextBtn = nav.createEl("button", { text: t.next });
    prevBtn.onclick = () => this.showQuestion(this.currentIndex - 1);
    nextBtn.onclick = () => this.showQuestion(this.currentIndex + 1);

    const favContainer = wrapper.createDiv({ cls: "spiritsbook-fav-container" });
    this.favBtnEl = favContainer.createEl("button");
    this.updateFavoriteButton();
    this.favBtnEl.onclick = () => { this.toggleFavorite(); this.updateFavoriteButton(); };

    const rndBtn = favContainer.createEl("button", { text: t.random });
    rndBtn.onclick = () => this.showRandom();

    const footer = wrapper.createDiv({ cls: "spiritsbook-footer" });
    const select = footer.createEl("select") as HTMLSelectElement;
    this.questions.forEach((q, i) => {
      select.add(new Option(`#${q.numero} - ${q.pergunta?.substring(0, 50) || "..."}`, i.toString()));
    });
    select.onchange = () => this.showQuestion(parseInt(select.value, 10));

    this.showQuestion(this.currentIndex);
  }

  private renderFavorites() {
    const lang = this.getLang();
    const t = i18n[lang];
    this.currentTab = 'favorites';

    this.container.empty();
    const wrapper = this.container.createDiv({ cls: "spiritsbook-wrapper" });

    const favTitle = wrapper.createEl("h1", { text: t.favoritesTitle });
    favTitle.addClass("spiritsbook-title");

    const tabs = wrapper.createDiv({ cls: "spiritsbook-tabs" });
    // Estamos na aba "favorites": sempre ofereça voltar para "all"
    const tabAll = tabs.createEl("button", { text: t.all });
    tabAll.onclick = () => this.renderUI();

    const favs = this.questions.filter(q => this.favorites.has(q.numero));
    if (!favs.length) {
      wrapper.createEl("p", { text: t.noFavorites });
      return;
    }

    const list = wrapper.createEl("ul", { cls: "favorites-list" });
    favs.forEach((q) => {
      const li = list.createEl("li");
      li.createEl("a", {
        text: `#${q.numero} - ${q.pergunta?.substring(0, 50) || "..."}`,
        href: "#"
      }).onclick = (e) => {
        e.preventDefault();
        const index = this.questions.findIndex(item => item.numero === q.numero);
        this.renderUI();
        setTimeout(() => this.showQuestion(index), 0);
      };
    });
  }

  private showQuestion(index: number) {
    if (index < 0 || index >= this.questions.length) return;
    this.currentIndex = index;
    const q = this.questions[index];

    const display = this.container.querySelector(".spiritsbook-display") as HTMLDivElement | null;
    if (!display) return;
    display.empty();

    const lang = this.getLang();
    const questionLabel = i18n[lang].question;

    const questionEl = display.createDiv({ cls: "spiritsbook-question" });
    const h2 = questionEl.createEl("h2", { text: `${questionLabel} ${q.numero}` });
    h2.addClass("spiritsbook-question-title");

    questionEl.createEl("p", { text: q.pergunta });
    const answerEl = display.createEl("blockquote", { text: q.resposta });
    answerEl.addClass("spiritsbook-answer");

    this.updateFavoriteButton();
  }

  private updateFavoriteButton() {
    if (!this.favBtnEl) return;
    const lang = this.getLang();
    const t = i18n[lang];
    const q = this.questions[this.currentIndex];
    if (!q) return;
    this.favBtnEl.setText(this.favorites.has(q.numero) ? t.unfavorite : t.favorite);
  }

  private toggleFavorite() {
    const lang = this.getLang();
    const t = i18n[lang];
    const q = this.questions[this.currentIndex];
    if (!q) return;

    if (this.favorites.has(q.numero)) {
      this.favorites.delete(q.numero);
      new Notice(`${t.removedFromFavorites}: #${q.numero}`);
    } else {
      this.favorites.add(q.numero);
      new Notice(`${t.addedToFavorites}: #${q.numero}`);
    }
  }

  private showRandom() {
    const lang = this.getLang();
    const t = i18n[lang];
    if (!this.questions.length) return;

    const index = Math.floor(Math.random() * this.questions.length);
    this.showQuestion(index);
    new Notice(t.randomShown);
  }
}
