// Defines a constant for identifying the custom view type used by the plugin within Obsidian
export const VIEW_TYPE_SPIRITSBOOK = "spiritsbook-view";

// Required imports from Obsidian API and Node modules
import { ItemView, WorkspaceLeaf, Notice, FileSystemAdapter } from "obsidian";
import * as fs from 'fs/promises';
import * as path from 'path';

// Type for language support
type SupportedLanguage = 'pt-BR' | 'en' | 'es' | 'fr';

// UI translations for supported languages
const i18n: Record<SupportedLanguage, { [key: string]: string }> = {
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
    favoritesTitle: "⭐ Questions favorites :",
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

// The main view class for the plugin, representing the UI interface
export class SpiritsBookView extends ItemView {
  plugin: any;
  container: HTMLElement;
  questions: any[] = [];
  currentIndex: number = 0;
  favorites: Set<number> = new Set();
  favBtnEl: HTMLButtonElement | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: any) {
    super(leaf);
    this.plugin = plugin;
  }

  // Returns the view type identifier
  getViewType() {
    return VIEW_TYPE_SPIRITSBOOK;
  }

  // Returns the localized title of the plugin
  getDisplayText() {
    const lang = (this.plugin.settings.language || "en") as SupportedLanguage;
    return i18n[lang].title;
  }

  // Returns an icon identifier for the view
  getIcon() {
    return "book";
  }

  // Called when the view is opened — loads styles, questions and renders UI
  async onOpen() {
    this.container = this.containerEl.children[1] as HTMLElement;
    this.container.empty();
    await this.loadQuestions();
    this.renderUI();
  }

// Loads the questions from a JSON file according to the selected language
async loadQuestions() {
  const lang = (this.plugin.settings.language || "en") as SupportedLanguage;
  try {
    const adapter = this.plugin.app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) {
      new Notice("Incompatible storage adapter.");
      return;
    }

    const basePath = adapter.getBasePath();
    const configDir = this.plugin.app.vault.configDir;
    const pluginFolder = path.join(configDir, "plugins", "obsisdian-spirits-book");
    let dataPath: string;

    try {
      const overridePathRaw = await fs.readFile(
        path.join(basePath, pluginFolder, "path.json"),
        "utf-8"
      );
      const override = JSON.parse(overridePathRaw);
      dataPath = path.isAbsolute(override.path)
        ? override.path
        : path.join(basePath, override.path);
    } catch {
      dataPath = path.join(basePath, pluginFolder, "data");
    }

    const fullPath = path.join(dataPath, `livro_${lang}.json`);
    const content = await fs.readFile(fullPath, "utf-8");
    this.questions = JSON.parse(content);
  } catch (e) {
    new Notice(i18n[lang].errorLoading);
    console.error("Erro ao carregar o livro:", e);
  }
}
  // Renders the main UI (All questions tab)
  renderUI() {
    if (!this.questions.length) return;
    const lang = (this.plugin.settings.language || "en") as SupportedLanguage;
    const t = i18n[lang];
    this.plugin.settings.tab = 'all';

    this.container.empty();
    const wrapper = this.container.createDiv("spiritsbook-wrapper");

    const title = wrapper.createEl("h1", { text: "📘 " + this.getDisplayText() });
    title.addClass("spiritsbook-title");

    const tabs = wrapper.createDiv("spiritsbook-tabs");
    if (this.plugin.settings.tab !== 'favorites') {
      const tabFav = tabs.createEl("button", { text: t.favorites });
      tabFav.onclick = () => this.renderFavorites();
    }

    const display = wrapper.createDiv("spiritsbook-display") as HTMLDivElement;

    const nav = wrapper.createDiv("spiritsbook-nav");
    const prevBtn = nav.createEl("button", { text: t.previous });
    const nextBtn = nav.createEl("button", { text: t.next });
    prevBtn.onclick = () => this.showQuestion(this.currentIndex - 1);
    nextBtn.onclick = () => this.showQuestion(this.currentIndex + 1);

    const favContainer = wrapper.createDiv("spiritsbook-fav-container");
    this.favBtnEl = favContainer.createEl("button");
    this.updateFavoriteButton();
    this.favBtnEl.onclick = () => {
      this.toggleFavorite();
      this.updateFavoriteButton();
    };

    const rndBtn = favContainer.createEl("button", { text: t.random });
    rndBtn.onclick = () => this.showRandom();

    const footer = wrapper.createDiv("spiritsbook-footer");
    footer.addClass("spiritsbook-footer");

    const select = footer.createEl("select") as HTMLSelectElement;
    this.questions.forEach((q, i) => {
      select.add(new Option(`#${q.numero} - ${q.pergunta?.substring(0, 50) || "..."}`, i.toString()));
    });
    select.onchange = () => this.showQuestion(parseInt(select.value));

    this.showQuestion(this.currentIndex);
  }

  // Updates the favorite button text according to whether the current question is a favorite
  updateFavoriteButton() {
    if (!this.favBtnEl) return;
    const lang = (this.plugin.settings.language || "en") as SupportedLanguage;
    const t = i18n[lang];
    const q = this.questions[this.currentIndex];
    this.favBtnEl.setText(this.favorites.has(q.numero) ? t.unfavorite : t.favorite);
  }

  // Renders the UI for the favorites tab
  renderFavorites() {
    const lang = (this.plugin.settings.language || "en") as SupportedLanguage;
    const t = i18n[lang];
    this.plugin.settings.tab = 'favorites';

    this.container.empty();
    const wrapper = this.container.createDiv("spiritsbook-wrapper");

    const favTitle = wrapper.createEl("h1", { text: t.favoritesTitle });
    favTitle.addClass("spiritsbook-title");
    

    const tabs = wrapper.createDiv("spiritsbook-tabs");
    if (this.plugin.settings.tab !== 'all') {
      const tabAll = tabs.createEl("button", { text: t.all });
      tabAll.onclick = () => this.renderUI();
    }

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
        setTimeout(() => this.showQuestion(index), 10);
      };
    });
  }

  // Displays the question and its answer in the main display container
  showQuestion(index: number) {
    if (index < 0 || index >= this.questions.length) return;
    this.currentIndex = index;
    const q = this.questions[index];

    const display = this.container.querySelector(".spiritsbook-display") as HTMLDivElement;
    if (!display) return;
    display.empty();

    const questionEl = display.createDiv({ cls: 'spiritsbook-question' });
    const h2 = questionEl.createEl("h2", {
      text: `${this.translate("question", this.plugin.settings.language)} ${q.numero}`
    });
    h2.addClass("spiritsbook-question-title");    questionEl.createEl("p", { text: q.pergunta });

    const answerEl = display.createEl("blockquote", { text: q.resposta });
    answerEl.addClass("spiritsbook-answer");

    this.updateFavoriteButton();
  }

  // Toggles the favorite state of the current question
  toggleFavorite() {
    const lang = (this.plugin.settings.language || "en") as SupportedLanguage;
    const t = i18n[lang];
    const q = this.questions[this.currentIndex];
    if (this.favorites.has(q.numero)) {
      this.favorites.delete(q.numero);
      new Notice(`${t.removedFromFavorites}: #${q.numero}`);
    } else {
      this.favorites.add(q.numero);
      new Notice(`${t.addedToFavorites}: #${q.numero}`);
    }
  }

  // Randomly selects a question to display
  showRandom() {
    const lang = (this.plugin.settings.language || "en") as SupportedLanguage;
    const t = i18n[lang];
    const index = Math.floor(Math.random() * this.questions.length);
    this.showQuestion(index);
    new Notice(t.randomShown);
  }

  // Called when the view is closed
  async onClose() {
  }

  // Helper function for translating UI strings
  private translate(key: string, lang: SupportedLanguage = "en") {
    return i18n[lang]?.[key] || key;
  }
  
}
