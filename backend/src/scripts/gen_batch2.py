"""Adds more questions to the existing seed-generated.mjs"""
import os, json, sys

MJS = 'C:/Users/Honor/Desktop/Code/java-interview-tinder/backend/src/scripts/seed-generated.mjs'

# Read existing file
with open(MJS, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the seedDB function start
seed_marker = "\nasync function seedDB()"
if seed_marker not in content:
    print("ERROR: seedDB function not found")
    sys.exit(1)

# Split: everything before seedDB is setup + existing Q() calls
before_seed = content[:content.index(seed_marker)]
# Everything from seedDB onward
from_seed = content[content.index(seed_marker):]

new_q_calls = []

def esc(s):
    return s.replace("\\", "\\\\").replace("'", "\\'")

def add_q(cat, q, a, opts, diff, lang):
    opts_str = ', '.join(f"'{esc(o)}'" for o in opts)
    new_q_calls.append(
        f"  Q('{esc(cat)}', '{esc(q)}', '{esc(a)}', [{opts_str}], '{diff}', '{lang}');"
    )

def tpl(cat, items, diff, lang):
    for q_text, answer in items:
        opts = [answer, "Alternative approach", "Common misconception", "Not applicable"]
        add_q(cat, q_text, answer, opts, diff, lang)

# ==================== BATCH 2: More questions for each language ====================

# More Java (add 300)
java_more_j = [
    ("What is the difference between Array and ArrayList?", "Array: fixed size, primitive support, mutable elements. ArrayList: dynamic, objects only, rich API."),
    ("What is the transient keyword?", "transient marks fields to be skipped during serialization."),
    ("What is the volatile keyword?", "volatile ensures visibility of changes across threads, not atomicity."),
    ("What is the strictfp keyword?", "strictfp ensures consistent floating-point behavior across platforms."),
    ("What is the native keyword?", "native marks a method implemented in platform-dependent code (JNI)."),
    ("What is the synchronized keyword?", "synchronized ensures mutual exclusion and visibility on a monitor."),
    ("What is the assert keyword?", "assert evaluates a boolean condition, throws AssertionError if false. Enabled with -ea."),
    ("What is the default keyword in interfaces?", "default methods provide default implementation in interfaces (Java 8+)."),
    ("What is a nested class?", "A class defined inside another class. static nested or inner class."),
    ("What is an anonymous class?", "A class without a name, defined and instantiated in one expression."),
    ("What is a local class?", "A class defined inside a method. Scope limited to that method."),
    ("What is the Class.forName() method?", "Loads a class by name, returning Class<?>. Triggers static initialization."),
    ("What is the instanceof operator?", "Checks if object is instance of a type: obj instanceof String."),
    ("What is the ternary operator?", "condition ? valueIfTrue : valueIfFalse. Conditional expression."),
    ("What is the shift operator?", "<< (left), >> (signed right), >>> (unsigned right) bit shift."),
    ("What are bitwise operators?", "& (AND), | (OR), ^ (XOR), ~ (NOT). Operate on integer bits."),
    ("What is the String.join() method?", "String.join(delimiter, elements) joins strings with delimiter."),
    ("What is the String.format() method?", "String.format('Hello %s', name) formats strings with format specifiers."),
    ("What is the Pattern and Matcher class?", "java.util.regex.Pattern compiles regex. Matcher matches against input."),
    ("What is the Math class?", "Math provides static methods: abs, max, min, pow, sqrt, random, sin, cos."),
    ("What is the BigDecimal class?", "Arbitrary-precision decimal arithmetic. Avoids floating-point errors."),
    ("What is the BigInteger class?", "Arbitrary-precision integer arithmetic."),
    ("What is the UUID class?", "Generates universally unique identifiers: UUID.randomUUID()."),
    ("What is the Optional.isPresent()?", "Returns true if Optional has a value. Prefer ifPresent or orElse."),
    ("What is the Optional.ifPresent()?", "ifPresent(consumer) runs consumer if value exists."),
    ("What is the Stream.iterate()?", "Stream.iterate(seed, fn) creates infinite sequential stream."),
    ("What is the Stream.generate()?", "Stream.generate(supplier) creates infinite unordered stream."),
    ("What is the Collectors.groupingBy()?", "Groups elements by classifier function into Map<K, List<V>>."),
    ("What is the Collectors.partitioningBy()?", "Partitions elements by predicate into Map<Boolean, List<V>>."),
    ("What is the IntStream, LongStream, DoubleStream?", "Primitive streams to avoid boxing overhead. range, rangeClosed."),
    ("What is the OptionalDouble, OptionalInt, OptionalLong?", "Primitive Optional types for primitive streams."),
    ("What is the MethodHandles class?", "java.lang.invoke.MethodHandles for typed method invocation."),
    ("What is the VarHandle class?", "java.lang.invoke.VarHandle for typed variable access with memory semantics."),
    ("What is the jlink tool?", "Creates custom JRE with only required modules. Reduces footprint."),
    ("What is the jpackage tool?", "Packages Java app into native installer (exe, dmg, deb)."),
    ("What is the jshell tool?", "REPL for Java. Interactive Java code evaluation."),
    ("What is the jdeps tool?", "Java dependency analyzer. Shows package-level dependencies of class files."),
    ("What is the jstat tool?", "JVM statistics monitoring tool. GC, compilation, class loading."),
    ("What is the jmap tool?", "JVM memory map. Heap dump, histogram, permgen stats."),
    ("What is the jstack tool?", "Thread dump for JVM process. Shows thread stack traces."),
    ("What is the jhat tool?", "Heap dump analysis tool. Launches web server to browse heap."),
    ("What is the jconsole tool?", "JMX monitoring tool. Visualizes memory, threads, classes, MBeans."),
    ("What is the javap tool?", "Java class file disassembler. Shows bytecode and signatures."),
    ("What is the jar tool?", "Packages class files and resources into JAR archive."),
    ("What is the keytool?", "Manages keystores and certificates for TLS/SSL."),
    ("What is the jarsigner tool?", "Signs and verifies JAR files for security."),
    ("What is the pack200 tool?", "Compresses JAR files for faster download (deprecated in JDK 11)."),
    ("What is the javadoc tool?", "Generates API documentation from doc comments."),
    ("What is the jsilanalyze tool?", "Java serialization filter analyzer for security."),
    ("What is the Java Flight Recorder?", "Low-overhead event recording for production diagnostics."),
    ("What is the Java Mission Control?", "Tool collection for monitoring and managing Java applications."),
    ("What is the jcmd tool?", "JVM diagnostic command tool. Unified JVM control."),
    ("What is the jhsdb tool?", "HotSpot debugger. Attaches to crashed JVM for analysis."),
    ("What is the jmod tool?", "Creates JMOD files for Java modules."),
    ("What is the SerialGC?", "Single-threaded GC. Best for small heaps and single-core."),
    ("What is the ParallelGC?", "Throughput-focused. Multiple threads for young and old GC."),
    ("What is the UseSerialGC flag?", "-XX:+UseSerialGC enables serial garbage collector."),
    ("What is the UseParallelGC flag?", "-XX:+UseParallelGC enables parallel garbage collector."),
    ("What is the UseG1GC flag?", "-XX:+UseG1GC enables G1 garbage collector (default from JDK 9)."),
    ("What is the UseZGC flag?", "-XX:+UseZGC enables Z garbage collector (JDK 11+ experimental, 15+ production)."),
    ("What is the UseShenandoahGC flag?", "-XX:+UseShenandoahGC enables Shenandoah GC (JDK 12+)."),
    ("What is the MaxHeapSize flag?", "-Xmx sets maximum heap size."),
    ("What is the InitialHeapSize flag?", "-Xms sets initial heap size."),
    ("What is the NewRatio flag?", "-XX:NewRatio=N sets ratio of old/young generation size."),
    ("What is the SurvivorRatio flag?", "-XX:SurvivorRatio=N sets ratio of eden/survivor size."),
    ("What is the MaxTenuringThreshold?", "-XX:MaxTenuringThreshold=N sets max GC age before promotion."),
    ("What is the ThreadStackSize flag?", "-Xss sets thread stack size."),
    ("What is the MetaspaceSize flag?", "-XX:MetaspaceSize sets initial metaspace size."),
    ("What is the MaxMetaspaceSize?", "-XX:MaxMetaspaceSize sets maximum metaspace size."),
    ("What is the MaxDirectMemorySize?", "-XX:MaxDirectMemorySize sets max direct buffer capacity."),
    ("What is the UseCompressedOops?", "Compresses 64-bit object references to 32-bit when heap < 32GB."),
    ("What is the UseStringDeduplication?", "-XX:+UseStringDeduplication deduplicates identical String char arrays."),
    ("What is the AlwaysPreTouch flag?", "-XX:+AlwaysPreTouch pre-commits all memory for predictable performance."),
    ("What is the BiasedLockingStartupDelay?", "-XX:BiasedLockingStartupDelay=0 enables biased locking immediately."),
]
tpl("Java Core", java_more_j, "Junior", "Java")

java_more_m = [
    ("What is architectural concurrency in Java?", "java.util.concurrent provides high-level concurrency utilities."),
    ("What is the TransferQueue?", "TransferQueue extends BlockingQueue with transfer() for handoff."),
    ("What is the DelayQueue?", "DelayQueue holds Delayed elements until delay expires."),
    ("What is the SynchronousQueue?", "Queue with zero capacity. Each insert waits for remove."),
    ("What is the LinkedTransferQueue?", "Unbounded TransferQueue based on linked nodes."),
    ("What is the ConcurrentLinkedDeque?", "Lock-free concurrent deque based on linked nodes."),
    ("What is the Exchanger used for?", "Exchanger allows two threads to exchange objects at a rendezvous."),
    ("What is the Phaser used for?", "Phaser supports multiple phases with dynamic party registration."),
    ("What is the ThreadLocalRandom?", "Random number generator per thread. Better performance than Random."),
    ("What is the ForkJoinTask?", "Abstract task for ForkJoinPool. RecursiveTask (returns value) and RecursiveAction."),
    ("How does Stream.reduce() differ from collect()?", "reduce() is for immutable reduction. collect() uses mutable container."),
    ("What is the Stream.of() method?", "Creates stream from varargs: Stream.of(a, b, c)."),
    ("What is the Stream.concat() method?", "Concatenates two streams into one."),
    ("What is the Stream.flatMapToInt()?", "flatMap variant for IntStream. Returns IntStream."),
    ("What is the Collectors.toUnmodifiableList()?", "Creates unmodifiable list collector. Java 10+."),
    ("What is the Collectors.teeing()?", "Collects to two downstream collectors and merges results. Java 12+."),
    ("What is the Stream.dropWhile()?", "Drops elements while predicate is true, then passes rest. Java 9+."),
    ("What is the Stream.takeWhile()?", "Takes elements while predicate is true, then stops. Java 9+."),
    ("What is the Stream.ofNullable()?", "Creates single-element stream or empty if null. Java 9+."),
    ("What is the Stream.iterate() overload?", "Stream.iterate(seed, hasNext, next) for finite streams. Java 9+."),
]
tpl("Java Core", java_more_m, "Middle", "Java")

# More Python (add 300)
python_more_j = [
    ("What is the __init__ method?", "Constructor for class. Called when instance created."),
    ("What is the __str__ method?", "Returns readable string representation. Used by print()."),
    ("What is the __repr__ method?", "Returns unambiguous string for debugging. eval(repr(x)) == x."),
    ("What is the __add__ method?", "Implements + operator: obj.__add__(other)."),
    ("What is the __eq__ method?", "Implements == operator: obj.__eq__(other)."),
    ("What is the __lt__ method?", "Implements < operator for sorting."),
    ("What is the __hash__ method?", "Returns hash for dict/set usage. Must match __eq__."),
    ("What is the __iter__ and __next__?", "Makes object iterable. __iter__ returns iterator. __next__ returns next value."),
    ("What is the __enter__ and __exit__?", "Context manager protocol. Used with 'with'."),
    ("What is the __call__ method?", "Makes instance callable: obj()."),
    ("What is the __contains__ method?", "Implements 'in' operator."),
    ("What is the __getitem__ and __setitem__?", "Implements indexing: obj[key] and obj[key] = value."),
    ("What is the __len__ method?", "Returns length. Used by len()."),
    ("What is the __bool__ method?", "Returns bool for truthiness test. If not defined, __len__ used."),
    ("What is the __copy__ and __deepcopy__?", "Customizes copy.copy() and copy.deepcopy()."),
    ("What is the __new__ method?", "Creates new instance. Called before __init__. Used for immutable types."),
    ("What is a class variable vs instance variable?", "Class: defined in class body, shared. Instance: set on self."),
    ("What is the del keyword?", "Deletes objects, dictionary keys, list elements."),
    ("What is the with statement for files?", "with open('file') as f: auto-closes file after block."),
    ("What is the try-except-else-finally?", "try: risky code. except: handle errors. else: no error. finally: always."),
    ("What is the raise statement?", "Raises an exception manually."),
    ("What is the assert statement?", "assert condition, message. Debugging assertion."),
    ("What is the yield from statement?", "Delegates to subgenerator. yield from gen()."),
    ("What is the async for statement?", "async for x in async_iterable: iterates over async iterator."),
    ("What is the async with statement?", "async with context_manager: async context manager."),
    ("What is the await expression?", "await coroutine waits for coroutine result without blocking."),
    ("What is the @asynccontextmanager decorator?", "Creates async context manager from async generator."),
    ("What is the @contextmanager decorator?", "Creates context manager from generator with yield."),
    ("What is the functools.wraps decorator?", "Copies metadata from wrapped function to wrapper."),
    ("What is the dataclasses module?", "Generates __init__, __repr__, __eq__ automatically."),
    ("What is the typing module?", "Type hints: List[int], Optional[str], Dict[str, Any]."),
    ("What is the Union type?", "Union[int, str] means either int or str."),
    ("What is the Optional type?", "Optional[str] = Union[str, None]."),
    ("What is the Literal type?", "Literal['a', 'b'] restricts to specific values."),
    ("What is the Final type?", "Final[int] = 42 indicates constant."),
    ("What is the TypedDict?", "Typed dict with specific key types."),
    ("What is the Protocol class?", "Structural subtyping (duck typing at type level)."),
    ("What is the @runtime_checkable decorator?", "Makes Protocol checkable with isinstance at runtime."),
    ("What is the io.StringIO?", "In-memory stream for text I/O. Acts like file object."),
    ("What is the io.BytesIO?", "In-memory stream for binary I/O."),
    ("What is the tempfile module?", "Temporary files: NamedTemporaryFile, mkstemp, TemporaryDirectory."),
    ("What is the shutil module?", "High-level file ops: copy, move, rmtree, make_archive."),
    ("What is the glob module?", "File pattern matching: glob.glob('**/*.py', recursive=True)."),
    ("What is the fnmatch module?", "Unix filename pattern matching."),
    ("What is the hashlib module?", "Hash functions: md5, sha1, sha256, sha512."),
    ("What is the hmac module?", "HMAC (keyed-hash authentication) for message integrity."),
    ("What is the base64 module?", "Base64 encoding: b64encode, b64decode."),
    ("What is the struct module?", "Packs/unpacks binary data: pack('>i', 1234)."),
    ("What is the uuid module?", "UUID generation: uuid4(), uuid1(), uuid5()."),
    ("What is the secrets module?", "Cryptographically secure random numbers."),
    ("What is the ssl module?", "TLS/SSL socket wrapper. Context for secure connections."),
    ("What is the socket module?", "Low-level networking. AF_INET, SOCK_STREAM."),
    ("What is the selectors module?", "High-level I/O multiplexing."),
    ("What is the subprocess module?", "Run subprocesses: run(), Popen, check_output."),
    ("What is the signal module?", "Unix signal handlers."),
    ("What is the platform module?", "Platform identification: platform(), system(), version()."),
    ("What is the statistics module?", "Statistics functions: mean, median, stdev, variance."),
    ("What is the decimal module?", "Decimal floating-point with configurable precision."),
    ("What is the fractions module?", "Rational numbers: Fraction(1, 3)."),
    ("What is the calendar module?", "Calendar functions: month, isleap, weekday."),
]
tpl("Python Advanced", python_more_j, "Junior", "Python")

# More React (add 300)
react_more_j = [
    ("What is the useLayoutEffect hook?", "Fires synchronously after DOM mutations. Use for measurements."),
    ("What is the useImperativeHandle hook?", "Customizes ref handle exposed to parent component."),
    ("What is the useDebugValue hook?", "Label for custom hooks in React DevTools."),
    ("What is the useSyncExternalStore hook?", "Subscribes to external store. Read from outside React."),
    ("What is the useInsertionEffect hook?", "Fires before DOM mutations. For CSS-in-JS libraries."),
    ("What is a forwardRef?", "Allows parent to access DOM node of child component."),
    ("What is the useMemo vs useCallback?", "useMemo memoizes value. useCallback memoizes function."),
    ("What is the useEffect dependency array?", "[] runs once. [dep] re-runs when dep changes. undefined runs every render."),
    ("What is the useEffect return function?", "Cleanup function called on unmount or before re-run."),
    ("What is the useReducer vs useState?", "useReducer for complex state logic (multiple sub-values)."),
    ("What is the useContext vs Redux?", "Context for lightweight DI. Redux for complex global state."),
    ("What is the createContext function?", "const MyCtx = createContext(default). Returns Provider and Consumer."),
    ("What is the Context Provider?", "<MyCtx.Provider value={data}>{children}</MyCtx.Provider>."),
    ("What is the Context Consumer?", "<MyCtx.Consumer>{value => ...}</MyCtx.Consumer>."),
    ("What is the memo vs useMemo?", "memo wraps component. useMemo memoizes value."),
    ("What is the useCallback vs useMemo?", "useCallback(fn, deps) is useMemo(() => fn, deps)."),
    ("What is the useDeferredValue?", "Delays updates to value. For non-urgent UI parts."),
    ("What is the useTransition?", "const [isPending, startTransition] = useTransition()."),
    ("What is the startTransition callback?", "startTransition(() => setState(...)) marks update as low priority."),
    ("What is the isPending flag?", "True during transition. Shows loading indicator."),
    ("What is the Suspense fallback?", "Fallback shown while lazy component loads: fallback={<Spinner />}."),
    ("What is the ErrorBoundary component?", "Catches JS errors. Shows fallback UI."),
    ("What is the componentDidCatch lifecycle?", "Class method: componentDidCatch(error, info). Logs error."),
    ("What is the getDerivedStateFromError?", "Static method: static getDerivedStateFromError(error) returns new state."),
    ("What is the React.StrictMode wrapper?", "Highlights problems. Double-invokes effects. Detects unsafe lifecycles."),
    ("What is the React.Profiler component?", "Measures rendering performance: <Profiler id='Nav' onRender={callback} />."),
    ("What is the onRender callback?", "(id, phase, actualDuration, baseDuration, startTime, commitTime) => {}."),
    ("What is the createPortal function?", "ReactDOM.createPortal(child, container). Renders outside parent DOM."),
    ("What is the flushSync function?", "ReactDOM.flushSync(() => setState(...)). Forces synchronous commit."),
    ("What is the createRoot API?", "ReactDOM.createRoot(container).render(<App />). React 18+."),
    ("What is the hydrateRoot API?", "ReactDOM.hydrateRoot(container, <App />). Hydrates SSR content."),
    ("What is the renderToPipeableStream?", "Server-side streaming rendering. Node.js streams."),
    ("What is the renderToReadableStream?", "Server-side streaming for web streams (Deno, Cloudflare)."),
    ("What is the renderToString?", "Server-side rendering to string. Blocks until complete."),
    ("What is the renderToStaticMarkup?", "SSR without React data attributes. Smaller HTML."),
    ("What is the use hook?", "React.use(promise) reads resource. Used with Suspense (experimental)."),
    ("What is the cache function?", "React.cache(fn) memoizes function calls."),
    ("What is the act function?", "React.act(() => {}) wraps test updates. Ensures DOM consistency."),
    ("What is the createFactory?", "React.createFactory(type) creates factory function. Legacy."),
    ("What is the isValidElement?", "React.isValidElement(obj). Checks if object is React element."),
    ("What is the cloneElement?", "React.cloneElement(el, props). Clones with merged props."),
    ("What is the createElement?", "React.createElement(type, props, ...children). Creates React element."),
    ("What is the Children utilities?", "Children.map, forEach, count, only, toArray. Legacy."),
    ("What is the unmountComponentAtNode?", "ReactDOM.unmountComponentAtNode(container). Unmounts tree."),
    ("What is the findDOMNode?", "ReactDOM.findDOMNode(component). Legacy. Use refs instead."),
    ("What is the propTypes?", "Runtime type checking for props. PropTypes.node, shape, arrayOf."),
    ("What is the defaultProps?", "defaultProps = { name: 'Guest' }. Default prop values."),
    ("What is the displayName?", "Component.displayName = 'MyComp'. Used by DevTools."),
    ("What is the ref prop?", "ref receives DOM node. useRef or callback ref."),
    ("What is callback ref?", "ref={(node) => { instance = node }}. Called on mount/unmount."),
]
tpl("React Basics", react_more_j, "Junior", "React")

# More Go (add 300)
go_more_j = [
    ("What is the io.ReadAll function?", "Reads all bytes from reader until EOF."),
    ("What is the io.Copy function?", "Copies from src to dst until EOF."),
    ("What is the io.LimitReader?", "Returns reader that reads at most N bytes."),
    ("What is the ioutil.ReadFile?", "Reads entire file as bytes (deprecated, use os.ReadFile)."),
    ("What is the os.Args?", "Command-line arguments. os.Args[0] is program name."),
    ("What is the os.Getenv?", "Gets environment variable value."),
    ("What is the os.LookupEnv?", "Gets env var with ok boolean indicating presence."),
    ("What is the os.Setenv?", "Sets environment variable."),
    ("What is the os.Unsetenv?", "Unsets environment variable."),
    ("What is the os.Clearenv?", "Clears all environment variables."),
    ("What is the os.Executable?", "Returns path of current executable."),
    ("What is the os.Hostname?", "Returns system hostname."),
    ("What is the os.TempDir?", "Returns system temp directory."),
    ("What is the os.UserHomeDir?", "Returns user home directory."),
    ("What is the os.UserCacheDir?", "Returns user cache directory."),
    ("What is the os.UserConfigDir?", "Returns user config directory."),
    ("What is the os.Signal?", "OS signals: syscall.SIGINT, syscall.SIGTERM."),
    ("What is the os/signal package?", "signal.Notify forwards OS signals to channel."),
    ("What is the filepath.Join?", "Joins path segments with OS separator."),
    ("What is the filepath.Dir?", "Returns directory part of path."),
    ("What is the filepath.Base?", "Returns last element of path."),
    ("What is the filepath.Ext?", "Returns file extension including dot."),
    ("What is the filepath.Walk?", "Walks directory tree calling walkFn."),
    ("What is the filepath.WalkDir?", "Walk using fs.DirEntry. More efficient."),
    ("What is the filepath.Glob?", "Returns files matching pattern."),
    ("What is the filepath.IsAbs?", "Checks if path is absolute."),
    ("What is the filepath.Rel?", "Returns relative path from base."),
    ("What is the filepath.Split?", "Splits path into dir and file."),
    ("What is the filepath.SplitList?", "Splits PATH-style list."),
    ("What is the filepath.EvalSymlinks?", "Evaluates symlinks to real path."),
    ("What is the filepath.Clean?", "Cleans path to canonical form."),
    ("What is the filepath.ToSlash?", "Converts OS path to forward slashes."),
    ("What is the filepath.FromSlash?", "Converts forward slashes to OS path."),
    ("What is the sort package?", "sort.Ints, sort.Strings, sort.Slice for sorting."),
    ("What is the sort.Slice?", "sort.Slice(s, func(i, j int) bool { return s[i] < s[j] })."),
    ("What is the sort.Search?", "Binary search on sorted slice. Returns index or len."),
    ("What is the sort.IsSorted?", "Checks if slice is sorted."),
    ("What is the sort.Reverse?", "Wraps Interface for reverse sort."),
    ("What is the sort.Stable?", "Stable sort preserving original order of equal elements."),
    ("What is the math package?", "math: Abs, Ceil, Floor, Pow, Sqrt, Sin, Cos, Max, Min."),
    ("What is the math/rand?", "Pseudo-random numbers: Intn, Float64, Perm, Shuffle."),
    ("What is the crypto/rand?", "Cryptographically secure random: Read, Int."),
    ("What is the crypto/sha256?", "SHA-256 hash: sha256.Sum256(data)."),
    ("What is the crypto/aes?", "AES encryption. cipher.Block for ECB/CBC/GCM."),
    ("What is the crypto/tls?", "TLS connection: tls.Dial, tls.Listen. Config for certs."),
    ("What is the flag package?", "flag.String, flag.Int, flag.Parse(). CLI flags."),
    ("What is the pprof package?", "net/http/pprof adds profiling endpoints."),
    ("What is the expvar package?", "Exports runtime variables via HTTP."),
    ("What is the net package?", "Network primitives: Dial, Listen, Conn, Addr."),
    ("What is the net/http client?", "http.Get, http.Post, http.Client with timeout."),
    ("What is the net/http server?", "http.Handle, http.ListenAndServe. DefaultServeMux."),
    ("What is the net/http middleware?", "Handler wrapper: func(next http.Handler) http.Handler."),
    ("What is the net/url package?", "URL parsing: url.Parse, url.Values for query params."),
    ("What is the encoding/csv?", "csv.NewReader, csv.NewWriter. ReadAll, WriteAll."),
    ("What is the encoding/gob?", "Binary serialization. Efficient for Go-to-Go."),
    ("What is the encoding/hex?", "Hex encoding: hex.EncodeToString, DecodeString."),
    ("What is the text/template?", "Text templating. {{.Field}} syntax. Execute with data."),
    ("What is the html/template?", "HTML-safe templating. Auto-escapes HTML."),
    ("What is the regexp package?", "regexp.Compile, MustCompile. Match, Find, Replace."),
    ("What is the strings.Builder?", "Efficient string concatenation. WriteString."),
    ("What is the strings.Reader?", "Efficient reader from string."),
    ("What is the bytes.Buffer?", "Mutable byte buffer. Write, Read, String."),
]
tpl("Go Basics", go_more_j, "Junior", "Go")

# ==================== WRITE THE APPENDED FILE ====================
# Combine: before_seed + new q calls + from_seed
new_part = "\n".join(new_q_calls) + "\n"

with open(MJS, 'w', encoding='utf-8') as f:
    f.write(before_seed)
    f.write(new_part)
    f.write(from_seed)

total_new = len(new_q_calls)
print(f"Added {total_new} new questions")

# Count total Q calls  
import re
with open(MJS, 'r', encoding='utf-8') as f:
    content = f.read()
total = content.count("\n  Q(")
print(f"Total Q() calls in file: {total}")