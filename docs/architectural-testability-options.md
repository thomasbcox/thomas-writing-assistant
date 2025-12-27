# Architectural Options for Improved Testability

## Current Architecture Problems

### Issues Identified:
1. **Routes directly access database** - No abstraction layer, making mocking complex
2. **Complex Drizzle ORM mocking** - Must mock entire query builder chains
3. **Singleton dependencies** - `getDb()`, `getLLMClient()`, `getConfigLoader()` are hard to mock
4. **Business logic in routes** - Routes contain query logic, data transformation, error handling
5. **Global state management** - Database switching uses global state, complicating tests
6. **No clear service boundaries** - Services exist but routes bypass them

### Testing Pain Points:
- Must mock entire Drizzle query builder chains
- Must mock global singletons at module level
- Error injection requires complex mock state management
- Tests are brittle and tightly coupled to implementation

---

## Approach 1: Service Layer Pattern (Recommended)

### Concept
Extract all database operations into service classes. Routes become thin HTTP handlers that call services.

### Architecture
```
Route Handler → Service → Repository/Database
```

### Implementation

**Create service layer:**
```typescript
// src/server/services/concept.service.ts
export class ConceptService {
  constructor(private db: Database) {}
  
  async listConcepts(options: { includeTrash?: boolean; search?: string }) {
    // All query logic here
    const conditions = [];
    if (!options.includeTrash) {
      conditions.push(eq(concept.status, "active"));
    }
    // ... rest of logic
    return await this.db.select()...
  }
  
  async createConcept(input: CreateConceptInput) {
    // All creation logic here
    return await this.db.insert(concept)...
  }
}
```

**Routes become thin:**
```typescript
// src/app/api/concepts/route.ts
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const service = new ConceptService(db);
    const concepts = await service.listConcepts({
      includeTrash: getQueryParamBool(request, "includeTrash", false),
      search: getQueryParam(request, "search"),
    });
    return NextResponse.json(concepts);
  } catch (error) {
    return handleApiError(error);
  }
}
```

**Testing becomes simple:**
```typescript
// src/test/api/concepts.test.ts
describe("Concepts API", () => {
  it("should list concepts", async () => {
    const mockService = {
      listConcepts: jest.fn().mockResolvedValue([{ id: "1", title: "Test" }])
    };
    jest.mock("~/server/services/concept.service", () => ({
      ConceptService: jest.fn(() => mockService)
    }));
    
    const response = await GET(request);
    expect(mockService.listConcepts).toHaveBeenCalled();
  });
});
```

### Pros
- ✅ **Simple testing** - Mock services, not database
- ✅ **Clear boundaries** - Routes handle HTTP, services handle business logic
- ✅ **Reusable** - Services can be used by tRPC, REST, or other consumers
- ✅ **Testable** - Easy to unit test services with in-memory DB
- ✅ **Maintainable** - Business logic centralized

### Cons
- ❌ **More files** - Need service files for each domain
- ❌ **Slight indirection** - One more layer to navigate
- ⚠️ **Migration effort** - Must refactor all routes

### Features to Rethink
- **Runtime DB switching** - Can be simplified: services accept DB in constructor, routes pass current DB
- **Global state** - Can be removed: pass DB instance explicitly

### Migration Path
1. Create service classes for each domain (concepts, links, capsules, etc.)
2. Move query logic from routes to services
3. Update routes to call services
4. Update tests to mock services instead of database
5. Remove complex database mocking

---

## Approach 2: Repository Pattern

### Concept
Abstract database behind repository interfaces. Routes and services use repositories, not direct DB access.

### Architecture
```
Route → Service → Repository Interface → Database Implementation
```

### Implementation

**Define repository interfaces:**
```typescript
// src/server/repositories/concept.repository.ts
export interface IConceptRepository {
  findAll(options: { includeTrash?: boolean; search?: string }): Promise<Concept[]>;
  findById(id: string): Promise<Concept | null>;
  create(input: CreateConceptInput): Promise<Concept>;
  update(id: string, input: UpdateConceptInput): Promise<Concept>;
  delete(id: string): Promise<void>;
}

export class DrizzleConceptRepository implements IConceptRepository {
  constructor(private db: Database) {}
  
  async findAll(options) {
    // Implementation using Drizzle
  }
}
```

**Services use repositories:**
```typescript
export class ConceptService {
  constructor(private repo: IConceptRepository) {}
  
  async listConcepts(options) {
    return await this.repo.findAll(options);
  }
}
```

**Testing:**
```typescript
const mockRepo: IConceptRepository = {
  findAll: jest.fn().mockResolvedValue([...]),
  // ... other methods
};

const service = new ConceptService(mockRepo);
```

### Pros
- ✅ **Highly testable** - Mock interfaces, not implementations
- ✅ **Swappable** - Can swap DB implementations (SQLite, Postgres, etc.)
- ✅ **Type-safe** - TypeScript interfaces ensure contracts
- ✅ **Isolated** - Database changes don't affect business logic

### Cons
- ❌ **More abstraction** - More layers and interfaces
- ❌ **More boilerplate** - Must define interfaces and implementations
- ❌ **Heavier** - More code overall

### Features to Rethink
- **Drizzle relational queries** - May need to flatten to match repository interface
- **Complex queries** - Some Drizzle features may be harder to abstract

---

## Approach 3: In-Memory Test Database (Simplest)

### Concept
Instead of mocking, use real SQLite in-memory database for tests. Tests run against actual database.

### Architecture
```
Tests → Real SQLite :memory: → Drizzle ORM → Actual Queries
```

### Implementation

**Test setup:**
```typescript
// src/test/test-utils.ts
export function createTestDb() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  // Run migrations
  migrate(db, { migrationsFolder: "./prisma/migrations" });
  return db;
}
```

**Tests use real DB:**
```typescript
describe("Concepts API", () => {
  let db: Database;
  
  beforeAll(() => {
    db = createTestDb();
  });
  
  it("should create concept", async () => {
    // Use real database
    const service = new ConceptService(db);
    const concept = await service.createConcept({ title: "Test" });
    expect(concept.id).toBeDefined();
  });
});
```

### Pros
- ✅ **Simplest** - No mocking needed
- ✅ **Real behavior** - Tests actual database interactions
- ✅ **Fast** - In-memory SQLite is very fast
- ✅ **Reliable** - Tests real queries, catches real bugs
- ✅ **Less code** - No mock setup

### Cons
- ❌ **Requires migrations** - Must run migrations in tests
- ❌ **Database-specific** - Tests SQLite, not other DBs
- ❌ **Setup/teardown** - Need to manage test data
- ⚠️ **Error injection** - Harder to test error paths (but can use real errors)

### Features to Rethink
- **Error injection tests** - Can test real errors (constraint violations, etc.)
- **Mock complexity** - Eliminates need for complex mocks entirely

### Hybrid Approach
Use in-memory DB for most tests, minimal mocks only for error injection:
```typescript
// For error injection, temporarily replace DB connection
it("handles DB errors", async () => {
  const errorDb = createErrorThrowingDb();
  const service = new ConceptService(errorDb);
  await expect(service.createConcept(...)).rejects.toThrow();
});
```

---

## Approach 4: Dependency Injection Container

### Concept
Use dependency injection to provide dependencies. Routes receive services via DI, not singletons.

### Architecture
```
DI Container → Services → Repositories → Database
     ↓
  Routes (receive services via DI)
```

### Implementation

**Simple DI container:**
```typescript
// src/server/di/container.ts
class Container {
  private services = new Map();
  
  register<T>(key: string, factory: () => T) {
    this.services.set(key, factory);
  }
  
  resolve<T>(key: string): T {
    const factory = this.services.get(key);
    return factory();
  }
}

export const container = new Container();

// Setup
container.register("db", () => getCurrentDb());
container.register("conceptService", () => 
  new ConceptService(container.resolve("db"))
);
```

**Routes use DI:**
```typescript
export async function GET(request: NextRequest) {
  const service = container.resolve<ConceptService>("conceptService");
  const concepts = await service.listConcepts(...);
  return NextResponse.json(concepts);
}
```

**Testing:**
```typescript
beforeEach(() => {
  container.register("db", () => createTestDb());
  container.register("conceptService", () => new ConceptService(container.resolve("db")));
});
```

### Pros
- ✅ **Testable** - Easy to swap implementations
- ✅ **Flexible** - Can change implementations without code changes
- ✅ **Explicit dependencies** - Clear what each component needs

### Cons
- ❌ **More complexity** - DI container adds abstraction
- ❌ **Runtime resolution** - Less type-safe than direct imports
- ❌ **Learning curve** - Team must understand DI patterns

### Features to Rethink
- **Singleton pattern** - Can be replaced with DI
- **Global state** - Can be managed by container

---

## Approach 5: Functional Service Layer (Simplest for App)

### Concept
Use pure functions instead of classes. Services are stateless functions that take DB as parameter.

### Architecture
```
Route → Service Functions (take DB as param) → Database
```

### Implementation

**Pure service functions:**
```typescript
// src/server/services/concept.service.ts
export async function listConcepts(
  db: Database,
  options: { includeTrash?: boolean; search?: string }
): Promise<Concept[]> {
  // All logic here, no class, no state
  const conditions = [];
  // ... query logic
  return await db.select()...
}

export async function createConcept(
  db: Database,
  input: CreateConceptInput
): Promise<Concept> {
  // Creation logic
  return await db.insert(concept)...
}
```

**Routes call functions:**
```typescript
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const concepts = await listConcepts(db, {
      includeTrash: getQueryParamBool(request, "includeTrash", false),
      search: getQueryParam(request, "search"),
    });
    return NextResponse.json(concepts);
  } catch (error) {
    return handleApiError(error);
  }
}
```

**Testing:**
```typescript
it("should list concepts", async () => {
  const mockDb = createMockDb();
  const concepts = await listConcepts(mockDb, {});
  expect(concepts).toEqual([...]);
});
```

### Pros
- ✅ **Simplest app code** - No classes, just functions
- ✅ **Easy to test** - Pass mock DB as parameter
- ✅ **Functional style** - Pure functions, easy to reason about
- ✅ **No DI needed** - Just pass dependencies as parameters
- ✅ **Minimal changes** - Can migrate incrementally

### Cons
- ❌ **Parameter passing** - Must pass DB to every function
- ❌ **No encapsulation** - Functions are in global namespace
- ⚠️ **Still need DB mocking** - But simpler than current approach

### Features to Rethink
- **Service organization** - Group functions in modules, not classes
- **State management** - All state in database, functions are pure

---

## Approach 6: Hybrid - Services + In-Memory DB

### Concept
Combine Approach 1 (Service Layer) with Approach 3 (In-Memory DB). Use services for structure, real DB for tests.

### Architecture
```
Route → Service → Database
                ↓
         (Real SQLite in tests)
```

### Implementation
- Extract services (like Approach 1)
- Use in-memory SQLite for tests (like Approach 3)
- Minimal mocking only for error injection

### Pros
- ✅ **Best of both** - Clean architecture + simple tests
- ✅ **Real behavior** - Tests actual database
- ✅ **Clear structure** - Services separate concerns

### Cons
- ❌ **Migration effort** - Must do both service extraction and test rewrite
- ⚠️ **Error testing** - Still need some mocking for error paths

---

## Comparison Matrix

| Approach | App Simplicity | Test Simplicity | Migration Effort | Maintainability |
|----------|---------------|-----------------|-------------------|-----------------|
| 1. Service Layer | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Medium | ⭐⭐⭐⭐⭐ |
| 2. Repository | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | High | ⭐⭐⭐⭐ |
| 3. In-Memory DB | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Low | ⭐⭐⭐⭐ |
| 4. DI Container | ⭐⭐⭐ | ⭐⭐⭐⭐ | High | ⭐⭐⭐ |
| 5. Functional | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Low | ⭐⭐⭐⭐ |
| 6. Hybrid | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Medium | ⭐⭐⭐⭐⭐ |

---

## Recommendations

### For Maximum Test Simplicity: **Approach 3 (In-Memory DB)**
- Eliminates all mocking complexity
- Tests real behavior
- Fast and reliable
- Minimal code changes

### For Best Long-Term Architecture: **Approach 1 (Service Layer)**
- Clean separation of concerns
- Easy to test (mock services)
- Maintainable and scalable
- Professional structure

### For Simplest Migration: **Approach 5 (Functional Services)**
- Minimal changes to existing code
- Easy to adopt incrementally
- Simple function-based approach
- Good balance of simplicity

### Best Overall: **Approach 6 (Hybrid)**
- Combines benefits of service layer and in-memory DB
- Clean architecture + simple tests
- Best long-term solution

---

## Features to Rethink/Remove

### 1. Runtime Database Switching
**Current:** Global state management for dev/prod switching
**Options:**
- **Remove it** - Use environment variables only (simplest)
- **Simplify it** - Pass DB preference to services, no global state
- **Keep it** - But move to service layer (services accept DB instance)

**Recommendation:** Remove or simplify. Environment-based switching is sufficient.

### 2. Complex Drizzle Relational Queries
**Current:** Routes use `db.query.link.findMany({ with: { source: true } })`
**Options:**
- **Flatten queries** - Use joins instead of relations (easier to test)
- **Abstract in services** - Services handle relation loading
- **Keep as-is** - But test with real DB (in-memory)

**Recommendation:** Keep, but move to services. Test with real DB.

### 3. Singleton Pattern
**Current:** `getDb()`, `getLLMClient()`, `getConfigLoader()` are singletons
**Options:**
- **Remove** - Pass instances explicitly
- **Keep but testable** - Make singletons swappable in tests
- **DI Container** - Use DI instead

**Recommendation:** Keep for app simplicity, but make testable (swappable in tests).

---

## Migration Strategy

### Phase 1: Quick Win (Approach 3 - In-Memory DB)
1. Create `createTestDb()` utility using `:memory:` SQLite
2. Update tests to use real DB instead of mocks
3. Remove complex mock database helper
4. **Result:** Tests pass immediately, no app code changes

### Phase 2: Architecture Improvement (Approach 1 or 5)
1. Extract services (classes or functions)
2. Move query logic from routes to services
3. Routes become thin HTTP handlers
4. **Result:** Clean architecture, easier to maintain

### Phase 3: Simplify Features
1. Remove or simplify runtime DB switching
2. Simplify singleton management
3. **Result:** Less complexity, easier to test

---

## Questions to Consider

1. **How important is runtime DB switching?** If not critical, removing it simplifies everything.

2. **Can we use real DB in tests?** If yes, Approach 3 eliminates all mocking.

3. **How much refactoring is acceptable?** Approach 5 requires minimal changes, Approach 1 requires more.

4. **Team preference: classes or functions?** Approach 1 uses classes, Approach 5 uses functions.

5. **Long-term scalability?** Approach 1 (Service Layer) is most scalable.

---

## My Recommendation

**Start with Approach 3 (In-Memory DB)** for immediate test fixes, then **migrate to Approach 6 (Hybrid)** for long-term architecture:

1. **Immediate:** Switch tests to in-memory SQLite - fixes 80% of test issues
2. **Short-term:** Extract services (functional or class-based) - improves architecture
3. **Long-term:** Remove runtime DB switching - simplifies everything

This gives you:
- ✅ Immediate test fixes (no mocking needed)
- ✅ Clean architecture (service layer)
- ✅ Simple tests (real DB + service mocks)
- ✅ Maintainable code (clear boundaries)
