**stability-and-speed: Zero-Interference Architecture & Rigorous Versioning Mandate****Core Architectural Approaches: Absolute Isolation Mandate**These approaches enforce absolute isolation between components and mandate strict adherence to boundary protocols.**1\. Microservices Architecture: The Isolation Imperative**

Here the Developer is Antigravity itself.

*   **Mandate**: The system _must_ be built as a collection of entirely independent, bounded-context services.
    
*   **Enforcement**:
    
    *   **Independence**: Services _shall_ be developed, deployed, and scaled in complete isolation. A change in one service _shall not_ under any circumstances require testing, modification, or redeployment of any other service.
        
    *   **Contract Immutability**: Service APIs (contracts) are immutable. Any modification requires strict versioning (e.g., v1, v2). Consumers _must_ explicitly opt-in to new versions.
        
    *   **Verification Protocol**: Before deployment, all dependent services _must_ pass a regression test suite against the _existing_ API contract to verify zero impact.
        

**2\. Event-Driven Architecture (EDA): The Decoupling Mandate**

*   **Mandate**: Components _shall_ communicate asynchronously through events, achieving maximum possible decoupling.
    
*   **Enforcement**:
    
    *   **Decoupling**: New features (consumers) _must_ only react to events. They _shall not_ disrupt or alter the existing logic of event producers.
        
    *   **Schema Immutability & Safeguarding**: Event schemas are strictly versioned. If a schema must change in a breaking way, both the old and new schemas _must_ be supported simultaneously for a transition period. A compatibility layer or a new, separate event stream _must_ be implemented to safeguard existing consumers before the old format is deprecated.
        

**3\. Hexagonal Architecture (Ports and Adapters): The Logic Sanctity Mandate**

*   **Mandate**: Core business logic is _strictly isolated_ from all external concerns (databases, UIs, third-party APIs).
    
*   **Enforcement**:
    
    *   **Logic Protection**: The application core _shall remain agnostic_ to all infrastructure. Changes in data layers or external APIs _must not_ affect existing core domain logic.
        
    *   **Verification Protocol**: Any change to an adapter or port implementation requires a full unit/integration test of the _entire_ core business domain logic to guarantee no side effects were introduced by the infrastructure change.
        

**Essential Engineering Principles: Zero-Impact & Version Control Guidelines**These principles eliminate shared state and enforce a rigorous verification and versioning process.**1\. Modularity and Encapsulation: The Information Hiding Mandate**

*   **Mandate**: Systems _must_ use small, self-contained modules with minimal, strictly controlled public interfaces.
    
*   **Enforcement**:
    
    *   **Safeguarding Workflow**: Public interfaces _shall be treated as contracts_. Any modification to an interface requires a mandatory code review to ensure all existing consumers are accounted for and a safeguarding strategy is implemented _before_ the change is merged.
        
    *   **Verification Protocol**: Any module change requires execution of all associated automated tests to confirm internal logic integrity and lack of external regression.
        

**2\. Loose Coupling & High Cohesion: The Dependency Elimination Mandate**

*   **Mandate**: Dependencies between modules _must_ be minimized to the absolute necessary minimum.
    
*   **Enforcement**:
    
    *   **Loose Coupling**: Any modification _must not_ force changes in dependent modules. The impact radius of any code change _shall be zero_ outside the intended module.
        
    *   **Verification Protocol (Mandatory):** Static analysis tools _must_ run on every pull request to map the dependency graph. The developer _must_ explicitly justify any new or altered dependency that crosses module boundaries.
        

**3\. Single Responsibility Principle (SRP): The One-Reason Mandate**

*   **Mandate**: Every class or module _must_ have _only one_ reason to change.
    
*   **Enforcement**:
    
    *   **Pre-Modification Check (Mandatory):** Before any modification, the developer _must_ formally document: "Will any other logic get affected?" and "Does any other logic depend on the logic I am going to modify?" If the answer is yes, the logic _must_ be separated into independent components _before_ the new feature/fix is implemented.
        

**4\. Version Control & Deployment Immutability (New Strict Rule)**

*   **Mandate**: Deployment artifacts and merged code _must be treated as immutable historical records_. Accidental reversion to a previous, incorrect version is strictly prohibited.
    
*   **Enforcement**:
    
    *   **CI/CD Guardrails**: The Continuous Integration/Continuous Deployment (CI/CD) pipeline _shall_ enforce sequential, forward-only deployments. Rollbacks are only permitted via a _new_, unique, backward-compatible deployment artifact that explicitly addresses the issue, not by simply redeploying a previous artifact.
        
    *   **Strict Merging Policies**: Main branches (e.g., main, master) _must_ be protected. Merges _only_ occur via pull requests that have passed _all_ automated tests (unit, integration, regression) and mandatory peer review, ensuring that no stale or incorrect logic is introduced.
        
    *   **Unique Artifact Identification**: Every single build artifact (e.g., Docker image, binary) _must_ be tagged with a unique, monotonically increasing identifier (e.g., a Git commit SHA or sequential build number) that is traceable to the specific, reviewed source code version. Deployment systems _shall_ only accept these unique identifiers and prevent deployment of non-current identifiers.