"""Batch 11: Final ~150 questions to reach 5000"""
import os
MJS = 'C:/Users/Honor/Desktop/Code/java-interview-tinder/backend/src/scripts/seed-generated.mjs'
with open(MJS, 'r', encoding='utf-8') as f:
    content = f.read()
marker = '\nasync function seedDB()'
idx = content.index(marker)
before = content[:idx]
after = content[idx:]
new = []

def esc(s):
    return s.replace('\\', '\\\\').replace("'", "\\'").replace('"', '\\"')

def Q(cat, q, a, diff, lang):
    new.append(f"  Q('{esc(cat)}', '{esc(q)}', '{esc(a)}', ['{esc(a)}', 'Alternative', 'Misconception', 'Unsure'], '{diff}', '{lang}');")

def gen(topics, diff, lang):
    for cat, q, a in topics:
        Q(cat, q, a, diff, lang)

# --- Java Senior (30) ---
gen([
    ("Design Patterns", "What is the difference between Factory Method and Abstract Factory?", "Factory Method creates one product; Abstract Factory creates product families"),
    ("Design Patterns", "What is the difference between Proxy and Decorator?", "Proxy controls access; Decorator adds behavior"),
    ("Design Patterns", "What is the difference between Adapter and Facade?", "Adapter converts interface; Facade simplifies interface"),
    ("Design Patterns", "What is the difference between Strategy and Template Method?", "Strategy uses composition; Template Method uses inheritance"),
    ("Design Patterns", "What is the difference between Observer and Pub-Sub?", "Observer is direct; Pub-Sub uses a broker"),
    ("Design Patterns", "What is the double-checked locking pattern?", "Checking before acquiring lock for singleton thread safety"),
    ("Design Patterns", "What is the Bill Pugh singleton pattern?", "Using a static inner class for lazy thread-safe singleton"),
    ("Design Patterns", "What is the difference between DAO and Repository?", "DAO is lower-level; Repository is domain-oriented"),
    ("Design Patterns", "What is the DTO pattern?", "Data Transfer Object for passing data between layers"),
    ("Design Patterns", "What is the Unit of Work pattern?", "Tracks changes and commits them as a single transaction"),
    ("Architecture", "What is the onion architecture?", "Layered architecture with dependencies pointing inward"),
    ("Architecture", "What is the hexagonal architecture?", "Ports and adapters pattern"),
    ("Architecture", "What is the CQRS pattern?", "Separating commands (writes) from queries (reads)"),
    ("Architecture", "What is Event Sourcing?", "Storing state changes as a sequence of events"),
    ("Architecture", "What is the Saga pattern?", "Managing distributed transactions with compensating actions"),
    ("Architecture", "What is the Strangler Fig pattern?", "Gradually replacing a legacy system piece by piece"),
    ("Architecture", "What is the BFF pattern?", "Backend For Frontend - dedicated backend per client type"),
    ("Architecture", "What is the Sidecar pattern?", "A helper service deployed alongside the main service"),
    ("Architecture", "What is the Ambassador pattern?", "A sidecar for handling cross-cutting concerns like retries"),
    ("Architecture", "What is the Anti-Corruption Layer pattern?", "A layer that translates between bounded contexts"),
    ("Performance", "What is JMH?", "Java Microbenchmark Harness for accurate performance measurement"),
    ("Performance", "What is the jstack tool?", "Prints stack traces of Java threads for analysis"),
    ("Performance", "What is the jmap tool?", "Captures heap dumps and memory info"),
    ("Performance", "What is the jstat tool?", "Monitors JVM statistics like GC and class loading"),
    ("Performance", "What is the VisualVM tool?", "A visual tool for monitoring JVM performance"),
    ("Performance", "What is the async-profiler tool?", "A low-overhead profiler for CPU and memory"),
    ("Performance", "What is the -XX:MaxGCPauseMillis flag?", "Target maximum GC pause time for CMS/G1"),
    ("Performance", "What is the -XX:ParallelGCThreads flag?", "Number of threads used for parallel GC"),
    ("Performance", "What is the -XX:+UseZGC flag?", "Enables the Z garbage collector"),
    ("Performance", "What is the -XX:+UseShenandoahGC flag?", "Enables the Shenandoah garbage collector"),
], "Senior", "Java")

# --- Python Senior (20) ---
gen([
    ("Advanced", "What is the difference between __str__ and __repr__?", "__repr__ is for developers; __str__ is for end users"),
    ("Advanced", "What is the @wraps decorator?", "Preserves metadata of the decorated function"),
    ("Advanced", "What is the singledispatch decorator?", "Creates single-dispatch generic functions"),
    ("Advanced", "What is the lru_cache vs cache decorator?", "cache is unbounded; lru_cache has maxsize"),
    ("Advanced", "What is the __slots__ memory savings?", "Reduces memory by preventing __dict__ creation"),
    ("Advanced", "What is the difference between is and == for singletons?", "Use is for None, True, False; == for value comparison"),
    ("Advanced", "What is the sentinel pattern?", "Using a unique object as default to distinguish from None"),
    ("Advanced", "What is the __missing__ method?", "Called by dict subclasses when key is not found"),
    ("Advanced", "What is the __contains__ method?", "Implements the in operator"),
    ("Advanced", "What is the __iter__ and __next__ protocol?", "Defines iterator behavior for a class"),
    ("Advanced", "What is the __aiter__ and __anext__ protocol?", "Defines async iterator behavior"),
    ("Advanced", "What is the __await__ method?", "Makes an object awaitable"),
    ("Advanced", "What is the async context manager?", "__aenter__ and __aexit__ for async with"),
    ("Advanced", "What is the async generator?", "A generator with async for and yield"),
    ("Advanced", "What is the trio library?", "An async concurrency library with structured concurrency"),
    ("Advanced", "What is the curio library?", "A small async concurrency library"),
    ("Advanced", "What is the uvloop library?", "A fast event loop replacement for asyncio"),
    ("Advanced", "What is the anyio library?", "A unified async library that works with asyncio and trio"),
    ("Advanced", "What is the httpx library?", "A modern async HTTP client for Python"),
    ("Advanced", "What is the aiohttp library?", "An async HTTP client/server for Python"),
], "Senior", "Python")

# --- TypeScript Senior (20) ---
gen([
    ("Advanced", "What is the NoUnusedLocals option?", "Errors on unused local variables"),
    ("Advanced", "What is the NoUnusedParameters option?", "Errors on unused function parameters"),
    ("Advanced", "What is the ExactOptionalPropertyTypes option?", "Prevents undefined from being assigned to optional properties"),
    ("Advanced", "What is the NoPropertyAccessFromIndexSignature option?", "Requires bracket access for index signatures"),
    ("Advanced", "What is the StrictNullChecks option?", "Makes null and undefined distinct types"),
    ("Advanced", "What is the NoImplicitReturns option?", "Errors on missing return statements"),
    ("Advanced", "What is the NoFallthroughCasesInSwitch option?", "Errors on fallthrough in switch cases"),
    ("Advanced", "What is the allowUnreachableCode option?", "Controls error reporting on unreachable code"),
    ("Advanced", "What is the allowUnusedLabels option?", "Controls error reporting on unused labels"),
    ("Advanced", "What is the strictPropertyInitialization option?", "Ensures class properties are initialized"),
    ("Advanced", "What is the useDefineForClassFields option?", "Uses native ES class fields semantics"),
    ("Advanced", "What is the isolatedModules option?", "Treats each file as a separate module"),
    ("Advanced", "What is the preserveConstEnums option?", "Preserves const enum declarations in output"),
    ("Advanced", "What is the sourceRoot option?", "Root location for source maps"),
    ("Advanced", "What is the declarationMap option?", "Creates source maps for declaration files"),
    ("Advanced", "What is the composite option?", "Enables project references and incremental builds"),
    ("Advanced", "What is the tsBuildInfoFile option?", "Specifies incremental build info file location"),
    ("Advanced", "What is the disableReferencedProjectLoad option?", "Disables automatic loading of referenced projects"),
    ("Advanced", "What is the preserveSymlinks option?", "Preserves symlink resolution in modules"),
    ("Advanced", "What is the charset option?", "Specifies character set for input files"),
], "Senior", "TypeScript")

# --- Go Senior (20) ---
gen([
    ("Advanced", "What is the unsafe.Pointer?", "A pointer type that can bypass Go's type system"),
    ("Advanced", "What is the uintptr type?", "An integer type large enough to hold a pointer"),
    ("Advanced", "What is the reflect.Value?", "Represents the runtime value of a variable"),
    ("Advanced", "What is the reflect.Type?", "Represents the runtime type of a variable"),
    ("Advanced", "What is the struct alignment?", "Memory alignment rules for struct fields"),
    ("Advanced", "What is the cgo cost?", "C function calls have overhead and can block OS threads"),
    ("Advanced", "What is the gopls?", "The official Go language server for editors"),
    ("Advanced", "What is the staticcheck tool?", "A Go static analysis tool"),
    ("Advanced", "What is the golangci-lint tool?", "A Go linter aggregator"),
    ("Advanced", "What is the go vet command?", "Reports suspicious constructs in Go code"),
    ("Advanced", "What is the go mod tidy command?", "Adds missing and removes unused dependencies"),
    ("Advanced", "What is the go mod vendor command?", "Creates a vendor directory with dependencies"),
    ("Advanced", "What is the go work command?", "Workspace management for multiple modules"),
    ("Advanced", "What is the embed package?", "Embeds files and folders into the Go binary"),
    ("Advanced", "What is the //go:embed directive?", "Compile-time file embedding"),
    ("Advanced", "What is the //go:generate directive?", "Generates source code before compilation"),
    ("Advanced", "What is the //go:build tag syntax?", "Build constraints with boolean expressions"),
    ("Advanced", "What is the //go:linkname directive?", "Links to symbols in other packages"),
    ("Advanced", "What is the //go:noinline directive?", "Prevents function inlining"),
    ("Advanced", "What is the //go:nosplit directive?", "Prevents stack splitting in the function"),
], "Senior", "Go")

# --- Rust Senior (20) ---
gen([
    ("Advanced", "What is the alloc crate?", "The allocation library for no_std environments"),
    ("Advanced", "What is the core crate?", "The minimal standard library for no_std"),
    ("Advanced", "What is the std crate?", "The full Rust standard library"),
    ("Advanced", "What is the proc_macro crate?", "The compiler API for procedural macros"),
    ("Advanced", "What is the #[proc_macro] attribute?", "Creates a function-like procedural macro"),
    ("Advanced", "What is the #[proc_macro_derive] attribute?", "Creates a derive procedural macro"),
    ("Advanced", "What is the #[proc_macro_attribute] attribute?", "Creates an attribute procedural macro"),
    ("Advanced", "What is the TokenStream type?", "A sequence of tokens for procedural macros"),
    ("Advanced", "What is the syn crate?", "Parsing Rust source code for procedural macros"),
    ("Advanced", "What is the quote crate?", "Generating Rust code for procedural macros"),
    ("Advanced", "What is the rustfmt tool?", "Automatically formats Rust code"),
    ("Advanced", "What is the clippy tool?", "A linter for Rust with many useful warnings"),
    ("Advanced", "What is the cargo doc command?", "Generates documentation for Rust projects"),
    ("Advanced", "What is the cargo publish command?", "Publishes crates to crates.io"),
    ("Advanced", "What is the cargo test command?", "Runs tests for Rust projects"),
    ("Advanced", "What is the cargo bench command?", "Runs benchmarks for Rust projects"),
    ("Advanced", "What is the cargo build --release?", "Builds with optimizations enabled"),
    ("Advanced", "What is the cargo check command?", "Checks code for errors without producing binaries"),
    ("Advanced", "What is the cargo clippy command?", "Runs the Clippy linter on Rust code"),
    ("Advanced", "What is the cargo fmt command?", "Formats Rust code with rustfmt"),
], "Senior", "Rust")

# --- React Senior (20) ---
gen([
    ("Advanced", "What is the useSyncExternalStore hook?", "Subscribes to external stores with concurrent mode safety"),
    ("Advanced", "What is the useInsertionEffect hook?", "For injecting styles before DOM mutations"),
    ("Advanced", "What is the flushSync function?", "Flushes updates synchronously"),
    ("Advanced", "What is the createRoot API?", "Creates a React root for concurrent rendering"),
    ("Advanced", "What is the hydrateRoot API?", "Hydrates server-rendered content for concurrent mode"),
    ("Advanced", "What is the renderToPipeableStream?", "Streams React content for SSR with Node.js streams"),
    ("Advanced", "What is the renderToReadableStream?", "Streams React content for SSR with web streams"),
    ("Advanced", "What is the React Server Components?", "Components that run exclusively on the server"),
    ("Advanced", "What is the 'use client' directive?", "Marks a module as client-side in RSC"),
    ("Advanced", "What is the 'use server' directive?", "Marks a function as server action in RSC"),
    ("Advanced", "What is the server action?", "A function that runs on the server, called from client"),
    ("Advanced", "What is the form action?", "A server action bound to an HTML form"),
    ("Advanced", "What is the useFormStatus hook?", "Reads the status of a parent form submission"),
    ("Advanced", "What is the useFormState hook?", "Returns form state with server action result"),
    ("Advanced", "What is the useOptimistic hook?", "Shows optimistic updates before server response"),
    ("Advanced", "What is the taintObjectReference API?", "Prevents sensitive objects from being passed to client"),
    ("Advanced", "What is the taintUniqueValue API?", "Prevents sensitive values from being passed to client"),
    ("Advanced", "What is the cache function?", "Caches data fetches across components and routes"),
    ("Advanced", "What is the unstable_Activity component?", "Experimental component for offscreen rendering"),
    ("Advanced", "What is the forwardRef and useImperativeHandle pattern?", "Exposing imperative methods from child to parent"),
], "Senior", "React")

# --- Kotlin Senior (20) ---
gen([
    ("Advanced", "What is the Compose compiler?", "The compiler plugin that processes @Composable functions"),
    ("Advanced", "What is the Compose runtime?", "The runtime library for Compose state and recomposition"),
    ("Advanced", "What is the Compose UI?", "The UI component library for Jetpack Compose"),
    ("Advanced", "What is the Material 3 in Compose?", "Material Design 3 components for Jetpack Compose"),
    ("Advanced", "What is the LazyVerticalGrid?", "A grid layout with lazy loading in Compose"),
    ("Advanced", "What is the LazyHorizontalGrid?", "A horizontal grid layout with lazy loading"),
    ("Advanced", "What is the StaggeredGrid?", "A grid with varying item sizes in Compose"),
    ("Advanced", "What is the Paging 3 library?", "Pagination library for loading large datasets incrementally"),
    ("Advanced", "What is the Navigation Compose type safety?", "Type-safe navigation using serializable routes"),
    ("Advanced", "What is the Compose Animation API?", "Declarative animation system for Compose"),
    ("Advanced", "What is the animateFloatAsState?", "Animates a float value in Compose"),
    ("Advanced", "What is the animateContentSize?", "Animates content size changes in Compose"),
    ("Advanced", "What is the Crossfade in Compose?", "Crossfade transition between composables"),
    ("Advanced", "What is the AnimatedVisibility?", "Animated show/hide of composables"),
    ("Advanced", "What is the AnimatedContent?", "Animated content switching in Compose"),
    ("Advanced", "What is the modifier order importance?", "Modifier order affects how they are applied"),
    ("Advanced", "What is the Compose testing?", "Testing composables with Compose Test Rule"),
    ("Advanced", "What is the Compose snapshot system?", "The state observation system that triggers recomposition"),
    ("Advanced", "What is the recomposition scope?", "The scope of code that re-executes on state change"),
    ("Advanced", "What is the Compose phase system?", "The three phases: composition, layout, drawing"),
], "Senior", "Kotlin")

with open(MJS, 'w', encoding='utf-8') as f:
    f.write(before + ''.join(new) + after)
print(f"Batch 11 added {len(new)} questions. Total: 4857 + {len(new)}")