// src/types.ts
// ------------------------------------------------------
// Types & helpers for The Spirits' Book data structures.
// ------------------------------------------------------

// Structure of a single question
export interface Pergunta {
  numero: number;
  pergunta: string;
  resposta: string;
}

// The book can arrive either as a raw array of questions
// or wrapped in an object { perguntas: Pergunta[] }
export type LivroFonte = Pergunta[] | { perguntas: Pergunta[] };

// ---------- Type guards ----------

export function isPergunta(x: unknown): x is Pergunta {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.numero === "number" &&
    Number.isFinite(o.numero) &&
    typeof o.pergunta === "string" &&
    typeof o.resposta === "string"
  );
}

export function isPerguntaArray(x: unknown): x is Pergunta[] {
  return Array.isArray(x) && x.every(isPergunta);
}

export function isLivroObjeto(x: unknown): x is { perguntas: Pergunta[] } {
  return (
    !!x &&
    typeof x === "object" &&
    Array.isArray((x as Record<string, unknown>).perguntas) &&
    (x as Record<string, unknown>).perguntas !== undefined &&
    (x as { perguntas: unknown[] }).perguntas.every(isPergunta)
  );
}

// ---------- Sanitization helpers ----------

// Remove control chars that can break JSON/UI (keeps \n, \r, \t)
function sanitizeText(s: string): string {
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function sanitizePergunta(p: Pergunta): Pergunta {
  return {
    numero: p.numero,
    pergunta: sanitizeText(p.pergunta),
    resposta: sanitizeText(p.resposta),
  };
}

// Normalize any LivroFonte into Pergunta[]
export function normalizeLivro(input: unknown): Pergunta[] {
  if (isPerguntaArray(input)) return input.map(sanitizePergunta);
  if (isLivroObjeto(input)) return input.perguntas.map(sanitizePergunta);
  return [];
}
