# Feature modules

Feature modules contain product-level composition: runtime hooks, shell components, product panels, and feature-specific utilities.

Routes should import a feature through its public `index.ts` entry point. Shared UI that can be reused across features belongs in `src/components` instead.
