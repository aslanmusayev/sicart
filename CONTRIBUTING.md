# Contributing

1. Create a branch from `main` (`git checkout -b feature/my-change`). Never commit straight to `main`.
2. Make your change, keeping commits small and focused, with a clear message (for example `feat: add cart screen`).
3. Run the tests and linters, if any, before pushing.
4. Open a pull request using the template: what changed, why, and how it was verified.
5. At least one teammate reviews and approves the pull request before it is merged.

Never commit secrets (`.env.local`, API keys, Supabase service-role key). Add new variable names to `.env.example`
instead.
