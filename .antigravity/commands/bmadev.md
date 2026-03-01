# bmadev
## Project
```project
commands:
  bmad-rules: |
    # BMAD (Build → Model → Act → Deploy) Methodology Rules

    ## 1. BUILD
    - Always start by defining problem boundaries.
    - Generate minimal scaffolding before writing logic.
    - Maintain strict separation between domain logic and UI logic.
    - Every feature must begin with a domain schema or interface.

    ## 2. MODEL
    - Convert real requirements into structured models.
    - All actions must be derived from domain models.
    - Maintain a single source of truth for data structures.
    - Keep transformations pure, predictable, and testable.
    - No side-effects inside models; side effects belong only in actions.

    ## 3. ACT
    - Each action must represent one atomic responsibility.
    - Actions should consume models and produce deterministic results.
    - Always validate input models before executing business logic.
    - Use adapters for network, DB, or external integration.
    - Logically connect actions together to form workflows.

    ## 4. DEPLOY
    - Package only domain, actions, and adapters—no editor metadata.
    - Ensure environment configs are versioned, not hard-coded.
    - Deployables must be stateless; state externalized in storage or services.
    - Every deployment must pass:
        - Model validation
        - Action consistency checks
        - Integration adapter tests

    ## 5. GENERAL BMAD PRINCIPLES
    - Separation of Concerns → Model ≠ Action ≠ Adapter ≠ UI.
    - Determinism → Same input should always produce same output.
    - Explicit Dependencies → No hidden global states.
    - Composability → Small units form larger workflows.
    - Editor-Agnostic → BMAD files should run anywhere, not only in Cursor.

    ## 6. PROJECT STRUCTURE RULES
    - /models → all domain models
    - /actions → functional and business actions
    - /adapters → external service bindings
    - /workflows → composed sequences of actions
    - /ui (optional) → view layer kept separate
    - /config → environment settings
    - Root folder must contain a BMAD definition document

    ## 7. QUALITY RULES
    - Every model must have:
        - Type definition
        - Validation contract
        - Error mapping
    - Every action must have:
        - Pre-conditions
        - Post-conditions
        - Error states
        - Side-effect declaration
    - Keep functions small and predictable.

    ## 8. EXECUTION RULES
    - Development cycles strictly follow BMAD order:
        1. Build → 2. Model → 3. Act → 4. Deploy
    - No deployment allowed if models or actions fail validation.

