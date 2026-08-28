export const ENV = {
  // Secret used to sign session JWTs. MUST be set to a long random string in production.
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  // Email address that is automatically promoted to the "admin" role the
  // first time it signs in / registers. Optional.
  ownerEmail: (process.env.OWNER_EMAIL ?? "").trim().toLowerCase(),
  isProduction: process.env.NODE_ENV === "production",
  // OpenAI-compatible chat-completions endpoint used for AI judging.
  // Works out of the box with OpenAI; point it at any other OpenAI-compatible
  // provider by overriding LLM_API_BASE_URL.
  llmApiUrl: (process.env.LLM_API_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, ""),
  llmApiKey: process.env.OPENAI_API_KEY ?? process.env.LLM_API_KEY ?? "",
  llmModel: process.env.LLM_MODEL ?? "gpt-4o-mini",
  // Local filesystem directory (relative to the project root) used to store
  // uploaded evidence files and generated assets.
  uploadsDir: process.env.UPLOADS_DIR ?? "uploads",
};
