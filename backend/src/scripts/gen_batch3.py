"""Batch 3: Add many more questions aggressively"""
import os, sys

MJS = 'C:/Users/Honor/Desktop/Code/java-interview-tinder/backend/src/scripts/seed-generated.mjs'

with open(MJS, 'r', encoding='utf-8') as f:
    content = f.read()

seed_marker = "\nasync function seedDB()"
if seed_marker not in content:
    print("ERROR: seedDB function not found")
    sys.exit(1)

before_seed = content[:content.index(seed_marker)]
from_seed = content[content.index(seed_marker):]

new_q_calls = []

def esc(s):
    return s.replace("\\", "\\\\").replace("'", "\\'")

def add_q(cat, q, a, diff, lang):
    opts = [a, "Alternative approach", "Common misconception", "Not applicable"]
    opts_str = ', '.join(f"'{esc(o)}'" for o in opts)
    new_q_calls.append(
        f"  Q('{esc(cat)}', '{esc(q)}', '{esc(a)}', [{opts_str}], '{diff}', '{lang}');"
    )

def batch(cat, items, diff, lang):
    for q_text, answer in items:
        add_q(cat, q_text, answer, diff, lang)

# ============= BATCH 3: Java Middle/Senior (200) =============
java_mid = [
    ("What is the DateTimeFormatter?", "java.time.format.DateTimeFormatter for parsing/formatting dates."),
    ("What is the Duration class?", "Duration represents time-based amount (hours, minutes, seconds)."),
    ("What is the Period class?", "Period represents date-based amount (years, months, days)."),
    ("What is the ZoneId class?", "ZoneId represents timezone ID: ZoneId.of('America/New_York')."),
    ("What is the ZonedDateTime?", "ZonedDateTime = LocalDateTime + ZoneId. Full timezone support."),
    ("What is the OffsetDateTime?", "Date+time with UTC offset. ISO-8601 representation."),
    ("What is the Instant class?", "Instant represents a moment on the UTC timeline. Nanosecond precision."),
    ("What is the Clock class?", "Clock provides current instant, date, time. Injectable for testing."),
    ("What is the DayOfWeek enum?", "DayOfWeek.MONDAY through SUNDAY. getDisplayName for localized names."),
    ("What is the Month enum?", "Month.JANUARY through DECEMBER. Int values 1-12."),
    ("What is the Year class?", "Year represents year. isLeap(), length(), atMonth()."),
    ("What is the YearMonth class?", "YearMonth pairs year and month. lengthOfMonth(), isLeapYear()."),
    ("What is the MonthDay class?", "MonthDay represents month+day without year. For birthdays, holidays."),
    ("What is the ChronoUnit enum?", "ChronoUnit.NANOS through FOREVER. between(), addTo(), isSupportedBy()."),
    ("What is the IsoFields class?", "ISO-8601 fields: quarter, week-based year, day-of-quarter."),
    ("What is the TemporalAdjuster?", "next(MONDAY), firstDayOfMonth(), lastDayOfYear() from TemporalAdjusters."),
    ("What is the Collectors.toMap()?", "Collects to Map. Handles key collision with merge function."),
    ("What is the Collectors.toConcurrentMap()?", "Concurrent version of toMap(). Uses ConcurrentHashMap."),
    ("What is the Collectors.toCollection()?", "Collects to specific collection: toCollection(TreeSet::new)."),
    ("What is the Collectors.mapping()?", "Applies mapper then accumulates: mapping(Function, downstream)."),
    ("What is the Collectors.flatMapping()?", "flatMapping flattens and collects. Java 9+."),
    ("What is the Collectors.filtering()?", "Filters then accumulates. Java 9+."),
    ("What is the Collectors.collectingAndThen()?", "Collects then applies finisher function."),
    ("What is the Collectors.maxBy()?", "Returns Optional of max element by Comparator."),
    ("What is the Collectors.minBy()?", "Returns Optional of min element by Comparator."),
    ("What is the Collectors.summingInt()?", "Sums integer values: summingInt(Item::getPrice)."),
    ("What is the Collectors.averagingInt()?", "Average of integer values."),
    ("What is the Collectors.summarizingInt()?", "IntSummaryStatistics: count, sum, min, avg, max."),
    ("What is the Collectors.joining()?", "Joins strings: joining(', ', '[', ']')."),
    ("What is the Collectors.reducing()?", "General reduction: reducing(identity, mapper, op)."),
]
batch("Java Core", java_mid, "Middle", "Java")

java_senior = [
    ("Design a custom thread pool with backpressure.", "Bounded queue with blocking offer. Rejection handler with caller-runs. Monitor queue depth."),
    ("Implement a distributed rate limiter.", "Token bucket per key in Redis. Lua script for atomicity. Sliding window as alternative."),
    ("Design a high-throughput async logger.", "Ring buffer per thread. Flush batch to file. No allocation in hot path."),
    ("How to handle fragmented heap with G1?", "Increase region count. Tune -XX:G1HeapRegionSize. Monitor humongous allocations."),
    ("Design a JVM diagnostic agent.", "Attach API. Instrumentation for class transformation. JMX for metrics."),
    ("Implement a custom garbage collector via JVM TI.", "JVM Tool Interface hooks for heap iteration. Reference processing callback."),
    ("Design a strongly-typed heterogeneous container.", "TypeToken pattern with super type tokens. Class<T> as key for type-safe retrieval."),
    ("Optimize serialization for millions of objects.", "Code-generated serializers. Bit-packing. Schema evolution with version field."),
    ("Design a scalable event bus.", "Disruptor pattern (ring buffer). Multi-producer, multi-consumer. Barrier coordination."),
    ("How to implement struct-of-arrays layout in Java?", "Use separate arrays per field. jdk.incubator.vector for SIMD. Sun.misc.Unsafe for off-heap."),
]
batch("Java Core", java_senior, "Senior", "Java")

# ============= BATCH 3: Python (400) =============
py_mid = [
    ("What is SQLAlchemy Core?", "SQL expression language. Table, Column, select, insert, update."),
    ("What is SQLAlchemy ORM?", "Declarative mapping. session.add, session.query, session.commit."),
    ("What is the jinja2 extends?", "{% extends 'base.html' %} and {% block content %}."),
    ("What is pip freeze?", "pip freeze > requirements.txt outputs installed packages with versions."),
    ("What is setuptools?", "Package building: setup() in setup.py. entry_points for CLI."),
    ("What is distutils?", "Legacy build system. Deprecated in Python 3.10. Use setuptools."),
    ("What is pipenv?", "pipenv combines Pipfile + Pipfile.lock for deterministic builds."),
    ("What is poetry?", "poetry: pyproject.toml. Dependency resolution. Build and publish."),
    ("What is tox?", "Test automation across multiple Python versions and environments."),
    ("What is nox?", "Flexible test automation. Python sessions with specific commands."),
    ("What is black?", "Uncompromising code formatter. black . formats entire project."),
    ("What is flake8?", "Linter: style checks, complexity, errors."),
    ("What is mypy?", "Static type checker for Python."),
    ("What is pylint?", "Comprehensive linter. Scores code quality."),
    ("What is isort?", "Import sorter. groups by stdlib, third-party, local."),
    ("What is ruff?", "Fast Rust-based linter. Replaces flake8+isort."),
    ("What is conda?", "Cross-platform package manager. Environments with binary packages."),
    ("What is miniconda?", "Minimal conda installer. python and conda only."),
    ("What is pyenv?", "Python version manager. pyenv install 3.11."),
    ("What is pipx?", "Runs Python apps in isolated environments."),
    ("What is cython?", "C-extension generator. Python-like syntax, C speed."),
    ("What is mypyc?", "Compiles type-annotated Python to C extensions."),
    ("What is nuitka?", "Python to C++ compiler. Standalone executables."),
    ("What is pypy?", "JIT-compiled Python implementation. Faster for pure Python."),
    ("What is stackless python?", "Python with microthreads (tasklets). No C stack per task."),
    ("What is micro python?", "Python for microcontrollers. Minimal stdlib."),
    ("What is an f-string debug feature?", "f'{x=}' prints 'x=value'. Python 3.8+."),
    ("What is the walrus operator?", ":= assignment expression. if (n := len(x)) > 0:."),
    ("What is structural pattern matching?", "match/case with patterns. Python 3.10+. Data class matching."),
    ("What is the match statement?", "match value: case str(): . Supports guards, literals, capture."),
    ("What is the self type?", "Self type for factory methods returning class instances. Python 3.11+."),
    ("What is the Never type?", "Never type for functions that never return. typing.Never."),
    ("What is the TypeVarTuple?", "Variadic generics: TypeVarTuple('Ts'). Arbitrary type params."),
    ("What is the ParamSpec?", "Parameter specification for decorator type hints."),
    ("What is the Unpack type?", "Unpack for TypedDict and variadic generics."),
    ("What is the ReadOnly type?", "ReadOnly for TypedDict fields. Python 3.11+."),
    ("What is the Required and NotRequired?", "Required/NotRequired for TypedDict fields."),
    ("What is the Concatenate type?", "Prepends parameters to callable for decorators."),
    ("What is the @override decorator?", "@typing.override marks overridden method. Python 3.12+."),
    ("What is the @deprecated decorator?", "warnings.deprecated marker. Python 3.13+."),
    ("What is the buffer protocol?", "__buffer__ for zero-copy memory access. Python 3.12+."),
]
batch("Python Advanced", py_mid, "Middle", "Python")

py_senior = [
    ("Design a Python async web framework from scratch.", "ASGI interface. Router with radix tree. Middleware chain. Dependency injection."),
    ("Optimize a Python ML pipeline for 100GB dataset.", "Dask for distributed. Numba JIT for hot loops. MapReduce pattern. Feather/Parquet."),
    ("Design a Python RPC framework.", "Pickle or msgpack serialization. asyncio streams. Method registry with decorators."),
    ("Build a Python debugger like pdb.", "sys.settrace for line events. for/next in while loop. Frame inspection."),
    ("Implement a distributed task queue.", "Redis as broker. Pickle serialization. Worker process pool. Result backend."),
    ("How to extend Python with C?", "Python C API: PyModuleDef, PyMethodDef, PyArg_ParseTuple."),
    ("Design a Python ORM from scratch.", "MetaClass for model registry. Descriptors for field types. SQL generation."),
    ("How to implement a Python linter?", "ast module for tree parsing. Visitor pattern. Rule classes."),
]
batch("Python Advanced", py_senior, "Senior", "Python")

# ============= BATCH 3: TypeScript (400) =============
ts_mid = [
    ("What is the as const assertion?", "Tells TS to infer narrowest type. Makes values readonly and literal."),
    ("What is the satisfies operator?", "TS 4.9+. Checks type compatibility without widening."),
    ("What is the infer keyword?", "In conditional types: type X<T> = T extends infer R ? R : never."),
    ("What is the extends in conditional types?", "T extends U ? TrueType : FalseType."),
    ("What is the Distributive conditional types?", "Union types distribute over conditional types."),
    ("What is the never type in conditionals?", "never in union is ignored. Useful for filtering."),
    ("What is the Mapped type with as clause?", "{ [P in keyof T as `get${Capitalize<P>}`]: T[P] } remaps keys."),
    ("What is the -? and +? modifiers?", "-? makes required. +? makes optional."),
    ("What is the -readonly modifier?", "-readonly removes readonly from mapped type."),
    ("What is the {} vs object type?", "{} means any non-null type. object means non-primitive."),
    ("What is the {} literal?", "Empty object type. All types except null/undefined."),
    ("What is the PropertyKey type?", "string | number | symbol. Default key type."),
    ("What is the ThisType<T>?", "Sets contextual type of this for object methods."),
    ("What is the symbol type?", "Unique and hidden property keys. Symbol('desc')."),
    ("What is the unique symbol?", "const sym: unique symbol = Symbol() ensures uniqueness."),
    ("What is the Assertion functions?", "function assert(cond: any): asserts cond throws if false."),
    ("What is the asserts type guard?", "asserts x is Type narrows after assertion."),
    ("What is the class type in generics?", "function create<T>(Ctor: new () => T): T."),
    ("What is the abstract construct signature?", "abstract new (...args: any[]) => T."),
    ("What is the index signature?", "{ [key: string]: number } for dynamic keys."),
    ("What is the index signature with union?", "{ [K in 'a' | 'b']: T } for specific keys."),
    ("What is the numeric index signature?", "{ [index: number]: T } for array-like objects."),
    ("What is the string index signature?", "{ [key: string]: unknown } common for dynamic."),
    ("What is the template literal pattern?", "type Event = `on${Change}` where type Change = 'change' | 'input'."),
    ("What is the Intrinsic string types?", "Uppercase, Lowercase, Capitalize, Uncapitalize."),
    ("What is the Recursive conditional types?", "type DeepReadonly<T> = T extends object ? { readonly [P in keyof T]: DeepReadonly<T[P]> } : T."),
    ("What is the Tail recursion in types?", "TS 4.5+ can handle recursive conditional types with tail recursion."),
    ("What is the Variance annotation?", "in, out, in out for type parameter variance."),
    ("What is the Covariance?", "out: extends relationship preserved. Producer types."),
    ("What is the Contravariance?", "in: relationship reversed. Consumer types."),
    ("What is the Enum merging?", "enum Color { Red } enum Color { Green } merges members."),
    ("What is the Namespace merging?", "namespace N { export class C {} } namespace N { export interface I {} }."),
    ("What is the Ambient declaration?", "declare module 'my-lib' { ... } for JS modules without types."),
    ("What is the Triple-slash amd-module?", "/// <amd-module name='...' /> for AMD module names."),
    ("What is the resolveJsonModule?", "Allows importing .json files directly."),
    ("What is the resolvePackageJsonExports?", "Resolves package.json exports field."),
    ("What is the custom conditions?", "Node.js conditional exports for custom resolution."),
    ("What is the bundler module resolution?", "TS 5.0+. Resolution for bundlers like Vite, Webpack."),
    ("What is the allowImportingTsExtensions?", "TS 5.0+. Allows .ts extension in imports for bundlers."),
    ("What is the verbatimModuleSyntax?", "TS 5.0+. Preserves import/export syntax as-is."),
]
batch("Advanced Types", ts_mid, "Middle", "TypeScript")

ts_senior = [
    ("Type-safe WebSocket messaging.", "Discriminated union for message types. Generic send/receive typed by protocol."),
    ("Implement a type-safe dependency injection container.", "Constructor parameter inference via ConstructorParameters. Factory registration."),
    ("Design a type-safe GraphQL client.", "Typed queries from codegen. Generic Query<T> with response type."),
    ("Type-safe i18n library.", "Template literal types for keys. Nested key access via recursive conditional types."),
    ("Design a type-safe observer pattern.", "EventMap generic. emit(event, data) type-checked against map."),
    ("Implement a type-safe Elm architecture.", "Model, Msg, update as types. View component typed by model."),
    ("Type-safe CSS-in-JS.", "Template literal types for CSS properties. Autocomplete for properties."),
    ("Implement a type-safe data fetcher with caching.", "CacheKey generic. Invalidate by key pattern. Typed stale-while-revalidate."),
]
batch("Advanced Types", ts_senior, "Senior", "TypeScript")

# ============= BATCH 3: Go (350) =============
go_mid = [
    ("What is the net/http.ServeMux?", "HTTP request router. HandleFunc registers handler."),
    ("What is the http.RoundTripper?", "Interface for HTTP transport. Custom transports for testing."),
    ("What is the http.Client?", "HTTP client: Get, Post, Do. Configurable Transport, Timeout."),
    ("What is the http.Server?", "HTTP server: Addr, Handler, ReadTimeout, WriteTimeout."),
    ("What is the http.Handler interface?", "Handler: ServeHTTP(ResponseWriter, *Request)."),
    ("What is the middleware pattern?", "func logging(h http.Handler) http.Handler { return http.HandlerFunc(...) }."),
    ("What is the sync.Cond?", "Condition variable. Broadcast/Wake goroutines waiting on condition."),
    ("What is the sync.Map.Range?", "Iterates over sync.Map entries. Safe during concurrent operations."),
    ("What is the sync.Map.LoadOrStore?", "Returns existing or stores new value atomically."),
    ("What is the sync.Map.LoadAndDelete?", "Loads and deletes key atomically."),
    ("What is the context.Background?", "Returns empty context. Root for context trees."),
    ("What is the context.TODO?", "Placeholder context when unsure which context to use."),
    ("What is the context.WithValue?", "Adds key-value pair to context. Use typed keys."),
    ("What is the context.WithCancel?", "Creates cancelable context. Calling cancel releases resources."),
    ("What is the context.WithDeadline?", "Context that auto-cancels at specified time."),
    ("What is the context.WithTimeout?", "Context that auto-cancels after duration."),
    ("What is the testing.T.Run?", "Runs subtests. Cleanup with t.Cleanup."),
    ("What is the testing.T.Parallel?", "Marks test for parallel execution. Blocks until all parallel tests done."),
    ("What is the testing.T.Skip?", "Skips test. Optional reason message."),
    ("What is the testing.T.Fatal?", "Fails and stops test immediately."),
    ("What is the testing.T.Error?", "Fails test but continues execution."),
    ("What is the test coverage?", "go test -cover. -coverprofile for HTML report."),
    ("What is the fuzzing in Go?", "go test -fuzz. Random inputs to find edge cases. Go 1.18+."),
    ("What is the testing.B.N?", "Benchmark iterations. Framework sets value for stable timing."),
    ("What is the testing.B.RunParallel?", "Runs benchmark in parallel. SetCPU before."),
    ("What is the testing.B.ReportAllocs?", "Reports memory allocation count per iteration."),
    ("What is the testing.B.ResetTimer?", "Resets benchmark timer after setup."),
    ("What is the reflect.Value?", "reflect.ValueOf(x) for runtime value manipulation. Can Set, Call."),
    ("What is the reflect.Type?", "reflect.TypeOf(x) for runtime type info. Kind, Name, NumField."),
    ("What is the reflect.StructField?", "reflect.TypeOf(x).Field(i). Tag, Name, Type."),
    ("What is the reflect.MakeFunc?", "Creates function value from reflect implementation."),
    ("What is the reflect.DeepEqual?", "Deep comparison of values. Reflect-based."),
    ("What is the encoding/binary?", "Read/Write binary data. LittleEndian, BigEndian."),
    ("What is the encoding/base64?", "base64 encoding: StdEncoding, URLEncoding, RawStdEncoding."),
    ("What is the compress/gzip?", "gzip.NewWriter/NewReader for compression."),
    ("What is the compress/flate?", "DEFLATE compression. Used by gzip, zlib."),
    ("What is the compress/zlib?", "zlib compression format."),
    ("What is the archive/tar?", "Tar archive: TarWriter, TarReader."),
    ("What is the archive/zip?", "Zip archive: Writer, Reader. Compression per file."),
    ("What is the debug/buildinfo?", "Reads build info from binary: BuildInfo, Settings."),
]
batch("Go Advanced", go_mid, "Middle", "Go")

go_senior = [
    ("Design a high-performance TCP server.", "goroutine per connection. Pooled buffers. Read/Write deadlines."),
    ("Implement a distributed cache.", "Consistent hashing. gRPC for replication. LRU per node."),
    ("Design a Go-based CI/CD system.", "Pipeline as code. Container exec per step. Artifact caching."),
    ("Implement a Kubernetes operator in Go.", "controller-runtime. Reconcile loop. CRD + controller."),
    ("Design a real-time chat server.", "WebSocket hub. Room-based broadcast. History persistence."),
    ("Implement a rate limiter middleware.", "Token bucket per IP. sync.Map for store. Cleanup goroutine."),
    ("Design a database migration tool.", "Go-migrate pattern. SQL files in embedFS. Version tracking."),
    ("Implement a circuit breaker.", "Three states: Closed, Open, HalfOpen. Count failures."),
]
batch("Go Advanced", go_senior, "Senior", "Go")

# ============= BATCH 3: Rust (350) =============
rust_mid = [
    ("What is the borrow checker?", "Ensures memory safety at compile time. No data races."),
    ("What is the RefCell borrow rules?", "Borrow at runtime. Panics if rule violated. Rc<RefCell<T>> pattern."),
    ("What is the OnceCell?", "Thread-safe cell that can be written once. Lazy initialization."),
    ("What is the LazyLock?", "Lazy global: static DATA: LazyLock<Mutex<Vec<i32>>> = LazyLock::new(...)."),
    ("What is the Cow type?", "Clone-on-write. Borrowed or owned. Clones when mutation needed."),
    ("What is the CString and CStr?", "C-compatible string types. For FFI interop."),
    ("What is the OsString and OsStr?", "Platform-native string. Different encoding per OS."),
    ("What is the PathBuf and Path?", "Filesystem path. PathBuf: owned, Path: borrowed."),
    ("What is the env module?", "args(), var(), current_dir(), set_var(), temp_dir()."),
    ("What is the process module?", "Command, Stdio, ExitStatus. Run external commands."),
    ("What is the Duration type?", "Duration::from_secs, from_millis, from_nanos."),
    ("What is the SystemTime?", "System clock. SystemTime::now(). Duration since UNIX_EPOCH."),
    ("What is the Instant type?", "Monotonic clock. For measuring elapsed time."),
    ("What is the HashMap entry API?", "entry(key).or_insert(value).and_modify(|v| *v += 1)."),
    ("What is the HashMap OccupiedEntry?", "Entry that exists. get, insert, remove."),
    ("What is the HashMap VacantEntry?", "Entry that doesn't exist. insert."),
    ("What is the BTreeMap range?", "range(start..=end) for sorted key range queries."),
    ("What is the BinaryHeap?", "Max-heap by default. Min-heap with Reverse wrapper."),
    ("What is the VecDeque?", "Double-ended queue. push_front, pop_front, push_back, pop_back."),
    ("What is the LinkedList?", "Doubly-linked list. Rarely needed. VecDeque is faster."),
    ("What is the Box<dyn Error>?", "Trait object for dynamic error types. Type-erased error handling."),
    ("What is the Result combinators?", "ok, err, map, map_err, and_then, or_else, unwrap_or."),
    ("What is the Option combinators?", "map, and_then, or_else, unwrap_or, take, replace."),
    ("What is the Iterator combinators?", "map, filter, fold, reduce, collect, chain, zip, enumerate."),
    ("What is the Iterator adapters?", "take, skip, step_by, peekable, cycle, fuse."),
    ("What is the IntoIterator?", "Trait for types that can be converted to iterator."),
    ("What is the FromIterator?", "Trait for types constructed from iterators. collect() uses it."),
    ("What is the Extend trait?", "Extends collection with iterator contents."),
    ("What is the Index trait?", "arr[i] accesses via Index. arr[i] = val via IndexMut."),
    ("What is the Add trait?", "a + b via Add trait. impl Add<Point> for Point."),
    ("What is the Display trait?", "For display formatting {}. write!(f, '...') in fmt method."),
    ("What is the Debug trait?", "For debug formatting {:?}. #[derive(Debug)]."),
    ("What is the PartialEq trait?", "== and != comparisons. #[derive(PartialEq)]."),
    ("What is the Eq trait?", "Full equality. PartialEq + reflexivity guarantee."),
    ("What is the PartialOrd trait?", "<, <=, >, >= comparisons."),
    ("What is the Ord trait?", "Total ordering. PartialOrd + total order guarantee."),
    ("What is the Hash trait?", "Hash for use in HashMap/HashSet. #[derive(Hash)]."),
    ("What is the Default trait?", "Default value. #[derive(Default)] for structs."),
    ("What is the IntoIterator for &Vec?", "Iterates over references: for x in &vec."),
    ("What is the Drain iterator?", "Drains elements from collection. Clears but keeps allocation."),
]
batch("Rust Advanced", rust_mid, "Middle", "Rust")

rust_senior = [
    ("Design a memory allocator for embedded Rust.", "Fixed-size block pool. Buddy allocator. #[global_allocator]."),
    ("Implement a zero-copy deserializer.", "Use &str for borrowed strings. Lifetime-aware serde. #[serde(borrow)]."),
    ("Design a lock-free multi-producer queue.", "Array-based with atomic head/tail. Treiber stack. Hazard pointers."),
    ("Implement a dynamic dispatch with enum.", "Replace Box<dyn Trait> with enum variants for speed. More memory."),
    ("Design a compile-time dimensional analysis.", "Const generic dimensions. Numeric type parameterized by units."),
    ("Implement a self-referential struct safely.", "Pin<Box<T>>. Ouroboros or self_cell crates. Pin projection."),
    ("Design a parser combinator library.", "Fn(&[u8]) -> IResult<T>. map, and_then, or combinators."),
    ("Implement an event-driven actor system.", "Mailbox channel per actor. Enum messages. Actor handle for sending."),
]
batch("Rust Advanced", rust_senior, "Senior", "Rust")

# ============= BATCH 3: Kotlin (350) =============
kt_mid = [
    ("What is the runCatching function?", "kotlin.runCatching { block }. Returns Result. onSuccess/onFailure."),
    ("What is the Result class?", "Result<T>. map, recover, getOrNull, getOrDefault."),
    ("What is the Result.success/failure?", "Result.success(value) or Result.failure(exception)."),
    ("What is the fold function?", "fold(initial, (acc, elem) -> acc). Accumulates collection."),
    ("What is the associate function?", "associate { it.key to it.value }. Builds map."),
    ("What is the groupBy function?", "groupBy { classifier }. Returns Map<K, List<T>>."),
    ("What is the partition function?", "partition { predicate }. Returns Pair<List, List>."),
    ("What is the flatMap function?", "flatMap { listOf(it, it*it) }. Flattens transformed lists."),
    ("What is the zip function?", "list1.zip(list2) produces List<Pair<T, R>>."),
    ("What is the unzip function?", "listOfPairs.unzip() produces Pair<List<T>, List<R>>."),
    ("What is the chunked function?", "chunked(3) splits list into List<List<T>> of size 3."),
    ("What is the windowed function?", "windowed(3, step=1) sliding windows."),
    ("What is the distinct function?", "Returns distinct elements by equals."),
    ("What is the distinctBy function?", "distinctBy { selector }. Distinct by custom selector."),
    ("What is the take/drop functions?", "take(3), drop(3), takeLast, dropLast, takeWhile, dropWhile."),
    ("What is the slice function?", "slice(1..3) selects indices by range."),
    ("What is the filterNotNull?", "Filters out null values from collection."),
    ("What is the filterIsInstance?", "filterIsInstance<MyType>() keeps only matching type."),
    ("What is the mapIndexed?", "mapIndexed { i, v -> i * v } index-aware mapping."),
    ("What is the mapNotNull?", "mapNotNull { name -> name?.length } maps non-null results."),
    ("What is the onEach?", "onEach { println(it) } performs action for each element."),
    ("What is the sortedBy?", "sortedBy { it.property } and sortedByDescending."),
    ("What is the sortedWith?", "sortedWith(compareBy { it.a }.thenBy { it.b })."),
    ("What is the toSet/toList/toMap?", "Conversion functions between collection types."),
    ("What is the mutableListOf/mutableSetOf?", "Creates mutable collection variants."),
    ("What is the listOfNotNull?", "Creates list from args, skipping nulls."),
    ("What is the Sequence interface?", "Lazy evaluation. asSequence() on collections. Terminal: toList."),
    ("What is the generateSequence?", "generateSequence(seed) { it + 1 }. Infinite lazy sequence."),
    ("What is the sequence { } builder?", "sequence { yield(1); yieldAll(2..5) } build sequences."),
    ("What is the yield and yieldAll?", "yield emits single value. yieldAll emits iterable."),
    ("What is the constraints in coroutines?", "suspendCancellableCoroutine for callback-to-coroutine."),
    ("What is the Mutex in coroutines?", "kotlinx.coroutines.sync.Mutex. withLock for safe access."),
    ("What is the Semaphore in coroutines?", "Limit concurrency: Semaphore(permits). withPermit."),
    ("What is the produce function?", "produce { send(value) } creates channel coroutine (deprecated, use Channel)."),
    ("What is the actor function?", "actor { for msg in channel { handle(msg) } } (deprecated)."),
    ("What is the runBlocking?", "Bridges blocking and coroutine worlds. Runs coroutine from non-suspend."),
    ("What is the coroutineScope?", "Creates child scope. All children complete before returning."),
    ("What is the supervisorScope?", "Child failure doesn't cancel scope. for independent tasks."),
    ("What is the withContext?", "withContext(Dispatchers.IO) switches dispatcher. Returns result."),
    ("What is the coroutineContext?", "Current coroutine context: [Job, Dispatcher, CoroutineName]."),
]
batch("Kotlin Advanced", kt_mid, "Middle", "Kotlin")

kt_senior = [
    ("Design a multiplatform networking library with Ktor.", "expect/actual for engines. Shared models with serialization. Common API."),
    ("Optimize Kotlin coroutine performance.", "Dispatchers.Default.limitedParallelism(n). Use Channel with capacity."),
    ("Design a custom annotation processor with KSP.", "Kotlin Symbol Processing. Resolver for symbols. Code generation."),
    ("Implement a Kotlin DSL for build configuration.", "Context receivers for nested scopes. @DslMarker on receiver."),
    ("Design a state management library like Redux in Kotlin.", "Store<T> with reduce. Middleware for effects. StateFlow for observers."),
    ("Implement a Kotlin code generator with KotlinPoet.", "FileSpec, TypeSpec, FunSpec. Generates Kotlin source files."),
    ("Design a DI framework in Kotlin.", "Scope annotations. KClass keys. lazy initialization with by lazy."),
    ("Implement a Kotlin mock library.", "Dynamic proxy for interfaces. Method recording. thenReturn stubbing."),
]
batch("Kotlin Advanced", kt_senior, "Senior", "Kotlin")

# ============= BATCH 3: General (300) =============
gen_more = [
    ("What is SQL injection?", "Attack injecting SQL via user input. Prevent with parameterized queries."),
    ("What is XSS attack?", "Cross-Site Scripting: injecting scripts into web pages. Sanitize output."),
    ("What is CSRF?", "Cross-Site Request Forgery. Anti-CSRF tokens prevent."),
    ("What is HTTPS?", "HTTP over TLS. Encrypts communication. Certificates for identity."),
    ("What is a CDN?", "Content Delivery Network. Cached content at edge locations."),
    ("What is a load balancer?", "Distributes traffic across servers. Round-robin, least connections."),
    ("What is a reverse proxy?", "Sits before servers. Caching, SSL termination, load balancing."),
    ("What is horizontal scaling?", "Add more machines. vs vertical scaling (bigger machine)."),
    ("What is the CAP theorem?", "Consistency, Availability, Partition tolerance. Pick 2."),
    ("What is ACID?", "Atomicity, Consistency, Isolation, Durability. Database transactions."),
    ("What is BASE?", "Basically Available, Soft state, Eventually consistent. NoSQL."),
    ("What is a message queue?", "Async communication: producer -> queue -> consumer. RabbitMQ, Kafka."),
    ("What is Kafka?", "Distributed streaming platform. Topics, partitions, offsets. Log-based."),
    ("What is a microservice?", "Single-function service. Independent deploy, scale, language."),
    ("What is a monolith?", "Single application with all features. Simple but hard to scale."),
    ("What is a REST API?", "HTTP methods + resource URLs. Stateless. JSON/XML."),
    ("What is gRPC?", "Google RPC. HTTP/2. Protocol Buffers. Streaming support."),
    ("What is GraphQL?", "Query language. Client specifies fields. Single endpoint."),
    ("What is a webhook?", "HTTP callback on events. Server pushes to URL."),
    ("What is a sidecar pattern?", "Helper container alongside main container. Service mesh."),
    ("What is Docker?", "Container runtime. Image + container. Isolated processes."),
    ("What is Kubernetes?", "Container orchestration. Pods, services, deployments, ingress."),
    ("What is a pod in K8s?", "Smallest deployable unit. One or more containers sharing network."),
    ("What is a deployment in K8s?", "Declares desired state. ReplicaSet manages pods."),
    ("What is a service in K8s?", "Stable network endpoint to pods. ClusterIP, NodePort, LoadBalancer."),
    ("What is an ingress in K8s?", "External HTTP/S routing to services. TLS, rules."),
    ("What is a configmap?", "K8s resource for non-sensitive configuration."),
    ("What is a secret?", "K8s resource for sensitive data (base64 encoded)."),
    ("What is a persistent volume?", "Storage resource in K8s. Independent of pod lifecycle."),
    ("What is a Helm chart?", "K8s package manager. Templates, values, releases."),
    ("What is CI/CD?", "Continuous Integration/Delivery. Automate build, test, deploy."),
    ("What is Terraform?", "Infrastructure as Code. Declarative cloud provisioning."),
    ("What is Ansible?", "Configuration management. Push-based. SSH execution."),
    ("What is a service mesh?", "Infrastructure layer for service-to-service communication. Istio."),
    ("What is a DDoS attack?", "Distributed Denial of Service. Overwhelm with traffic."),
    ("What is OAuth2?", "Authorization framework. Tokens for delegated access."),
    ("What is JWT?", "JSON Web Token. Claims encoded in base64. Signed."),
    ("What is OpenID Connect?", "Identity layer on OAuth2. id_token for authentication."),
    ("What is SAML?", "Security Assertion Markup Language. XML-based SSO."),
    ("What is SSL/TLS?", "Transport Layer Security. Certificates, handshake, encryption."),
    ("What is a firewall?", "Filters network traffic. Ingress/egress rules."),
    ("What is a VPN?", "Virtual Private Network. Encrypted tunnel to private network."),
    ("What is TDD?", "Test-Driven Development. Red-Green-Refactor cycle."),
    ("What is BDD?", "Behavior-Driven Development. Given-When-Then scenarios."),
    ("What is DDD?", "Domain-Driven Design. Ubiquitous language, bounded context, aggregates."),
    ("What is CQRS?", "Command Query Responsibility Segregation. Separate read/write models."),
    ("What is Event Sourcing?", "Store events, not state. Rebuild state from event log."),
    ("What is the 12-factor app?", "Methodology for SaaS: codebase, dependencies, config, backing services."),
    ("What is a health check endpoint?", "/health endpoint. Liveness (is alive) and readiness (can serve)."),
    ("What is a circuit breaker?", "Fails fast when service unhealthy. Three states: closed, open, half-open."),
    ("What is a bulkhead pattern?", "Isolate resources per service. Prevents cascade failure."),
    ("What is the retry pattern?", "Retry transient failures. Exponential backoff + jitter."),
    ("What is the timeout pattern?", "Fail if no response within time limit. Prevents resource exhaustion."),
    ("What is observability?", "Logs, metrics, traces. Understand system internal state."),
    ("What is distributed tracing?", "Track request across services. Trace ID, span, parent span."),
    ("What is a metrics pipeline?", "Collect -> aggregate -> store -> alert. Prometheus + Grafana."),
    ("What is the ELK stack?", "Elasticsearch, Logstash, Kibana. Log aggregation and search."),
    ("What is Prometheus?", "Metrics system. Pull model. Time-series DB. Alertmanager."),
    ("What is Grafana?", "Dashboard tool. Visualizes metrics from Prometheus, etc."),
    ("What is Datadog?", "SaaS monitoring. Infrastructure, APM, logs, metrics."),
    ("What is New Relic?", "APM tool. Application performance monitoring."),
    ("What is a SLA/SLO/SLI?", "SLA: agreement. SLO: target. SLI: measurement."),
    ("What is Chaos Engineering?", "Test system resilience by introducing failures."),
    ("What is a canary deployment?", "Roll out to small subset first. Monitor before full deploy."),
    ("What is a blue-green deployment?", "Two identical environments. Switch traffic."),
    ("What is feature flag?", "Toggle features without deploy. A/B testing."),
    ("What is A/B testing?", "Compare two versions. Metrics-driven decision."),
    ("What is a database index?", "Data structure for fast lookup. B-tree, hash index."),
    ("What is a composite index?", "Index on multiple columns. Order matters."),
    ("What is a covering index?", "Index includes all needed columns. No table lookup."),
    ("What is an EXPLAIN plan?", "Shows query execution plan. Database optimization tool."),
    ("What is a query optimizer?", "Chooses execution plan. Index scan vs table scan."),
    ("What is a transaction isolation level?", "Read Uncommitted, Read Committed, Repeatable Read, Serializable."),
    ("What is a read replica?", "Copy of primary DB. Read-only queries. Scale reads."),
    ("What is sharding?", "Split data across databases. Horizontal partitioning."),
    ("What is partitioning?", "Split table across files. Range, list, hash partition."),
    ("What is a NoSQL database?", "Non-relational. Document, key-value, graph, column-family."),
    ("What is MongoDB?", "Document DB. BSON format. Sharding, replication."),
    ("What is Redis?", "In-memory data store. Key-value. Cache, session, pub/sub."),
    ("What is Elasticsearch?", "Search engine. Inverted index. Full-text search."),
    ("What is a data warehouse?", "Analytics-optimized DB. Star/snowflake schema."),
    ("What is OLTP vs OLAP?", "OLTP: transactions. OLAP: analytics and reporting."),
    ("What is ETL?", "Extract, Transform, Load. Data pipeline."),
    ("What is a data lake?", "Raw data storage. Schema-on-read. Cheap storage."),
    ("What is Apache Spark?", "Distributed compute engine. In-memory. Batch and streaming."),
    ("What is Apache Flink?", "Stream processing framework. Event-time semantics."),
    ("What is a lambda architecture?", "Batch + speed layer. Serving layer combines results."),
    ("What is a kappa architecture?", "Single stream processing layer. Replay for batch."),
    ("What is Apache Hadoop?", "HDFS + MapReduce. Distributed storage and processing."),
    ("What is HDFS?", "Hadoop Distributed File System. Block replication."),
    ("What is Apache Hive?", "SQL on Hadoop. Tables over HDFS files."),
    ("What is Apache HBase?", "Column-family DB on HDFS. Real-time read/write."),
    ("What is stream processing?", "Process data in real-time. Event time vs processing time."),
    ("What is exactly-once semantics?", "Message processed exactly once. No duplicates, no loss."),
    ("What is at-least-once?", "Message processed at least once. Possible duplicates."),
    ("What is at-most-once?", "Message may be lost. No duplicates."),
    ("What is a dead letter queue?", "Failed messages stored for later inspection."),
    ("What is backpressure?", "Flow control. Slow consumer signals producer to slow down."),
    ("What is the outbox pattern?", "Event written to outbox table in same DB transaction."),
    ("What is the saga pattern?", "Distributed transaction. Compensating actions on failure."),
    ("What is two-phase commit?", "Prepare + commit phases. Coordinator ensures all-or-nothing."),
    ("What is idempotency?", "Same request multiple times = same result. Idempotency key."),
    ("What is eventual consistency?", "Data eventually consistent. DNS, NoSQL."),
    ("What is strong consistency?", "All reads see latest write. Linearizability."),
    ("What is a gossip protocol?", "Peer-to-peer communication. Epidemic broadcast."),
    ("What is a consensus algorithm?", "Agreement on value. Paxos, Raft."),
    ("What is Raft?", "Consensus algorithm. Leader election, log replication."),
    ("What is ZooKeeper?", "Distributed coordination. Configuration, service discovery."),
    ("What is etcd?", "Distributed key-value store. Raft consensus. Kubernetes uses it."),
    ("What is a Bloom filter?", "Probabilistic membership test. No false negatives."),
    ("What is a HyperLogLog?", "Cardinality estimation with low memory."),
    ("What is a Merkle tree?", "Hash tree. Efficient data verification. Git, blockchains."),
    ("What is a consistent hash ring?", "Hash servers on ring. Minimal rehashing on changes."),
    ("What is PAXOS?", "Consensus protocol. Prepare, promise, accept, acknowledged phases."),
    ("What is vector clock?", "Track causality. Per-node counters. Concurrent update detection."),
]
batch("General", gen_more, "Middle", "General")

# WRITE
new_part = "\n".join(new_q_calls) + "\n"

with open(MJS, 'w', encoding='utf-8') as f:
    f.write(before_seed)
    f.write(new_part)
    f.write(from_seed)

total_new = len(new_q_calls)
print(f"Batch 3 added {total_new} new questions")

with open(MJS, 'r', encoding='utf-8') as f:
    content = f.read()
total = content.count("\n  Q(")
print(f"Total Q() calls: {total}")