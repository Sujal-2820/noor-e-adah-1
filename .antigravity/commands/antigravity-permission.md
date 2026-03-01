Below is a **clear, enforceable rule-set** you can give to **Antigravity** so it can proceed autonomously **without over-asking**, while still being **extremely safe** around existing code, workflows, and production stability.

This is written as **operational rules**, not implementation details.

**Antigravity Autonomous Operation Rules (Safe-Change Mode)**
=============================================================

**1\. Decision-Making Rules (No Over-Asking)**
----------------------------------------------

1.  Antigravity **must not ask clarifying questions** if:
    
    *   The requirement is already logically inferable from context
        
    *   The change is isolated to a clearly scoped module
        
    *   Industry-standard defaults apply
        
2.  Antigravity **must ask for confirmation only if**:
    
    *   A database schema change affects existing production data
        
    *   A change alters authentication, billing, or authorization logic
        
    *   A change removes or renames public APIs or shared components
        
3.  If ambiguity exists:
    
    *   Choose the **least destructive interpretation**
        
    *   Prefer additive changes over destructive ones
        

**2\. Scope-Isolation Rules (Do Not Disturb Existing Workflow)**
----------------------------------------------------------------

1.  Antigravity must:
    
    *   Identify the **minimum blast radius** of the requested change
        
    *   Restrict modifications strictly to that scope
        
2.  It is **forbidden** to:
    
    *   Refactor unrelated files
        
    *   Reformat code not directly involved
        
    *   Change naming conventions outside the target scope
        
    *   Modify unrelated UI behavior or UX flows
        
3.  Any file not explicitly required:
    
    *   Must remain byte-for-byte unchanged
        

**3\. Change Strategy Rules (Safety First)**
--------------------------------------------

1.  Default approach:
    
    *   **Extend → Do not replace**
        
    *   **Wrap → Do not rewrite**
        
    *   **Add flags → Do not hard-switch behavior**
        
2.  Existing logic must:
    
    *   Continue working exactly as before unless explicitly requested otherwise
        
    *   Remain backward compatible
        
3.  Feature flags or conditional guards must be used when:
    
    *   Introducing new flows
        
    *   Altering conditional behavior
        
    *   Supporting parallel old + new behavior
        

**4\. Code Modification Rules**
-------------------------------

1.  Antigravity may only modify:
    
    *   Files directly related to the requested feature
        
    *   Shared utilities **only if absolutely necessary**
        
2.  When modifying:
    
    *   Preserve existing function signatures unless required
        
    *   Avoid renaming variables used elsewhere
        
    *   Avoid changing return shapes consumed by other modules
        
3.  No “cleanup refactors” unless explicitly asked.
    

**5\. Database & Data Rules**
-----------------------------

1.  Database changes must be:
    
    *   Additive only (new columns, new tables)
        
    *   Non-breaking by default
        
    *   Nullable fields preferred over mandatory ones
        
2.  Existing data must:
    
    *   Never be mutated unless explicitly requested
        
    *   Never be deleted or migrated implicitly
        
3.  RLS / permissions:
    
    *   Must be duplicated or extended, never loosened
        
    *   No existing policy may be weakened
        

**6\. Authentication & Security Rules**
---------------------------------------

1.  Auth flows must:
    
    *   Remain functionally identical unless explicitly changed
        
    *   Preserve existing sessions and tokens
        
2.  New auth behavior must:
    
    *   Be isolated behind feature flags or new endpoints
        
    *   Not affect existing login/signup users
        
3.  No downgrade of security assumptions is allowed.
    

**7\. Testing & Verification Rules**
------------------------------------

1.  Antigravity must ensure:
    
    *   Existing flows still compile and run
        
    *   No breaking type errors introduced
        
    *   No unused imports or dead code added
        
2.  If tests exist:
    
    *   Do not modify them unless the feature demands it
        
    *   Add new tests rather than altering old ones
        

**8\. Output & Communication Rules**
------------------------------------

1.  Antigravity must:
    
    *   Explain **what was changed**
        
    *   Explain **what was deliberately NOT changed**
        
    *   Clearly state assumptions made (if any)
        
2.  Avoid verbosity:
    
    *   No step-by-step tutorials
        
    *   No unnecessary commentary
        

**9\. Fallback & Recovery Rules**
---------------------------------

1.  Every change must be:
    
    *   Reversible without data loss
        
    *   Easy to disable (feature flag / config toggle)
        
2.  If a safe path cannot be guaranteed:
    
    *   Antigravity must halt and request approval
        

**10\. Golden Rule**
--------------------

> **If a requested change can be implemented without touching existing behavior, Antigravity must do so — even if a “cleaner” refactor is possible.**

