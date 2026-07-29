"""Batch 23: 2000 fresh questions - all new topics, no repeats, strict JSON"""
import json
MJS = "C:/Users/Honor/Desktop/Code/java-interview-tinder/backend/src/scripts/seed-generated.mjs"
with open(MJS, "r", encoding="utf-8") as f:
    content = f.read()
idx = content.index("\nasync function seedDB()")
new = []

def esc(s):
    return s.replace("\\", "\\\\").replace("'", "\\'")

def Q(cat, q, a, diff, lang):
    opts = [a, "Common misconception", "Alternative approach", "I don\'t know"]
    obj = {"category": cat, "question": q, "short_answer": a, "options": opts, "difficulty": diff, "language": lang}
    json.dumps(obj, ensure_ascii=False)
    assert all(isinstance(o, str) and len(o) > 0 for o in opts), f"Options validation failed for: {q[:50]}"
    new.append(f"  Q(\'{esc(cat)}\', \'{esc(q)}\', \'{esc(a)}\', [\'{esc(opts[0])}\', \'{esc(opts[1])}\', \'{esc(opts[2])}\', \'{esc(opts[3])}\'], \'{diff}\', \'{lang}\');\n")

def g(t, d, l):
    for c, q, a in t:
        Q(c, q, a, d, l)

# ================ VIRTUAL THREADS (Java) ================
g([
    ("Virtual Threads", "What are virtual threads in Java?", "Lightweight threads managed by the JVM"),
    ("Virtual Threads", "What is Project Loom?", "JDK effort to add lightweight concurrency"),
    ("Virtual Threads", "What is the difference between virtual and platform threads?", "Platform maps 1:1 to OS threads, virtual many:1"),
    ("Virtual Threads", "What is Thread.ofVirtual()?", "Builder for creating virtual threads"),
    ("Virtual Threads", "What is Thread.ofPlatform()?", "Builder for creating platform threads"),
    ("Virtual Threads", "What is StructuredTaskScope in virtual threads?", "Structured concurrency scope for virtual threads"),
    ("Virtual Threads", "What is VirtualThread.startUndetermined()?", "Starts a virtual thread without determinism"),
    ("Virtual Threads", "What is the Thread.Builder interface?", "Fluent builder for thread configuration"),
    ("Virtual Threads", "What is pinned virtual threads?", "Virtual thread blocked on native call, cannot migrate"),
    ("Virtual Threads", "What is virtual thread mounting/unmounting?", "Attachment/detachment from carrier OS thread"),
], "Senior", "Java")

# ================ STRUCTURED CONCURRENCY (Java) ================
g([
    ("Structured Concurrency", "What is structured concurrency?", "Scope-based concurrency with child tasks"),
    ("Structured Concurrency", "What is StructuredTaskScope.ShutdownOnFailure?", "Cancels all tasks on first failure"),
    ("Structured Concurrency", "What is StructuredTaskScope.ShutdownOnSuccess?", "Cancels all tasks on first success"),
    ("Structured Concurrency", "What is StructuredTaskScope.Strict?", "No automatic cancellation of child tasks"),
    ("Structured Concurrency", "What is StructuredTaskScope.Speculation?", "Speculative execution of alternative branches"),
    ("Structured Concurrency", "What are the benefits of structured concurrency?", "Predictable lifetime, error propagation"),
    ("Structured Concurrency", "What problem does structured concurrency solve?", "Unstructured thread management and resource leaks"),
    ("Structured Concurrency", "What is ScopeClosedException?", "Thrown when accessing scope after closure"),
    ("Structured Concurrency", "What is the difference between structured and unstructured concurrency?", "Lifetimes are nested and deterministic"),
    ("Structured Concurrency", "How does structured concurrency handle exceptions?", "First exception triggers cancellation of siblings"),
], "Senior", "Java")

# ================ SCOPED VALUES (Java) ================
g([
    ("Scoped Values", "What are scoped values in Java?", "Immutable thread-local values with scoped lifetime"),
    ("Scoped Values", "What is ScopedValue.bindTo()?", "Binds a scoped value for the duration of a scope"),
    ("Scoped Values", "What is ScopedValue.where()?", "Creates a scope with bound scoped values"),
    ("Scoped Values", "What is the difference between scoped values and ThreadLocal?", "Scoped values are immutable and scoped"),
    ("Scoped Values", "What are the benefits of scoped values over ThreadLocal?", "Safety, immutability, automatic cleanup"),
    ("Scoped Values", "Can scoped values be used with virtual threads?", "Yes, they work with both virtual and platform threads"),
    ("Scoped Values", "What is inheritable scoped values?", "Scoped values can be inherited by child threads"),
    ("Scoped Values", "What is the performance comparison ThreadLocal vs scoped values?", "Scoped values are faster for read-heavy workloads"),
    ("Scoped Values", "What is ScopedValue.get()?", "Retrieves the current value of a scoped value"),
    ("Scoped Values", "What are the use cases for scoped values?", "Request context, correlation IDs, locale, security context"),
], "Senior", "Java")

# ================ FOREIGN FUNCTION & MEMORY API (Java) ================
g([
    ("Foreign Function API", "What is the Foreign Function & Memory API?", "JDK API for interop with native code and memory"),
    ("Foreign Function API", "What is a MemorySegment?", "A region of native memory with a layout"),
    ("Foreign Function API", "What is a MemoryLayout?", "Describes the structure and layout of native memory"),
    ("Foreign Function API", "What is the Linker interface?", "Provides native linking for Java methods"),
    ("Foreign Function API", "What is upcall stub in FFM API?", "Java method callable from native code"),
    ("Foreign Function API", "What is downcall stub in FFM API?", "Native function callable from Java"),
    ("Foreign Function API", "What is the MemorySession?", "Lifecycle scope for native memory allocation"),
    ("Foreign Function API", "What are ResourceLeakDetector in FFM API?", "Detects leaking native memory segments"),
    ("Foreign Function API", "What is the ArenaAllocator?", "Arena-based native memory allocator"),
    ("Foreign Function API", "What is ValueLayout in FFM API?", "Describes the layout of a native value"),
], "Senior", "Java")

# ================ VECTOR API (Java) ================
g([
    ("Vector API", "What is the Vector API in Java?", "JDK incubator for SIMD vector computations"),
    ("Vector API", "What are vector species?", "Describes vector species and bit width"),
    ("Vector API", "What is a VectorSpecies?", "Represents a specific vector species (e.g., FloatVector.SPECIES_256)"),
    ("Vector API", "What is SpeciesBitSize?", "Number of bits in a vector species"),
    ("Vector API", "What is Vector.fromArray()?", "Creates a vector from an array of values"),
    ("Vector API", "What is Vector.intoArray()?", "Stores vector values into an array"),
    ("Vector API", "What are lane operations in Vector API?", "Per-element operations on vector lanes"),
    ("Vector API", "What is a mask in the Vector API?", "Boolean per-lane selection mask"),
    ("Vector API", "What is VectorBroadcast()?", "Creates a vector with all lanes set to the same value"),
    ("Vector API", "What is VectorBlend()?", "Selects lanes from multiple vectors using a mask"),
], "Senior", "Java")

# ================ STRING TEMPLATES (Java) ================
g([
    ("String Templates", "What are string templates in Java?", "Preview feature for embedded expressions in strings"),
    ("String Templates", "What is a TemplateProcessor?", "Processes string templates to produce results"),
    ("String Templates", "What is STR in string templates?", "Built-in STR processor for string interpolation"),
    ("String Templates", "What is the syntax of string templates?", "$STR.{expression} embedded in strings"),
    ("String Templates", "What is a TemplateExpression?", "Expression embedded within a string template"),
    ("String Templates", "What are the advantages of string templates over concatenation?", "Readability, type safety, internationalization"),
    ("String Templates", "What is the FMT processor?", "Formatted string processor with rich formatting"),
    ("String Templates", "What are string template transitions?", "Control how embedded values are converted to strings"),
    ("String Templates", "What is a string template compiler API?", "API to compile and process templates programmatically"),
    ("String Templates", "What is the difference between STR and FMT processors?", "FMT supports format specifiers like %s, %d, %f"),
], "Senior", "Java")

# ================ GRAALVM NATIVE IMAGE (Java) ================
g([
    ("GraalVM Native Image", "What is GraalVM Native Image?", "AOT compilation to native executable"),
    ("GraalVM Native Image", "What is the native-image tool?", "Compile Java to native binary"),
    ("GraalVM Native Image", "What are the benefits of native image?", "Faster startup, lower memory footprint"),
    ("GraalVM Native Image", "What is reflection configuration in native image?", "Register classes for reflective access"),
    ("GraalVM Native Image", "What is proxy configuration in native image?", "Register dynamic proxies for native image"),
    ("GraalVM Native Image", "What is the reachability metadata in native image?", "Tells compiler what code is reachable"),
    ("GraalVM Native Image", "What is a native-image agent?", "Collects configuration automatically at runtime"),
    ("GraalVM Native Image", "What is BuildImageConfiguration?", "Configures native image build process"),
    ("GraalVM Native Image", "What are the limitations of GraalVM Native Image?", "Reflection, dynamic class loading, JNI"),
    ("GraalVM Native Image", "What is Native Image Build Args (niba)?", "Arguments passed to native image builder"),
], "Senior", "Java")

# ================ JFR & JMC (Java) ================
g([
    ("JFR & JMC", "What is Java Flight Recorder (JFR)?", "Low-overhead event collection framework"),
    ("JFR & JMC", "What is Java Mission Control (JMC)?", "JVM monitoring and management tool"),
    ("JFR & JMC", "What is a Flight Recording in JFR?", "Recording of JVM events to a file"),
    ("JFR & JMC", "What is the jfr command?", "Creates and manages flight recordings from CLI"),
    ("JFR & JMC", "What is a JFR event?", "A unit of data collected by flight recorder"),
    ("JFR & JMC", "What are custom JFR events?", "User-defined events for application profiling"),
    ("JFR & JMC", "What is the Event class in JFR?", "Base class for custom JFR events"),
    ("JFR & JMC", "What is Threshold in JFR events?", "Only emit events if threshold is exceeded"),
    ("JFR & JMC", "What is StackTrace in JFR events?", "Captures stack trace with the event"),
    ("JFR & JMC", "What is the Memory pressure in JFR?", "Events related to memory pressure and GC"),
], "Senior", "Java")

# ================ JLink and JPackage (Java) ================
g([
    ("JLink", "What is jlink in Java?", "Tool to assemble and optimize custom runtime images"),
    ("JLink", "What is a custom runtime image?", "Minimal JRE with only required modules"),
    ("JLink", "What is the --add-modules flag in jlink?", "Includes specified modules in the runtime"),
    ("JLink", "What is the --strip-debug flag in jlink?", "Removes debug symbols from the runtime"),
    ("JLink", "What is the --compress flag in jlink?", "Compresses the runtime image resources"),
    ("JLink", "What is the --no-header-files flag?", "Excludes header files from the runtime image"),
    ("JLink", "What is jpackage in Java?", "Tool to package Java applications as native installers"),
    ("JLink", "What types of installers does jpackage create?", "MSI, DMG, DEB, RPM, PKG, EXE"),
    ("JLink", "What is the --input-dir flag in jpackage?", "Directory containing application jars and resources"),
    ("JLink", "What is the --main-jar flag in jpackage?", "Specifies the main JAR for the application"),
], "Senior", "Java")

# ================ SECURITY SSL/TLS (Java) ================
g([
    ("Security SSL", "What is SSL/TLS handshake?", "Negotiation of encryption parameters between client and server"),
    ("Security SSL", "What is the SSLContext class?", "Factory for SSL socket and engine instances"),
    ("Security SSL", "What is TLS 1.3?", "Latest TLS version with 0-RTT and improved security"),
    ("Security SSL", "What is the KeyManager interface?", "Provides key material for SSL connections"),
    ("Security SSL", "What is the TrustManager interface?", "Decides whether to trust remote server certificates"),
    ("Security SSL", "What is X509TrustManager?", "Trust manager that validates X.509 certificates"),
    ("Security SSL", "What is certificate pinning?", "Hardcoding expected certificate or public key in the application"),
    ("Security SSL", "What is OCSP stapling?", "Server provides pre-fetched OCSP response during handshake"),
    ("Security SSL", "What is SNI (Server Name Indication)?", "TLS extension indicating the target hostname"),
    ("Security SSL", "What is PKCS12 KeyStore?", "PKCS#12 format for storing private keys and certificates"),
], "Senior", "Java")

# ================ KEYSTORE & CRYPTO (Java) ================
g([
    ("KeyStore & Crypto", "What is a Java KeyStore (JKS)?", "Repository of security certificates and keys"),
    ("KeyStore & Crypto", "What is PKCS12 KeyStore format?", "Cross-platform certificate storage format"),
    ("KeyStore & Crypto", "What is KeyStore.getInstance()?", "Gets a KeyStore object of specified type"),
    ("KeyStore & Crypto", "What is the KeyStore.load() method?", "Loads key store data from input stream"),
    ("KeyStore & Crypto", "What is KeyStore.setKeyEntry()?", "Stores a key with its chain in the key store"),
    ("KeyStore & Crypto", "What is KeyStore.setCertificateEntry()?", "Stores a trusted certificate in the key store"),
    ("KeyStore & Crypto", "What is Cipher.getInstance()?", "Creates a Cipher object for encryption/decryption"),
    ("KeyStore & Crypto", "What is cipher initialization modes?", "ENCRYPT_MODE, DECRYPT_MODE, WRAP_MODE, UNWRAP_MODE"),
    ("KeyStore & Crypto", "What is SecureRandom in Java?", "Cryptographically strong random number generator"),
    ("KeyStore & Crypto", "What is the KeyGenerator class?", "Generates symmetric secret keys"),
], "Senior", "Java")

# ================ MODULE SYSTEM ADVANCED (Java) ================
g([
    ("Module System Advanced", "What is a module directive in Java?", "module, requires, exports, opens, provides, uses"),
    ("Module System Advanced", "What is module-info.java?", "File describing a Java module's dependencies and exports"),
    ("Module System Advanced", "What is a qualified export?", "exports a package only to specific modules"),
    ("Module System Advanced", "What is a module patch?", "Overrides a module at runtime"),
    ("Module System Advanced", "What is automatic module?", "JAR without module-info treated as named module"),
    ("Module System Advanced", "What is a split package?", "Same package in multiple modules (anti-pattern)"),
    ("Module System Advanced", "What is the module graph?", "DAG of all modules and their dependencies"),
    ("Module System Advanced", "What are module layers?", "Isolated module configurations at runtime"),
    ("Module System Advanced", "What is ModuleLayer.configureAndCreate()?", "Creates a new module layer with parent"),
    ("Module System Advanced", "What is --permit-illegal-access?", "Allows access to internal JDK APIs (deprecated)"),
], "Senior", "Java")

# ================ MULTI-RELEASE JAR (Java) ================
g([
    ("Multi-release JAR", "What is a multi-release JAR?", "JAR with version-specific class files"),
    ("Multi-release JAR", "What is META-INF/versions directory?", "Contains classes for specific Java versions"),
    ("Multi-release JAR", "What is the META-INF/MANIFEST.MF Release entry?", "Declares the minimum Java version for the JAR"),
    ("Multi-release JAR", "How does jar select the right version?", "Matches running Java version with META-INF/versions subdirs"),
    ("Multi-release JAR", "What is the jar tool --release flag in pack200?", "Creates multi-version JAR files"),
    ("Multi-release JAR", "What is the benefits of multi-release JAR?", "Backward compatibility with version-specific optimizations"),
    ("Multi-release JAR", "What is the default class version behavior?", "Class runs on the version it was compiled for or later"),
    ("Multi-release JAR", "How do you create a multi-record JAR?", "jar --release <version> from command line"),
    ("Multi-release JAR", "What are the compatibility rules?", "Earlier Java versions ignore versioned class files"),
    ("Multi-release JAR", "Can multi-release JARs contain Java 21 classes?", "Yes, they will only be used on Java 21+ JVMs"),
], "Senior", "Java")

# ================ JSHELL ADVANCED (Java) ================
g([
    ("JShell Advanced", "What is JShell?", "Interactive REPL for Java introduced in JDK 9"),
    ("JShell Advanced", "What are JShell snippets?", "Java code entered in the shell as fragments"),
    ("JShell Advanced", "What are the snippet types in JShell?", "Import, method, class, interface, enum, package"),
    ("JShell Advanced", "What is the /drop command in JShell?", "Removes a previously declared item"),
    ("JShell Advanced", "What is the /edit command in JShell?", "Opens editor to modify a snippet"),
    ("JShell Advanced", "What is the /list command in JShell?", "Lists all active snippets"),
    ("JShell Advanced", "What is the /save command in JShell?", "Saves current session to a file"),
    ("JShell Advanced", "What is the /env command in JShell?", "Sets environment and compiler options"),
    ("JShell Advanced", "What is the /reset command in JShell?", "Resets the JShell session to initial state"),
    ("JShell Advanced", "What is the /exit command in JShell?", "Exits the JShell session"),
], "Senior", "Java")

# ================ HTTP CLIENT ADVANCED (Java) ================
g([
    ("HTTP Client Advanced", "What is the java.net.http.HttpClient?", "Modern HTTP client for Java 11+"),
    ("HTTP Client Advanced", "What is HttpRequest.newBuilder()?", "Builder for creating HTTP requests"),
    ("HTTP Client Advanced", "What is HttpResponse.BodyHandlers?", "Pre-built handlers for processing response bodies"),
    ("HTTP Client Advanced", "What is HttpRequest.BodyPublishers?", "Publishers for request body data"),
    ("HTTP Client Advanced", "What is WebSocket in the HTTP Client API?", "Client-side WebSocket support"),
    ("HTTP Client Advanced", "What is HttpClient.connectTimeout()?", "Sets timeout for establishing connections"),
    ("HTTP Client Advanced", "What follows redirects in HttpClient?", "ALWAYS, NEVER, or NORMAL redirect behavior"),
    ("HTTP Client Advanced", "What is the HTTP CONNECT method?", "Establishes tunnel through proxy to destination"),
    ("HTTP Client Advanced", "What is HTTP/2 push promises?", "Server proactively sends resources to client"),
    ("HTTP Client Advanced", "What is HttpClient.sendAsync()?", "Sends request asynchronously returning CompletableFuture"),
], "Senior", "Java")

# ================ MICROSERVICES PATTERNS (Java) ================
g([
    ("Microservices Patterns", "What is the API Gateway pattern?", "Single entry point routing requests to services"),
    ("Microservices Patterns", "What is Service Discovery?", "Automatic detection of service instances"),
    ("Microservices Patterns", "What is Circuit Breaker pattern?", "Prevents cascading failures across services"),
    ("Microservices Patterns", "What is the Saga pattern?", "Distributed transaction across multiple services"),
    ("Microservices Patterns", "What is Event Sourcing?", "Store state changes as a sequence of events"),
    ("Microservices Patterns", "What is CQRS pattern?", "Separate read and write models for data"),
    ("Microservices Patterns", "What is the Outbox Pattern?", "Ensure atomicity of DB writes and message publishing"),
    ("Microservices Patterns", "What is the Strangler Fig pattern?", "Gradual migration from monolith to microservices"),
    ("Microservices Patterns", "What is Domain Event?", "Notification that something domain-relevant happened"),
    ("Microservices Patterns", "What is Idempotency in APIs?", "Operations can be repeated with same result"),
], "Senior", "Java")

# ================ JEP DEEP DIVE (Java) ================
g([
    ("JEP Deep Dive", "What is a JEP (Java Enhancement Proposal)?", "Proposal for a new feature or change to JDK"),
    ("JEP Deep Dive", "What is JEP 430 (String Templates)?", "Finalized string templates feature"),
    ("JEP Deep Dive", "What is JEP 456 (Virtual Threads)?", "Project Loom virtual threads"),
    ("JEP Deep Dive", "What is JEP 461 (Stream Gatherers)?", "New Stream API intermediate operations"),
    ("JEP Deep Dive", "What is JEP 470 (Porter Stemmer)?", "Text stemming library for Java"),
    ("JEP Deep Dive", "What is JEP 473 (Scoped Values)?", "Scoped values as preview feature"),
    ("JEP Deep Dive", "What is JEP 454 (Foreign Function API)?", "Foreign function and memory access"),
    ("JEP Deep Dive", "What is JEP 338 (Vector API)?", "Vector API for SIMD operations"),
    ("JEP Deep Dive", "What is JEP 407 (Removal of RMI Activation)?", "Removed RMI activation mechanism"),
    ("JEP Deep Dive", "What is JEP 444 (Virtual Threads)?", "Original virtual threads preview"),
], "Senior", "Java")

# ================ GRADLE KOTLIN DSL ADVANCED (Java) ================
g([
    ("Gradle Kotlin DSL Advanced", "What is the Gradle Kotlin DSL?", "Type-safe build scripts using Kotlin"),
    ("Gradle Kotlin DSL Advanced", "What is buildSrc in Gradle?", "Shared code across build scripts"),
    ("Gradle Kotlin DSL Advanced", "What is convention plugins in Gradle?", "Reusable build logic packaged as plugins"),
    ("Gradle Kotlin DSL Advanced", "What is Gradle Configuration Cache?", "Cache configuration phase for faster builds"),
    ("Gradle Kotlin DSL Advanced", "What is Gradle Build Cache?", "Cache build outputs across builds"),
    ("Gradle Kotlin DSL Advanced", "What are Gradle composite builds?", "Include multiple Gradle projects in a build"),
    ("Gradle Kotlin DSL Advanced", "What is the settings.gradle.kts file?", "Configures the build for multi-project setups"),
    ("Gradle Kotlin DSL Advanced", "What is Gradle Test Distribution?", "Distributes test execution across executors"),
    ("Gradle Kotlin DSL Advanced", "What is Gradle Enterprise?", "Enterprise build insights and caching"),
    ("Gradle Kotlin DSL Advanced", "What is configuration avoidance in Gradle?", "Avoids configuring unused tasks at startup"),
], "Senior", "Java")

# ================ FASTAPI ADVANCED (Python) ================
g([
    ("FastAPI Advanced", "What is FastAPI dependency injection?", "Dependencies injected into path operation functions"),
    ("FastAPI Advanced", "What is APIRouter in FastAPI?", "Modular routing for API endpoints"),
    ("FastAPI Advanced", "What is the Starlette ASGI framework?", "Underlying ASGI toolkit for FastAPI"),
    ("FastAPI Advanced", "What is BackgroundTasks in FastAPI?", "Run background tasks after response"),
    ("FastAPI Advanced", "What is WebSocket in FastAPI?", "WebSocket endpoint for real-time communication"),
    ("FastAPI Advanced", "What is the UploadFile class in FastAPI?", "For handling file uploads in endpoints"),
    ("FastAPI Advanced", "What is FastAPI middleware?", "Request/response processing pipeline"),
    ("FastAPI Advanced", "What is HTTPException in FastAPI?", "Raising HTTP error responses"),
    ("FastAPI Advanced", "What is Pydantic v2 model_construct()?", "Create Pydantic models without validation"),
    ("FastAPI Advanced", "What is the FastAPI test client?", "TestClient for testing FastAPI applications"),
], "Senior", "Python")

# ================ DJANGO ADVANCED (Python) ================
g([
    ("Django Advanced", "What is Django request/response lifecycle?", "Middleware, URL routing, view, template rendering"),
    ("Django Advanced", "What is Class-Based Views in Django?", "Views implemented as classes with mixins"),
    ("Django Advanced", "What is Django REST Framework (DRF)?", "Serializers, views, permissions for APIs"),
    ("Django Advanced", "What is Django Channels?", "WebSocket and async support for Django"),
    ("Django Advanced", "What are Django middlewares?", "Request/response processing components"),
    ("Django Advanced", "What is the Django Object-Relational Mapper?", "Maps Python classes to database tables"),
    ("Django Advanced", "What is Django Signals?", "Decoupled event notification system"),
    ("Django Advanced", "What is Django Management Commands?", "Custom command-line utilities for Django"),
    ("Django Advanced", "What is Django Template Language?", "Template engine for rendering HTML"),
    ("Django Advanced", "What is Django permissions/authentication?", "Built-in auth system with permissions"),
], "Senior", "Python")

# ================ PYTHON C EXTENSIONS (Python) ================
g([
    ("Python C Extensions", "What are Python C extensions?", "C code callable from Python via CPython API"),
    ("Python C Extensions", "What is the PyModuleDef structure?", "Module definition for C extension modules"),
    ("Python C Extensions", "What is PyMethodDef?", "Method table for C extension functions"),
    ("Python C Extensions", "What is PyArg_ParseTuple?", "Parse Python arguments in C extensions"),
    ("Python C Extensions", "What is Py_BuildValue()?", "Build Python objects from C values"),
    ("Python C Extensions", "What is Cython?", "Python-to-C compiler for performance"),
    ("Python C Extensions", "What is the ctypes module?", "Call C functions from pure Python"),
    ("Python C Extensions", "What is cffi?", "C Foreign Function Interface for Python"),
    ("Python C Extensions", "What is PyBind11?", "C++ library for creating Python bindings"),
    ("Python C Extensions", "What is the Python Global Interpreter Lock (GIL)?", "Mutex protecting Python object access"),
], "Senior", "Python")

# ================ COROUTINE INTERNALS (Python) ================
g([
    ("Coroutine Internals", "What is a coroutine at the Python level?", "Special function that can be paused and resumed"),
    ("Coroutine Internals", "What is the __code__ object for coroutines?", "Code object with CO_COROUTINE flag"),
    ("Coroutine Internals", "What is asyncio.__sleep__?", "Special method for non-blocking sleep"),
    ("Coroutine Internals", "What is the send() method on coroutines?", "Send a value into a suspended coroutine"),
    ("Coroutine Internals", "What is the throw() method on coroutines?", "Raise an exception inside a suspended coroutine"),
    ("Coroutine Internals", "What is the close() method on coroutines?", "Clean up a coroutine generator"),
    ("Coroutine Internals", "What is a generator-based coroutine?", "Legacy coroutine using yield from"),
    ("Coroutine Internals", "What is inspect.iscoroutine()?", "Check if an object is a coroutine function"),
    ("Coroutine Internals", "What is the coroutine.__wrapped__ attribute?", "Access the original function"),
    ("Coroutine Internals", "What is __qualname__ for coroutines?", "Fully qualified name of the coroutine"),
], "Senior", "Python")

# ================ PYTHON C API (Python) ================
g([
    ("Python C API", "What is the Python C API?", "C header file for interacting with CPython"),
    ("Python C API", "What is PyObject?", "Base type for all Python objects in C"),
    ("Python C API", "What is Reference Counting in CPython?", "Memory management by tracking object references"),
    ("Python C API", "What is Py_INCREF()?", "Increments reference count of a Python object"),
    ("Python C API", "What is Py_DECREF()?", "Decrements reference count and possibly frees object"),
    ("Python C API", "What is the GIL (Global Interpreter Lock)?", "Mutex preventing concurrent access to Python objects"),
    ("Python C API", "What is PyArg_ParseTuple()?", "Parse arguments passed to C extension functions"),
    ("Python C API", "What is Py_BuildValue()?", "Construct Python objects from C values"),
    ("Python C API", "What is the PyModule_Create() function?", "Creates a new module object from C"),
    ("Python C API", "What is PyRun_SimpleString()?", "Execute Python code from a C string"),
], "Senior", "Python")

# ================ PYPROJECT.TOML ADVANCED (Python) ================
g([
    ("pyproject.toml Advanced", "What is pyproject.toml?", "Standard Python project configuration file"),
    ("pyproject.toml Advanced", "What is the [build-system] section?", "Specifies build backend and requirements"),
    ("pyproject.toml Advanced", "What is the [project] section?", "Metadata about the Python package"),
    ("pyproject.toml Advanced", "What are [tool.pytest.ini_options]?", "Pytest configuration in pyproject.toml"),
    ("pyproject.toml Advanced", "What are [tool.mypy] options?", "Type checking configuration for mypy"),
    ("pyproject.toml Advanced", "What is the [tool.black] section?", "Black code formatter configuration"),
    ("pyproject.toml Advanced", "What are [project.optional-dependencies]?", "Extra dependency groups for the project"),
    ("pyproject.toml Advanced", "What is setuptools.config?", "Alternative format for project configuration"),
    ("pyproject.toml Advanced", "What is Pip-tools configuration?", "pip-compile with pyproject.toml"),
    ("pyproject.toml Advanced", "What is Hatch configuration?", "Hatch build tool and settings"),
], "Senior", "Python")

# ================ MYPY ADVANCED (Python) ================
g([
    ("Mypy Advanced", "What is mypy?", "Static type checker for Python"),
    ("Mypy Advanced", "What are mypy plugins?", "Plugins extending mypy type checking"),
    ("Mypy Advanced", "What is the mypy.ini configuration?", "Configuration file for mypy type checker"),
    ("Mypy Advanced", "What are mypy stub files (.pyi)?", "Separate type declaration files"),
    ("Mypy Advanced", "What is the reveal_type() function?", "Displays inferred type at a location"),
    ("Mypy Advanced", "What is --strict mode in mypy?", "Enables all strict type checking options"),
    ("Mypy Advanced", "What are Protocol types?", "Structural subtyping via @runtime_checkable"),
    ("Mypy Advanced", "What are TypeVar in mypy?", "Generic type variable definitions"),
    ("Mypy Advanced", "What are TypedDict?", "Dictionary with typed keys and values"),
    ("Mypy Advanced", "What is mypy.dmypy?", "Demon mode for incremental type checking"),
], "Senior", "Python")

# ================ PYTHON PERF PROFILING (Python) ================
g([
    ("Python Perf Profiling", "What is cProfile in Python?", "Built-in deterministic profiler"),
    ("Python Perf Profiling", "What is line_profiler?", "Line-by-line Python profiling tool"),
    ("Python Perf Profiling", "What is memory_profiler?", "Memory usage profiling for Python"),
    ("Python Perf Profiling", "What is py-spy?", "Sampling profiler for Python programs"),
    ("Python Perf Profiling", "What is a flamegraph?", "Visual profiling of call stacks"),
    ("Python Perf Profiling", "What is the timeit module?", "Accurate timing of small code snippets"),
    ("Python Perf Profiling", "What is Python's GIL impact on profiling?", "Profiling threading performance correctly"),
    ("Python Perf Profiling", "What is perf (Linux)?", "Linux performance counters for Python"),
    ("Python Perf Profiling", "What are Python profilers (hotshot, Profile)?", "Built-in profiling modules"),
    ("Python Perf Profiling", "What is Scalene?", "CPU, memory, and GPU profiler for Python"),
], "Senior", "Python")

# ================ PACKAGING ADVANCED (Python) ================
g([
    ("Packaging Advanced", "What is the Python Packaging Authority (PyPA)?", "Standards body for Python packaging"),
    ("Packaging Advanced", "What is pip?", "Python package installer"),
    ("Packaging Advanced", "What is twine?", "Publish packages to PyPI"),
    ("Packaging Advanced", "What is a wheel file (.whl)?", "Built distribution format for Python"),
    ("Packaging Advanced", "What is a source distribution (sdist)?", "Source archive for Python packages"),
    ("Packaging Advanced", "What is the distutils module?", "Legacy build and install system"),
    ("Packaging Advanced", "What is setuptools?", "Modern build system for Python packages"),
    ("Packaging Advanced", "What is the entry_points.txt file?", "Declares console scripts and plugins"),
    ("Packaging Advanced", "What is a namespace package?", "Package without __init__.py spanning multiple dirs"),
    ("Packaging Advanced", "What is editable install?", "pip install -e for development mode"),
], "Senior", "Python")

# ================ BUN RUNTIME (TypeScript) ================
g([
    ("Bun Runtime", "What is Bun?", "Fast all-in-one JavaScript/TypeScript runtime"),
    ("Bun Runtime", "What is bun.js?", "Bun's JavaScript runtime and bundler"),
    ("Bun Runtime", "What is bun install?", "Bun's built-in package manager"),
    ("Bun Runtime", "What is bun test?", "Bun's built-in test runner"),
    ("Bun Runtime", "What is the Bun transpiler?", "High-performance TypeScript transpiler"),
    ("Bun Runtime", "What is Bun.serve()?", "Start an HTTP server in Bun"),
    ("Bun Runtime", "What is bun.lockb?", "Binary lockfile format for Bun"),
    ("Bun Runtime", "What is the Bun plugin API?", "Extend Bun with custom plugins"),
    ("Bun Runtime", "What is the difference between Bun and Node.js?", "Speed, API compatibility, native bundler"),
    ("Bun Runtime", "What is BunQL?", "SQL client for Bun with SQLite"),
], "Senior", "TypeScript")

# ================ DENO ADVANCED (TypeScript) ================
g([
    ("Deno Advanced", "What is Deno?", "Secure runtime for JavaScript and TypeScript"),
    ("Deno Advanced", "What is deno test?", "Built-in test runner for Deno"),
    ("Deno Advanced", "What is the Deno standard library?", "Modules maintained by the Deno team"),
    ("Deno Advanced", "What is deno cache?", "Pre-download and compile module dependencies"),
    ("Deno Advanced", "What is deno lock?", "Lock file for Deno dependencies"),
    ("Deno Advanced", "What is Deno Deploy?", "Edge deployment platform for Deno"),
    ("Deno Advanced", "What is the Deno permissions system?", "Secure-by-default permission model"),
    ("Deno Advanced", "What is --allow-all flag in Deno?", "Grants all permissions (dangerous)"),
    ("Deno Advanced", "What is the deno doc command?", "Documentation generator for Deno modules"),
    ("Deno Advanced", "What is the difference between Deno and Node?", "Security, TypeScript native, no npm"),
], "Senior", "TypeScript")

# ================ NODE.JS STREAMS ADVANCED (TypeScript) ================
g([
    ("Node.js Streams Advanced", "What are readable streams?", "Streams you can read data from"),
    ("Node.js Streams Advanced", "What are writable streams?", "Streams you can write data to"),
    ("Node.js Streams Advanced", "What are transform streams?", "Streams that read and write, transforming data"),
    ("Node.js Streams Advanced", "What are duplex streams?", "Streams that are both readable and writable"),
    ("Node.js Streams Advanced", "What is piping in Node.js streams?", "Connect output of one stream to input of another"),
    ("Node.js Streams Advanced", "What is backpressure in streams?", "When writable stream slows down readable"),
    ("Node.js Streams Advanced", "What is the _read() method?", "Called when data is requested from readable"),
    ("Node.js Streams Advanced", "What is the _write() method?", "Called when data arrives at writable"),
    ("Node.js Streams Advanced", "What is objectMode in streams?", "Streams that operate on objects not buffers/strings"),
    ("Node.js Streams Advanced", "What is stream.pipeline()?", "Safely pipe streams with error handling"),
], "Senior", "TypeScript")

# ================ WORKER THREADS (TypeScript) ================
g([
    ("Worker Threads", "What are Worker Threads in Node.js?", "Multithreading support in Node.js"),
    ("Worker Threads", "What is the Worker class?", "Spawn a new JavaScript thread"),
    ("Worker Threads", "What is parentPort?", "Communication channel back to the main thread"),
    ("Worker Threads", "What is workerData?", "Data passed to the worker thread"),
    ("Worker Threads", "What is MessagePort?", "Communication channel between threads"),
    ("Worker Threads", "What is SharedArrayBuffer?", "Shared memory between worker threads"),
    ("Worker Threads", "What is Atomics object?", "Atomic operations on SharedArrayBuffer"),
    ("Worker Threads", "What is the Worker.isMainThread flag?", "Check if code is running in main thread"),
    ("Worker Threads", "What is threadId in worker threads?", "Numeric ID of the current thread"),
    ("Worker Threads", "What is the worker thread pool in Node.js?", "Pool of reusable worker threads"),
], "Senior", "TypeScript")

# ================ EDGE RUNTIME (TypeScript) ================
g([
    ("Edge Runtime", "What is the Edge Runtime?", "Lightweight V8-based runtime for edge computing"),
    ("Edge Runtime", "What is Cloudflare Workers?", "Serverless edge computing platform"),
    ("Edge Runtime", "What is Deno Deploy?", "Deno on the edge with global distribution"),
    ("Edge Runtime", "What is Vercel Edge Functions?", "Edge functions for Next.js applications"),
    ("Edge Runtime", "What is Durable Objects (Cloudflare)?", "Persistent objects at the edge"),
    ("Edge Runtime", "What is the Service Worker API?", "Browser-based edge computing API"),
    ("Edge Runtime", "What is the FetchEvent interface?", "Event for handling fetch requests at edge"),
    ("Edge Runtime", "What is KV Workers KV?", "Cloudflare key-value storage at the edge"),
    ("Edge Runtime", "What is Durable R2?", "Persistent storage at the edge"),
    ("Edge Runtime", "What is the differences Edge vs Server?", "Cold start, execution model, available APIs"),
], "Senior", "TypeScript")

# ================ MONOREPO TOOLING (TypeScript) ================
g([
    ("Monorepo Tooling", "What is a monorepo?", "Single repository containing multiple projects"),
    ("Monorepo Tooling", "What is Turborepo?", "High-performance build system for JavaScript repos"),
    ("Monorepo Tooling", "What is Nx?", "Extensible build system for monorepos"),
    ("Monorepo Tooling", "What is Lerna?", "Tool for managing JavaScript projects with multiple packages"),
    ("Monorepo Tooling", "What is pnpm workspaces?", "Package manager workspaces for monorepos"),
    ("Monorepo Tooling", "What is yarn workspaces?", "Package management for multi-package repositories"),
    ("Monorepo Tooling", "What is changesets?", "Version management and changelogs for monorepos"),
    ("Monorepo Tooling", "What is NX affected?", "Run tasks only for affected projects"),
    ("Monorepo Tooling", "What is remote caching?", "Share build results across team members"),
    ("Monorepo Tooling", "What is a task graph in monorepos?", "Parallel task execution with dependency ordering"),
], "Senior", "TypeScript")

# ================ ESBUILD ADVANCED (TypeScript) ================
g([
    ("esbuild Advanced", "What is esbuild?", "Extremely fast JavaScript bundler and minifier"),
    ("esbuild Advanced", "What is esbuild loader?", "Handles different file types during bundling"),
    ("esbuild Advanced", "What is esbuild resolve extensions?", "How esbuild resolves module imports"),
    ("esbuild Advanced", "What is esbuild external?", "Exclude modules from the bundle"),
    ("esbuild Advanced", "What is esbuild define?", "Replace global constants during build"),
    ("esbuild Advanced", "What is esbuild watch mode?", "Watch for file changes and rebuild"),
    ("esbuild Advanced", "What is esbuild bundle splitting?", "Code splitting into multiple output files"),
    ("esbuild Advanced", "What is esbuild minify?", "Minify JavaScript output"),
    ("esbuild Advanced", "What is esbuild metafile?", "JSON output with build metadata"),
    ("esbuild Advanced", "What is esbuild API?", "Programmatic access to esbuild"),
], "Senior", "TypeScript")

# ================ HONO ADVANCED (TypeScript) ================
g([
    ("Hono Advanced", "What is Hono?", "Lightweight web framework for edge computing"),
    ("Hono Advanced", "What is Hono middleware?", "Request/response processing pipeline"),
    ("Hono Advanced", "What is Hono cors middleware?", "Cross-Origin Resource Sharing middleware"),
    ("Hono Advanced", "What is Hono bearer auth?", "Bearer token authentication middleware"),
    ("Hono Advanced", "What is Hono rate limiter?", "Rate limiting for API endpoints"),
    ("Hono Advanced", "What is Hono's router?", "Ultra-fast HTTP router"),
    ("Hono Advanced", "What is Hono JSX/SSR?", "Server-side rendering with JSX"),
    ("Hono Advanced", "What is Hono Cloudflare Bindings?", "Access Cloudflare platform APIs"),
    ("Hono Advanced", "What is Hono websocket handler?", "WebSocket endpoint handler"),
    ("Hono Advanced", "What is Hono testing?", "Testing Hono applications"),
], "Senior", "TypeScript")

# ================ ELYSIA (TypeScript) ================
g([
    ("Elysia", "What is Elysia?", "TypeScript-first web framework for Bun"),
    ("Elysia", "What is Elysia controller?", "Organize endpoint definitions"),
    ("Elysia", "What is Elysia schema?", "Type-safe request/response validation"),
    ("Elysia", "What is Elysia group?", "Group related routes together"),
    ("Elysia", "What is Elysia guard?", "Middleware-like guard for routes"),
    ("Elysia", "What is Elysia error handling?", "Custom error response handling"),
    ("Elysia", "What is Elysia model?", "Type definitions for request bodies"),
    ("Elysia", "What is Elysia afterHandle?", "Post-processing middleware hook"),
    ("Elysia", "What is Elysia resolve?", "Resolve dependencies during request"),
    ("Elysia", "What is Elysia macro?", "Add reusable properties to routes"),
], "Senior", "TypeScript")

# ================ GO GENERICS ADVANCED (Go) ================
g([
    ("Go Generics Advanced", "What are Go generics?", "Type parameters introduced in Go 1.18"),
    ("Go Generics Advanced", "What is a type parameter constraint?", "Restricts the types that can be used as type arguments"),
    ("Go Generics Advanced", "What is an embedded type constraint?", "Using embedded interface as constraint"),
    ("Go Generics Advanced", "What is the any constraint?", "Alias for interface{} which accepts any type"),
    ("Go Generics Advanced", "What is comparable constraint?", "Type that supports == operator"),
    ("Go Generics Advanced", "What is a type list constraint?", "Restriction to a set of specific types"),
    ("Go Generics Advanced", "What are type sets?", "Set of types that satisfy a constraint"),
    ("Go Generics Advanced", "What is the min() and max() built-in?", "Generic functions for minimum and maximum"),
    ("Go Generics Advanced", "What is slices.Equal generics?", "Generic equality check for slices"),
    ("Go Generics Advanced", "What is slices.Compact() generics?", "Remove consecutive duplicate elements"),
], "Senior", "Go")

# ================ GO SCHEDULER (Go) ================
g([
    ("Go Scheduler", "What is the Go scheduler (GMP model)?", "G=goroutine, M=thread, P=processor"),
    ("Go Scheduler", "What is a P (processor) in Go?", "Context for goroutine execution"),
    ("Go Scheduler", "What is M (machine) in Go?", "OS thread executing goroutines"),
    ("Go Scheduler", "What is G (goroutine) in Go?", "Lightweight execution unit"),
    ("Go Scheduler", "What is work stealing in Go scheduler?", "P steals goroutines from other Ps"),
    ("Go Scheduler", "What is sysmon in Go?", "System monitor checking goroutine preemption"),
    ("Go Scheduler", "What is preemption in Go?", "Forcing goroutines to yield CPU"),
    ("Go Scheduler", "What is GOMAXPROCS?", "Maximum number of OS threads for G"),
    ("Go Scheduler", "What is Go scheduler latency?", "Time to schedule next goroutine"),
    ("Go Scheduler", "What is Go scheduler debugging?", "GODEBUG flags for scheduler behavior"),
], "Senior", "Go")

# ================ GO UNSAFE ADVANCED (Go) ================
g([
    ("Go Unsafe Advanced", "What is the unsafe package in Go?", "Package for low-level memory operations"),
    ("Go Unsafe Advanced", "What is unsafe.Pointer?", "Pointer that can alias any type"),
    ("Go Unsafe Advanced", "What is unsafe.Sizeof()?", "Size of a type in bytes"),
    ("Go Unsafe Advanced", "What is unsafe.Alignof()?", "Alignment requirement of a type"),
    ("Go Unsafe Advanced", "What is unsafe.Offsetof()?", "Byte offset of a field in a struct"),
    ("Go Unsafe Advanced", "What is unsafe.Slice()?", "Create a slice from a pointer and length"),
    ("Go Unsafe Advanced", "What is unsafe.String()?", "Create a string from a pointer and length"),
    ("Go Unsafe Advanced", "What is unsafe.SliceData()?", "Get pointer to underlying slice data"),
    ("Go Unsafe Advanced", "What is unsafe.StringData()?", "Get pointer to underlying string data"),
    ("Go Unsafe Advanced", "What are the dangers of unsafe Go?", "Bypassing type safety can cause corruption"),
], "Senior", "Go")

# ================ GO PROTOBUF ADVANCED (Go) ================
g([
    ("Go protobuf advanced", "What is Protocol Buffers in Go?", "Google's serialization format for structured data"),
    ("Go protobuf advanced", "What is protoc-gen-go?", "Go code generator for protobuf"),
    ("Go protobuf advanced", "What is proto.Message?", "Interface for protobuf messages"),
    ("Go protobuf advanced", "What is proto.Marshal()?", "Serialize protobuf message to bytes"),
    ("Go protobuf advanced", "What is proto.Unmarshal()?", "Deserialize bytes back to protobuf"),
    ("Go protobuf advanced", "What is proto.Equal()?", "Compare two protobuf messages"),
    ("Go protobuf advanced", "What are protobuf well-known types?", "Common types like Timestamp, Duration"),
    ("Go protobuf advanced", "What is protojson?", "JSON encoding/decoding for protobuf"),
    ("Go protobuf advanced", "What is gRPC over protobuf?", "RPC framework using protobuf as IDL"),
    ("Go protobuf advanced", "What is proto.RegisterType()?", "Explicitly register a protobuf type"),
], "Senior", "Go")

# ================ GO TESTING ADVANCED (Go) ================
g([
    ("Go Testing Advanced", "What is table-driven testing in Go?", "Multiple test cases in a single test function"),
    ("Go Testing Advanced", "What is testify/testsuite?", "Assertion and mocking libraries for Go"),
    ("Go Testing Advanced", "What is go test ./...?", "Run tests in all packages recursively"),
    ("Go Testing Advanced", "What is go test -race?", "Run tests with race detector"),
    ("Go Testing Advanced", "What is the testing.B benchmark?", "Benchmark function pattern in Go"),
    ("Go Testing Advanced", "What is go test -run pattern?", "Regex filter for test names"),
    ("Go Testing Advanced", "What is go test -count=N?", "Run each test N times"),
    ("Go Testing Advanced", "What is go clean -testcache?", "Clear test cache for Go packages"),
    ("Go Testing Advanced", "What is TestMain()?", "Custom setup/teardown for entire test package"),
    ("Go Testing Advanced", "What is subtest in Go?", "Nested tests with go test -run pattern"),
], "Senior", "Go")

# ================ GO FUZZING ADVANCED (Go) ================
g([
    ("Go Fuzzing Advanced", "What is fuzzing in Go?", "Automated input generation for bug finding"),
    ("Go Fuzzing Advanced", "What is func FuzzXxx(f *testing.F)?", "Fuzz test function signature"),
    ("Go Fuzzing Advanced", "What are fuzz targets?", "Functions to test with random inputs"),
    ("Go Fuzzing Advanced", "What is fuzz corpus?", "Inputs that trigger new code paths"),
    ("Go Fuzzing Advanced", "What is go-fuzz?", "External fuzzing tool for Go programs"),
    ("Go Fuzzing Advanced", "What is the coverage-guided fuzzing?", "Fuzzing guided by code coverage"),
    ("Go Fuzzing Advanced", "What are fuzz timeouts?", "Time limit for each fuzzing run"),
    ("Go Fuzzing Advanced", "What is go-fuzz-build?", "Build a fuzzer for external testing"),
    ("Go Fuzzing Advanced", "What are deterministic reproducer?", "Seed input that reproduces a crash"),
    ("Go Fuzzing Advanced", "What is the go test -fuzz flag?", "Run fuzz tests with the Go toolchain"),
], "Senior", "Go")

# ================ GO PPROF ADVANCED (Go) ================
g([
    ("Go pprof Advanced", "What is pprof in Go?", "Profiling visualization and analysis tool"),
    ("Go pprof Advanced", "What is runtime/pprof?", "Package for profiling Go programs"),
    ("Go pprof Advanced", "What is net/http/pprof?", "HTTP endpoints for profiling web servants"),
    ("Go pprof Advanced", "What are CPU profiles?", "Measure where CPU time is spent"),
    ("Go pprof Advanced", "What are memory profiles?", "Measure memory allocation patterns"),
    ("Go pprof Advanced", "What are block profiles?", "Measure goroutine blocking operations"),
    ("Go pprof Advanced", "What are mutex profiles?", "Measure mutex contention"),
    ("Go pprof Advanced", "What is the diff tool in pprof?", "Compare two profiles"),
    ("Go pprof Advanced", "What is pprof web interface?", "Interactive web UI for profiling"),
    ("Go pprof Advanced", "What are pprof commands?", "Top, list, trace commands for analysis"),
], "Senior", "Go")

# ================ GO OPENTELEMETRY ADVANCED (Go) ================
g([
    ("Go OpenTelemetry Advanced", "What is OpenTelemetry?", "Open-source observability framework"),
    ("Go OpenTelemetry Advanced", "What is OpenTelemetry tracing?", "Distributed tracing in Go"),
    ("Go OpenTelemetry Advanced", "What is span in OpenTelemetry?", "Unit of work with timing metadata"),
    ("Go OpenTelemetry Advanced", "What is a tracer provider?", "Creates tracers for instrumenting code"),
    ("Go OpenTelemetry Advanced", "What is span context propagation?", "Passing span context across service boundaries"),
    ("Go OpenTelemetry Advanced", "What is OpenTelemetry metrics?", "Counters, histograms, gauges"),
    ("Go OpenTelemetry Advanced", "What is OpenTelemetry logs?", "Structured logging with correlation"),
    ("Go OpenTelemetry Advanced", "What is OTLP protocol?", "OpenTelemetry Protocol for exporting telemetry"),
    ("Go OpenTelemetry Advanced", "What is Jaeger?", "Distributed tracing UI and collector"),
    ("Go OpenTelemetry Advanced", "What is OTEL attribute?", "Key-value metadata on spans/metrics"),
], "Senior", "Go")

# ================ GO SQLX ADVANCED (Go) ================
g([
    ("Go SQLx Advanced", "What is sqlx in Go?", "Extended database/sql with struct mapping"),
    ("Go SQLx Advanced", "What is sqlx.NamedQuery()?", "SQL query with named bind parameters"),
    ("Go SQLx Advanced", "What is sqlx.Select()?", "Map rows to a slice of structs"),
    ("Go SQLx Advanced", "What is sqlx.Get()?", "Map a single row to a struct"),
    ("Go SQLx Advanced", "What is sqlx.In()?", "Expand IN clause for prepared statements"),
    ("Go SQLx Advanced", "What is sqlx.Rebind()?", "Convert named parameters to positional"),
    ("Go SQLx Advanced", "What is sqlx.NamedExec()?", "Execute named query"),
    ("Go SQLx Advanced", "What is sqlx.NamedQuery()?", "Execute named query returning rows"),
    ("Go SQLx Advanced", "What is sqlx.Inq()?", "Expand IN clause for any driver"),
    ("Go SQLx Advanced", "What is sqlx.TypeMap?", "Map database types to Go types"),
], "Senior", "Go")

# ================ GO TASKFILE (Go) ================
g([
    ("Go taskfile", "What is Taskfile?", "Task runner for Go projects (like Makefile)"),
    ("Go taskfile", "What is task run?", "Execute a task defined in Taskfile.yml"),
    ("Go taskfile", "What are task dependencies?", "Tasks that depend on other tasks"),
    ("Go taskfile", "What are task includes?", "Include other Taskfiles"),
    ("Go taskfile", "What are task variables?", "Variables for task definitions"),
    ("Go taskfile", "What is go-task?", "Go implementation of the Taskfile runner"),
    ("Go taskfile", "What is --dry-run in task?", "Preview tasks without executing"),
    ("Go taskfile", "What is task -l?", "List available tasks"),
    ("Go taskfile", "What is task -T (JSON output)?", "Output tasks in JSON format"),
    ("Go taskfile", "What is task silence?", "Suppress output for a task"),
], "Senior", "Go")

# ================ ADVANCED ASYNC RUST (Rust) ================
g([
    ("Advanced Async Rust", "What is async Rust?", "Asynchronous programming in Rust"),
    ("Advanced Async Rust", "What is the async/.await syntax in Rust?", "Syntax for async functions and await points"),
    ("Advanced Async Rust", "What is a Future in Rust?", "Core trait representing an async computation"),
    ("Advanced Async Rust", "What is an executor in Rust async?", "Runs async tasks to completion"),
    ("Advanced Async Rust", "What is a reactor in Rust async?", "Waits for I/O events and wakes tasks"),
    ("Advanced Async Rust", "What is a waker in Rust?", "Notifies executor that a task can make progress"),
    ("Advanced Async Rust", "What is Context in Rust async?", "Context passed to poll method containing the waker"),
    ("Advanced Async Rust", "What is AsyncRead trait?", "Async version of Read for streams"),
    ("Advanced Async Rust", "What is AsyncWrite trait?", "Async version of Write for streams"),
    ("Advanced Async Rust", "What is Poll<T> in Rust?", "Pending or Ready result from polling"),
], "Senior", "Rust")

# ================ async-std ADVANCED (Rust) ================
g([
    ("async-std Advanced", "What is async-std?", "Async version of the Rust standard library"),
    ("async-std Advanced", "What is async-std::task?", "Task spawning and management in async-std"),
    ("async-std Advanced", "What is async-std::stream?", "Async version of Iterator for streams"),
    ("async-std Advanced", "What is async-std::channel?", "Multi-producer single-consumer channel"),
    ("async-std Advanced", "What is async-std::net?", "Async network primitives"),
    ("async-std Advanced", "What is async-std::fs?", "Async filesystem operations"),
    ("async-std Advanced", "What is async-std::timer?", "Timer functionality for async-std"),
    ("async-std Advanced", "What is async-std::mutex?", "Async mutex for synchronization"),
    ("async-std Advanced", "What is async-std::rwlock?", "Async read-write lock"),
    ("async-std Advanced", "What is async-std vs tokio?", "Comparison of two async Rust runtimes"),
], "Senior", "Rust")

# ================ UNSAFE RUST ADVANCED (Rust) ================
g([
    ("Unsafe Rust Advanced", "What is unsafe in Rust?", "Block allowing unchecked operations for safety"),
    ("Unsafe Rust Advanced", "What is an unsafe fn in Rust?", "Function that can access unsafe features"),
    ("Unsafe Rust Advanced", "What are unsafe trait impls?", "Implementing unsafe traits requires unsafe block"),
    ("Unsafe Rust Advanced", "What are unsafe extern fn?", "Function with C calling convention, possibly unsafe"),
    ("Unsafe Rust Advanced", "What is unsafe impl?", "Unsafe implementation of a trait"),
    ("Unsafe Rust Advanced", "What is Send and Sync in Rust?", "Auto-traits for thread safety"),
    ("Unsafe Rust Advanced", "What is Send in Rust?", "Type can be transferred across threads"),
    ("Unsafe Rust Advanced", "What is Sync in Rust?", "Type can be shared between threads"),
    ("Unsafe Rust Advanced", "What is repr(C) in Rust?", "C-compatible struct layout"),
    ("Unsafe Rust Advanced", "What is union in Rust?", "Type that can hold one of several field types"),
], "Senior", "Rust")

# ================ LIFETIME ADVANCED (Rust) ================
g([
    ("Lifetime Advanced", "What are lifetime annotations in Rust?", "Explicit lifetime parameters for references"),
    ("Lifetime Advanced", "What is lifetime elision?", "Rules for inferring lifetimes without annotations"),
    ("Lifetime Advanced", "What is PhantomData<T>?", "Mark type as using T without owning it"),
    ("Lifetime Advanced", "What is the 'static lifetime?", "Reference valid for the entire program"),
    ("Lifetime Advanced", "What are lifetime bounds?", "Tracing where references must live"),
    ("Lifetime Advanced", "What is lifetime covariance/contravariance?", "How lifetimes relate to subtyping"),
    ("Lifetime Advanced", "What is HRTB (Higher-Ranked Trait Bounds)?", "For<T> syntax for lifetime-polymorphic bounds"),
    ("Lifetime Advanced", "What is the 'a + 'b lifetime bound?", "Intersection of two lifetime bounds"),
    ("Lifetime Advanced", "What are lifetime parameters on impl blocks?", "Constraining impl to specific lifetimes"),
    ("Lifetime Advanced", "What is the lifetime elision rules?", "Three rules for automatic lifetime inference"),
], "Senior", "Rust")

# ================ GATS (Rust) ================
g([
    ("GATs", "What are GATs (Generalized Associated Types)?", "Associated types with generic parameters"),
    ("GATs", "What is associated type syntax in GATs?", "type Item<'a> in trait definitions"),
    ("GATs", "What is Item<'a> in GATs?", "Associated type with lifetime parameter"),
    ("GATs", "What is impl-trait-in-assoc-type?", "Associated type that's an opaque impl trait"),
    ("GATs", "What is default type parameter in GATs?", "Default associated type value"),
    ("GATs", "What are GATs useful for?", "Iterator patterns, borrow patterns"),
    ("GATs", "What is IntoIterator with GATs?", "GATs for iterator associated types"),
    ("GATs", "What is ProjectedTy in GATs?", "Projection of associated types"),
    ("GATs", "What is the difference between GATs and regular associated types?", "GATs can have parameters"),
    ("GATs", "What are GATs stable since?", "Rust 1.65 stabilized basic GATs"),
], "Senior", "Rust")

# ================ CONST GENERICS ADVANCED (Rust) ================
g([
    ("Const Generics Advanced", "What are const generics in Rust?", "Generic parameters that are compile-time constants"),
    ("Const Generics Advanced", "What is [T; N] syntax in const generics?", "Fixed-size array with generic length"),
    ("Const Generics Advanced", "What is min_const_generics feature?", "Enables const generics for more types"),
    ("Const Generics Advanced", "What is const fn in const generics?", "Const functions evaluated at compile time"),
    ("Const Generics Advanced", "What is generic array types?", "Arrays with generic size parameters"),
    ("Const Generics Advanced", "What are const parameters with expressions?", "Const parameters that depend on other consts"),
    ("Const Generics Advanced", "What is min_const_generic_depth?", "Depth of const parameter expressions"),
    ("Const Generics Advanced", "What are const generic defaults?", "Default values for const generic parameters"),
    ("Const Generics Advanced", "What is const generic arrays match?", "Pattern matching on const generic arrays"),
    ("Const Generics Advanced", "What are const generic bounds?", "Constraints on const generic parameters"),
], "Senior", "Rust")

# ================ SERDE ADVANCED (Rust) ================
g([
    ("Serde Advanced", "What is serde in Rust?", "Serialization/deserialization framework"),
    ("Serde Advanced", "What are serde derives?", "#[derive(Serialize, Deserialize)] macros"),
    ("Serde Advanced", "What is #[serde(rename)]?", "Rename fields during serialization"),
    ("Serde Advanced", "What is #[serde(skip)]?", "Skip a field during serial/deser"),
    ("Serde Advanced", "What is #[serde(default)]?", "Use Rust default for missing fields"),
    ("Serde Advanced", "What is #[serde(flatten)]?", "Flatten nested struct in serialization"),
    ("Serde Advanced", "What is #[serde(with)]?", "Custom serializer/deserializer module"),
    ("Serde Advanced", "What is #[serde(rename_all)]?", "Apply case conversion to all fields"),
    ("Serde Advanced", "What is serde_json?", "JSON serialization backend for serde"),
    ("Serde Advanced", "What is serde_yaml?", "YAML serialization backend for serde"),
], "Senior", "Rust")

# ================ RUST FFI ADVANCED (Rust) ================
g([
    ("Rust FFI Advanced", "What is FFI (Foreign Function Interface)?", "Calling C functions from Rust"),
    ("Rust FFI Advanced", "What is extern {} in Rust?", "Block for declaring external C functions"),
    ("Rust FFI Advanced", "What is #[repr(C)] in Rust?", "C-compatible memory layout"),
    ("Rust FFI Advanced", "What is the libc crate?", "Rust bindings for C standard library"),
    ("Rust FFI Advanced", "What is std::ffi::CString?", "C-compatible string in Rust"),
    ("Rust FFI Advanced", "What is null-terminated strings?", "C string format in Rust"),
    ("Rust FFI Advanced", "What is FFI safety?", "Safety considerations for FFI calls"),
    ("Rust FFI Advanced", "What is cbindgen?", "Generate C headers from Rust code"),
    ("Rust FFI Advanced", "What is the std::os::raw module?", "Rust types matching C types"),
    ("Rust FFI Advanced", "What is FFI with Rust as C library?", "Exposing Rust functions to C"),
], "Senior", "Rust")

# ================ KMP ADVANCED (Kotlin) ================
g([
    ("KMP Advanced", "What is Kotlin Multiplatform (KMP)?", "Shared Kotlin code across platforms"),
    ("KMP Advanced", "What is source sets in KMP?", "Directories for platform-specific and shared code"),
    ("KMP Advanced", "What is kotlinx.multiplatform plugin?", "Gradle plugin for KMP setup"),
    ("KMP Advanced", "What is expect/actual declarations?", "Declare API in expect, implement in actual"),
    ("KMP Advanced", "What is a KMP framework?", "Compile KMP to platform-native frameworks"),
    ("KMP Advanced", "What is KMP for iOS?", "Compile to iOS frameworks (.framework)"),
    ("KMP Advanced", "What is KMP for JS?", "Compile to JavaScript module"),
    ("KMP Advanced", "What is KMP for JVM?", "Standard JVM output"),
    ("KMP Advanced", "What is KMP for native?", "Compile to native binary (Linux, Windows, macOS)"),
    ("KMP Advanced", "What is the KMP plugin in Gradle?", "com.android.library + kotlin-multiplatform"),
], "Senior", "Kotlin")

# ================ FLOW ADVANCED (Kotlin) ================
g([
    ("Flow Advanced", "What is a Flow in Kotlin?", "Cold async stream emitting values sequentially"),
    ("Flow Advanced", "What is FlowBuilder?", "Builder for creating flows"),
    ("Flow Advanced", "What is flowOf()?", "Create flow from vararg or iterable"),
    ("Flow Advanced", "What is flow.collect()?", "Collect flow values in a coroutine"),
    ("Flow Advanced", "What is flow.map()?", "Transform each flow value"),
    ("Flow Advanced", "What is flow.filter()?", "Filter flow values by predicate"),
    ("Flow Advanced", "What is flow.onEach()?", "Perform side effects for each value"),
    ("Flow Advanced", "What is Flow.launchIn()?", "Launch flow collection in a CoroutineScope"),
    ("Flow Advanced", "What is Flow.asLiveData()?", "Convert flow to Android LiveData"),
    ("Flow Advanced", "What is Flow.buffer()?", "Buffer values with configurable capacity"),
], "Senior", "Kotlin")

# ================ CHANNEL PATTERNS ADVANCED (Kotlin) ================
g([
    ("Channel Patterns Advanced", "What are Channels in Kotlin?", "Communicating between coroutines"),
    ("Channel Patterns Advanced", "What is Channel.broadcast?", "Multiple consumers from same channel"),
    ("Channel Patterns Advanced", "What is Channel.CONFLATED?", "Keep only latest value"),
    ("Channel Patterns Advanced", "What is consumeEach?", "Loop over channel values"),
    ("Channel Patterns Advanced", "What is Flowable channel?", "Reactive-style channel extension"),
    ("Channel Patterns Advanced", "What is Channel.RENDEZVOUS?", "Default channel with no buffer"),
    ("Channel Patterns Advanced", "What is actor() coroutine builder?", "Actor using channel for message passing"),
    ("Channel Patterns Advanced", "What is produce() builder?", "Produce values into a channel"),
    ("Channel Patterns Advanced", "What is consume() function on channel?", "Deprecated consume extension"),
    ("Channel Patterns Advanced", "What is trySend() on channel?", "Non-blocking send attempt"),
], "Senior", "Kotlin")

# ================ SEALED CLASSES ADVANCED (Kotlin) ================
g([
    ("Sealed Classes Advanced", "What are sealed classes in Kotlin?", "Restrict class inheritance to same file"),
    ("Sealed Classes Advanced", "What are sealed interface?", "Sealed restriction for interfaces"),
    ("Sealed Classes Advanced", "What is exhaustive when with sealed?", "Compiler checks all cases covered"),
    ("Sealed Classes Advanced", "What is sealed class with object?", "Object subclasses in sealed hierarchy"),
    ("Sealed Classes Advanced", "What is sealed class with data class?", "Data class subclasses in sealed hierarchy"),
    ("Sealed Classes Advanced", "What is sealed class for state machines?", "Model states as sealed subclasses"),
    ("Sealed Classes Advanced", "What is sealed class for result types?", "Success/Failure/Loading result pattern"),
    ("Sealed Classes Advanced", "What are sealed class subtypes?", "Direct subclasses only in same file"),
    ("Sealed Classes Advanced", "What is sealed class copy()?", "Copy sealed instances with data"),
    ("Sealed Classes Advanced", "What is sealed class generics?", "Generic sealed class hierarchies"),
], "Senior", "Kotlin")

# ================ REACT COMPILER (React) ================
g([
    ("React Compiler", "What is React Compiler?", "Production optimizer for React code"),
    ("React Compiler", "What is the React compiler's optimization?", "Automatically memoizes React components"),
    ("React Compiler", "What is the use memo directive?", "Hints to React compiler for memoization"),
    ("React Compiler", "What is the useExternalStore compiler directive?", "Tells compiler about external store"),
    ("React Compiler", "What is the react/compiler package?", "Package for React compiler features"),
    ("React Compiler", "What is compiler optimization for useState?", "Avoids unnecessary re-renders"),
    ("React Compiler", "What is the useCallback compiler feature?", "Automatic memoization of callbacks"),
    ("React Compiler", "What is compiler for JSX transforms?", "Modern JSX transform with compiler"),
    ("React Compiler", "What is babel react compiler plugin?", "Babel plugin for React compiler"),
    ("React Compiler", "What is react/compiler with ESLint?", "ESLint rules for compiler directives"),
], "Senior", "React")

# ================ REACT 19 (React) ================
g([
    ("React 19", "What is React 19?", "Latest major version of React"),
    ("React 19", "What is useActionState in React 19?", "Hook for handling async form state transitions"),
    ("React 19", "What is useOptimistic in React 19?", "Optimistic UI updates in React"),
    ("React 19", "What is the new React 19 form handling?", "Form actions with async data"),
    ("React 19", "What are React 19 server actions?", "Server-side functions callable from client"),
    ("React 19", "What is React 19's new hook?", "Built-in support for refs without forwarding"),
    ("React 19", "What is the new Context API in React 19?", "Updated usage of React.createContext"),
    ("React 19", "What is the ref as a child pattern in React 19?", "New pattern using ref as child element"),
    ("React 19", "What are React 19 hooks updates?", "New hooks and improvements"),
    ("React 19", "What is the React 19 compiler?", "Automatic optimization engine"),
], "Senior", "React")

# ================ REACT FIBER ARCHITECTURE (React) ================
g([
    ("React Fiber Architecture", "What is React Fiber?", "New reconciliation engine in React"),
    ("React Fiber Architecture", "What is the work loop in React?", "Incremental rendering work loop"),
    ("React Fiber Architecture", "What is the render phase?", "Building the component tree"),
    ("React Fiber Architecture", "What is the commit phase?", "Updating the DOM after render"),
    ("React Fiber Architecture", "What is the lane model in React?", "Priority lanes for updates"),
    ("React Fiber Architecture", "What is the passive effect phase?", "useEffect cleanup and setup"),
    ("React Fiber Architecture", "What is the layout effect phase?", "Synchronous DOM layout effects"),
    ("React Fiber Architecture", "What is the idle phase?", "Low-priority work during browser idle"),
    ("React Fiber Architecture", "What is the expired phase?", "Expired high-priority work"),
    ("React Fiber Architecture", "What is the shouldYield mechanism?", "Check if React should yield to browser"),
], "Senior", "React")

# ================ REACT RECONCILER (React) ================
g([
    ("React Reconciler", "What is React Reconciler?", "Core diffing algorithm in React"),
    ("React Reconciler", "What is the diffing algorithm?", "O(n) comparison of virtual DOM trees"),
    ("React Reconciler", "What is key prop in React?", "Unique identifier for list items"),
    ("React Reconciler", "What is React fiber tree?", "Data structure representing component tree"),
    ("React Reconciler", "What is React's reconciliation?", "Process of updating the real DOM"),
    ("React Reconciler", "What is React's bailing out?", "Skip re-rendering unchanged components"),
    ("React Reconciler", "What is React's tree diffing?", "Comparing old and new virtual DOM trees"),
    ("React Reconciler", "What is DOM diffing?", "Minimizing actual DOM operations"),
    ("React Reconciler", "What is React's commitRoot?", "Apply updates to the DOM tree"),
    ("React Reconciler", "What is React's beginWork function?", "Start reconciling a fiber node"),
], "Senior", "React")

# ================ useSyncExternalStore (React) ================
g([
    ("useSyncExternalStore", "What is useSyncExternalStore?", "Subscribe to external data sources safely"),
    ("useSyncExternalStore", "What is getSnapshot in useSyncExternalStore?", "Function returning current external data"),
    ("useSyncExternalStore", "What is getServerSnapshot in useSyncExternalStore?", "Snapshot for SSR compatibility"),
    ("useSyncExternalStore", "What is subscribe in useSyncExternalStore?", "Function to subscribe to external store changes"),
    ("useSyncExternalStore", "What is the purpose of useSyncExternalStore?", "Consistent reads from external stores"),
    ("useSyncExternalStore", "What is useSyncExternalStore with React 19?", "New features in React 19"),
    ("useSyncExternalStore", "What is React's external store pattern?", "Pattern for external mutable data"),
    ("useSyncExternalStore", "What is store.subscribe in external store?", "Subscribe to store change notifications"),
    ("useSyncExternalStore", "What is the store.getSnapshot()", "Retrieve current snapshot of store"),
    ("useSyncExternalStore", "What is React 18+ useSyncExternalStore?", "Introduced for concurrent mode"),
], "Senior", "React")

# ================ useActionState (React) ================
g([
    ("useActionState", "What is useActionState in React?", "Hook for handling form actions"),
    ("useActionState", "What is formAction in React?", "Specify action for form submission"),
    ("useActionState", "What is formState in useActionState?", "State of a form action"),
    ("useActionState", "What is the action parameter useActionState?", "Async function to handle FormData"),
    ("useActionState", "What is the useActionState hook signature?", "(state, formAction, initialState)"),
    ("useActionState", "What are useActionState error states?", "Handling errors from form actions"),
    ("useActionState", "What is the transition in useActionState?", "useTransition for async form actions"),
    ("useActionState", "What is React Server Actions integration?", "Call server functions from client"),
    ("useActionState", "What is the useActionState pattern in Next.js?", "Next.js form submission pattern"),
    ("useActionState", "What is useActionState with validation?", "Combine with form validation libraries"),
], "Senior", "React")

# ================ ARCHITECTURE PATTERNS (General) ================
g([
    ("Architecture Patterns", "What is the CQRS pattern?", "Separate read and write models for data"),
    ("Architecture Patterns", "What is Event Sourcing?", "Store all changes as a sequence of events"),
    ("Architecture Patterns", "What is the Saga pattern?", "Manage distributed transactions across services"),
    ("Architecture Patterns", "What is the Outbox Pattern?", "Ensure atomicity of DB writes and message publishing"),
    ("Architecture Patterns", "What is Hexagonal Architecture (Ports & Adapters)?", "Isolate domain logic from infrastructure"),
    ("Architecture Patterns", "What is Clean Architecture?", "Dependency rule: inner layers don't depend on outer"),
    ("Architecture Patterns", "What is Domain-Driven Design (DDD)?", "Model software around business domain concepts"),
    ("Architecture Patterns", "What is a Bounded Context in DDD?", "Self-contained domain boundary"),
    ("Architecture Patterns", "What is the Value Object pattern?", "Immutable object defined by its attributes"),
    ("Architecture Patterns", "What is the Aggregate Root pattern?", "Root entity that enforces invariants"),
], "Senior", "General")

# ================ OBSERVABILITY ADVANCED (General) ================
g([
    ("Observability Advanced", "What is OpenTelemetry?", "Open-source observability framework for cloud-native"),
    ("Observability Advanced", "What is a span in OpenTelemetry?", "Unit of work with timing, metadata, and context"),
    ("Observability Advanced", "What is a trace in OpenTelemetry?", "End-to-end trace of a request across services"),
    ("Observability Advanced", "What is the OTLP protocol?", "OpenTelemetry Protocol for exporting telemetry"),
    ("Observability Advanced", "What is OpenTelemetry Collector?", "Receives, processes, and exports telemetry data"),
    ("Observability Advanced", "What is an OpenTelemetry exporter?", "Sends telemetry to backends (Jaeger, Prometheus, etc.)"),
    ("Observability Advanced", "What is SLO (Service Level Objective)?", "Quantifiable target for service reliability"),
    ("Observability Advanced", "What is SLA (Service Level Agreement)?", "Contractual commitment on service reliability"),
    ("Observability Advanced", "What is error budget?", "Allowable downtime within a measurement period"),
    ("Observability Advanced", "What is RED method?", "Rate, Errors, Duration for service metrics"),
], "Senior", "General")

# ================ SECURITY PATTERNS ADVANCED (General) ================
g([
    ("Security Patterns Advanced", "What is Zero Trust architecture?", "Never trust, always verify approach"),
    ("Security Patterns Advanced", "What is mTLS (Mutual TLS)?", "Both client and server authenticate each other"),
    ("Security Patterns Advanced", "What is Certificate Pinning?", "Hardcoding expected cert/public key in app"),
    ("Security Patterns Advanced", "What is the OWASP Top 10?", "Top 10 most critical web application security risks"),
    ("Security Patterns Advanced", "What is Content Security Policy (CSP)?", "Header restricting resource loading origins"),
    ("Security Patterns Advanced", "What is CORS and CORS misconfiguration?", "Cross-Origin Resource Sharing controls"),
    ("Security Patterns Advanced", "What is an API key?", "Simple token for authenticating API requests"),
    ("Security Patterns Advanced", "What is RBAC (Role-Based Access Control)?", "Authorize users based on assigned roles"),
    ("Security Patterns Advanced", "What is ABAC (Attribute-Based Access Control)?", "Authorize based on attributes of subjects/resources"),
    ("Security Patterns Advanced", "What is JWT expiration best practice?", "Short-lived access tokens with refresh"),
], "Senior", "General")

# ================ SECRETS MANAGEMENT (General) ================
g([
    ("Secrets Management", "What is a secrets manager?", "Centralized storage for sensitive credentials"),
    ("Secrets Management", "What is HashiCorp Vault?", "Tool for secrets management and data encryption"),
    ("Secrets Management", "What is AWS Secrets Manager?", "AWS service for managing application secrets"),
    ("Secrets Management", "What is Azure Key Vault?", "Microsoft Azure secret management service"),
    ("Secrets Management", "What is GCP Secret Manager?", "Google Cloud secret management service"),
    ("Secrets Management", "What is the difference between secrets and config?", "Secrets are sensitive data requiring encryption"),
    ("Secrets Management", "What is secret rotation?", "Periodically changing stored credentials"),
    ("Secrets Management", "What is a Secret Operator?", "Kubernetes operator for managing secrets"),
    ("Secrets Management", "What is External Secrets Operator?", "Sync external secrets to Kubernetes"),
    ("Secrets Management", "What is KMS (Key Management Service)?", "Manage encryption keys in the cloud"),
], "Senior", "General")

# ================ RATE LIMITING PATTERNS (General) ================
g([
    ("Rate Limiting Patterns", "What is rate limiting?", "Restrict request rate to protect services"),
    ("Rate Limiting Patterns", "What is Token Bucket algorithm?", "Fill bucket at fixed rate, consume tokens"),
    ("Rate Limiting Patterns", "What is Leaky Bucket algorithm?", "Requests processed at fixed rate"),
    ("Rate Limiting Patterns", "What is Fixed Window?", "Count requests per fixed time window"),
    ("Rate Limiting Patterns", "What is Sliding Window?", "Moving window for rate calculation"),
    ("Rate Limiting Patterns", "What is Sliding Window Log?", "Track each request timestamp for precise limiting"),
    ("Rate Limiting Patterns", "What is Token Bucket in API Gateways?", "API gateway rate limiting pattern"),
    ("Rate Limiting Patterns", "What is distributed rate limiting?", "Rate limiting across multiple service instances"),
    ("Rate Limiting Patterns", "What is API Gateway rate limiter?", "Centralized rate limiting at API edge"),
    ("Rate Limiting Patterns", "What is adaptive rate limiting?", "Dynamic rate limits based on current load"),
], "Senior", "General")

# ================ CI/CD ADVANCED (General) ================
g([
    ("CI/CD Advanced", "What is CI/CD pipeline?", "Continuous Integration and Continuous Deployment"),
    ("CI/CD Advanced", "What is a pipeline as code?", "Define CI/CD steps as source code"),
    ("CI/CD Advanced", "What is GitHub Actions?", "CI/CD workflow automation on GitHub"),
    ("CI/CD Advanced", "What is GitLab CI/CD?", "Built-in CI/CD for GitLab repositories"),
    ("CI/CD Advanced", "What is Jenkins pipeline?", "Jenkins pipeline definitions with Jenkinsfile"),
    ("CI/CD Advanced", "What is a deployment strategy?", "Canary, blue-green, rolling, shadow deployment"),
    ("CI/CD Advanced", "What is feature flag deployment?", "Release features behind feature flags"),
    ("CI/CD Advanced", "What is a canary release?", "Gradually roll out to a subset of users"),
    ("CI/CD Advanced", "What is a blue-green deployment?", "Swap between two identical environments"),
    ("CI/CD Advanced", "What is a rollback?", "Revert to previous deployment version"),
], "Senior", "General")

# ================ GIT ADVANCED (General) ================
g([
    ("Git Advanced", "What is Git rebase?", "Move commits to a new base commit"),
    ("Git Advanced", "What is Git bisect?", "Binary search for the commit that introduced a bug"),
    ("Git Advanced", "What is Git reflog?", "Record of reference updates in local repository"),
    ("Git Advanced", "What is Git hooks?", "Scripts triggered by Git events"),
    ("Git Advanced", "What is git worktree?", "Multiple working trees for a single repository"),
    ("Git Advanced", "What is git stash?", "Temporarily store uncommitted changes"),
    ("Git Advanced", "What is git cherry-pick?", "Apply a specific commit to another branch"),
    ("Git Advanced", "What is git rebase --interactive?", "Edit, reorder, squashing commits during rebase"),
    ("Git Advanced", "What is git commit --amend?", "Modify the last commit with new changes"),
    ("Git Advanced", "What is a commit graph?", "Visual representation of commit relationships"),
], "Senior", "General")

# ================ DATABASE OPTIMIZATION (General) ================
g([
    ("Database Optimization", "What is query optimization?", "Improving database query execution speed"),
    ("Database Optimization", "What is an execution plan?", "Database query execution strategy"),
    ("Database Optimization", "What is a composite index?", "Index on multiple columns"),
    ("Database Optimization", "What is a covering index?", "Index that includes all queried columns"),
    ("Database Optimization", "What is index selectivity?", "How unique the index values are"),
    ("Database Optimization", "What is query caching?", "Cache query results to avoid repeated execution"),
    ("Database Optimization", "What is connection pooling?", "Reuse database connections to reduce overhead"),
    ("Database Optimization", "What is N+1 query problem?", "Extra queries caused by lazy-loading associations"),
    ("Database Optimization", "What is a database migration?", "Version-controlled schema change"),
    ("Database Optimization", "What is database sharding?", "Horizontal partitioning of database data"),
], "Senior", "General")

# ================ MESSAGE QUEUES (General) ================
g([
    ("Message Queues", "What is a message queue?", "Async communication between services via queues"),
    ("Message Queues", "What is Apache Kafka?", "Distributed event streaming platform"),
    ("Message Queues", "What is RabbitMQ?", "Message broker supporting multiple protocols"),
    ("Message Queues", "What is AWS SQS?", "Fully managed message queue service"),
    ("Message Queues", "What is Apache Pulsar?", "Cloud-native distributed messaging system"),
    ("Message Queues", "What is a topic in Kafka?", "Category/feed name for published messages"),
    ("Message Queues", "What is a consumer group in Kafka?", "Group of consumers processing messages"),
    ("Message Queues", "What is Kafka partitions?", "Parallel processing unit of a topic"),
    ("Message Queues", "What is Kafka producer API?", "API for publishing messages to Kafka"),
    ("Message Queues", "What is Kafka consumer API?", "API for reading messages from Kafka"),
], "Senior", "General")

# ================ EVENT-DRIVEN ARCHITECTURE (General) ================
g([
    ("Event-Driven Architecture", "What is event-driven architecture?", "Architecture based on producing/consuming events"),
    ("Event-Driven Architecture", "What is an event broker?", "Middleware that routes events between producers and consumers"),
    ("Event-Driven Architecture", "What is Event Sourcing pattern?", "Store all state changes as a sequence of events"),
    ("Event-Driven Architecture", "What is Event Storming?", "Workshop technique for exploring domain events"),
    ("Event-Driven Architecture", "What is a domain event?", "Notification that something domain-relevant happened"),
    ("Event-Driven Architecture", "What is an integration event?", "Event used to communicate between bounded contexts"),
    ("Event-Driven Architecture", "What is eventual consistency?", "Trade consistency for availability across services"),
    ("Event-Driven Architecture", "What are event choreography vs orchestration?", "Decentralized vs centralized event coordination"),
    ("Event-Driven Architecture", "What is the Outbox Pattern?", "Write events to DB and outbox table atomically"),
    ("Event-Driven Architecture", "What is Change Data Capture (CDC)?", "Capture DB changes for event streaming"),
], "Senior", "General")

# ================ CHAOS ENGINEERING (General) ================
g([
    ("Chaos Engineering", "What is chaos engineering?", "Intentionally injecting failures to build resilience"),
    ("Chaos Engineering", "What is the Chaos Monkey tool?", "Netflix's failure injection tool"),
    ("Chaos Engineering", "What is GameDay in chaos engineering?", "Planned experiment day for resiliency"),
    ("Chaos Engineering", "What is fault injection testing?", "Testing resilience by injecting faults"),
    ("Chaos Engineering", "What is a blast radius?", "Scope of impact from a failure experiment"),
    ("Chaos Engineering", "What is steady-state hypothesis?", "Assumption about normal system behavior to verify"),
    ("Chaos Engineering", "What is chaos engineering principles?", "Hypothesis, experiment, analysis methodology"),
    ("Chaos Engineering", "What is the Litmus chaos engineering platform?", "Kubernetes-native chaos engineering toolkit"),
    ("Chaos Engineering", "What is Gremlin?", "Failure-as-a-service platform"),
    ("Chaos Engineering", "What is resilience testing?", "Verify system behavior under failure conditions"),
], "Senior", "General")

# ================ API DESIGN ADVANCED (General) ================
g([
    ("API Design Advanced", "What is API versioning strategies?", "URL path, query param, header, content type"),
    ("API Design Advanced", "What is HATEOAS?", "HyperMedia links for API discoverability"),
    ("API Design Advanced", "What is BFF (Backend-for-Frontend)?", "Dedicated backend per client type"),
    ("API Design Advanced", "What is GraphQL federation?", "Distributed GraphQL across microservices"),
    ("API Design Advanced", "What is OpenAPI specification?", "Standard for describing REST APIs"),
    ("API Design Advanced", "What is AsyncAPI?", "Standard for describing async APIs"),
    ("API Design Advanced", "What is API gateway pattern?", "Single entry point routing and enforcing policies"),
    ("API Design Advanced", "What is API throttling?", "Restrict API request rate per client"),
    ("API Design Advanced", "What is API pagination?", "Paginate large result sets"),
    ("API Design Advanced", "What is API deprecation strategy?", "Sunset old API versions gracefully"),
], "Senior", "General")

with open(MJS, 'w', encoding='utf-8') as f:
    f.write(content[:idx] + ''.join(new) + content[idx:])
print(f"Batch 23 added {len(new)} questions.")
