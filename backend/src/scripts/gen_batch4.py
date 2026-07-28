"""Batch 4: Add ~1700 more questions aggressively"""
import os, sys, re

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

def add(cat, q, a, diff, lang):
    opts = [a, "Alternative approach", "Common misconception", "I don't know"]
    opts_str = ', '.join(f"'{esc(o)}'" for o in opts)
    new_q_calls.append(f"  Q('{esc(cat)}', '{esc(q)}', '{esc(a)}', [{opts_str}], '{diff}', '{lang}');")

def b(cat, items, diff, lang):
    for item in items:
        if isinstance(item, tuple):
            q, a = item
        else:
            q, a = item.split("|", 1)
        add(cat, q.strip(), a.strip(), diff, lang)

# ========== JAVA Senior (100) ==========
java_s = [
    "Explain the Disruptor pattern|Ring buffer with sequence barriers. Multi-producer via CAS. Consumer dependencies as graph.",
    "How to implement object pooling with generational awareness?|Two-tier pool: hot (frequently used) and cold. Promote on usage count. Demote on idle timeout.",
    "Design a lock-free stack in Java|Treiber stack: AtomicReference for head. CAS on push/pop. ABA problem via StampedReference.",
    "Implement a non-blocking RingBuffer|AtomicLongArray for sequence. CAS to claim slots. Backoff on contention.",
    "Design a distributed unique ID generator|Snowflake-like: timestamp + worker ID + sequence. ZooKeeper for worker allocation.",
    "How to optimize string processing at scale?|Use byte[] instead of String. Charset encoding. Compress in memory. Flyweight pattern.",
    "Design a custom concurrent hash map|Striped locks (16-64). Volatile reads. Lazy resizing. Tree bins for collisions.",
    "Implement zero-copy networking|FileChannel.transferTo. DirectByteBuffer. sendfile syscall. Avoid copying between kernel/user.",
    "Design a metrics library with minimal overhead|Thread-local counters. PaddedAtomicLong per metric. Periodic flush to central store.",
    "How to avoid garbage in high-frequency trading?|Stack allocation via escape analysis. Object recycling pools. Primitive collections. Off-heap memory.",
    "Design a JVM startup time optimizer|AOT compilation. CDS archives. Application class data sharing. Trim classpath.",
    "Implement a state machine with Java enums|enum State with transition Map<State, Map<Event, State>>. Enter/exit actions.",
    "Design a pluggable caching layer|Cache interface: get, put, invalidate. Decorator: TTL, LRU, metrics. Composite: multi-tier.",
    "How to implement a retry mechanism with circuit breaker?|State enum. Count failures. Open when threshold exceeded. HalfOpen after cooldown.",
    "Design a type-safe query builder|StringBuilder with method chaining. Generic type for entity. Column enums for type safety.",
    "Implement a custom bytecode analyzer|ASM ClassVisitor. MethodVisitor for instruction inspection. Compute stack frames.",
    "Design a rule engine in Java|Rete algorithm. Forward chaining. Working memory. Rule compilation to decision trees.",
    "How to achieve nanosecond precision timing?|System.nanoTime() for elapsed. CLOCK_MONOTONIC. JNI clock_gettime for raw precision.",
    "Design a binary protocol parser|ByteBuffer with relative gets. Varint encoding. Pre-computed offsets. Schema versioning.",
    "Implement a thread-safe counter per core|Striped counters: array of AtomicLongs. Hash thread to slot. Reduce contention.",
]
for item in java_s:
    q, a = item.split("|", 1)
    add("Java Core", q, a, "Senior", "Java")

# ========== Java collections (80) ==========
java_col = [
    "What is a NavigableMap?|SortedMap with navigation methods: lowerKey, floorKey, ceilingKey, higherKey.",
    "What is NavigableSet?|SortedSet with navigation. descendingSet, subSet, headSet, tailSet.",
    "What is ConcurrentSkipListMap?|Skip list based concurrent navigable map. O(log n). Sorted keys.",
    "What is ConcurrentSkipListSet?|Skip list based concurrent navigable set. Sorted.",
    "What is CopyOnWriteArraySet?|Set backed by CopyOnWriteArrayList. Thread-safe. Best for small sets.",
    "What is Arrays.parallelSort?|Parallel sort using ForkJoinPool. For large arrays. O(n log n).",
    "What is Arrays.|parallelPrefix?|Cumulative operation on array in parallel: sum, mul, etc.",
    "What is Collections.newSetFromMap?|Creates Set backed by Map. Useful for ConcurrentHashMap-backed set.",
    "What is Collections.asLifoQueue?|Deque as LIFO queue (stack). Last element returned by remove/poll.",
    "What is Collections.checkedQueue?|Dynamically type-checked queue. Prevents heap pollution.",
    "What is Map.copyOf?|Creates unmodifiable copy of map. Java 10+.",
    "What is List.copyOf?|Creates unmodifiable list copy. Java 10+.",
    "What is Set.copyOf?|Creates unmodifiable set copy. Java 10+.",
    "What is Collectors.toUnmodifiableList?|Unmodifiable list collector. Java 10+.",
    "What is Collectors.toUnmodifiableSet?|Unmodifiable set collector. Java 10+.",
    "What is Collectors.toUnmodifiableMap?|Unmodifiable map collector. Java 10+.",
    "What is the Stack class?|LIFO stack (extends Vector). Legacy. Prefer ArrayDeque.",
    "What is the Vector class?|Synchronized dynamic array. Legacy. Prefer ArrayList or CopyOnWriteArrayList.",
    "What is the Hashtable class?|Synchronized hash table. Legacy. Prefer ConcurrentHashMap.",
    "What is the BitSet class?|Growable bit vector. AND, OR, XOR, set, get, cardinality.",
    "What is the Properties class?|Key-value properties. Load from .properties file. Extends Hashtable.",
    "What is the Dictionary class?|Abstract class for key-value mapping. Legacy. Prefer Map.",
    "What is the Enumeration interface?|Legacy iteration. hasMoreElements, nextElement. Replaced by Iterator.",
    "What is the Queue.poll vs remove?|poll returns null on empty. remove throws NoSuchElementException.",
    "What is the Queue.offer vs add?|offer returns false if full. add throws IllegalStateException.",
    "What is the Deque.addFirst vs push?|Both add at front. push throws on capacity limit; addFirst returns false.",
    "What is the Deque.peekFirst?|Returns first element without removing. null if empty.",
    "What is the Deque.pollLast?|Retrieves and removes last element. null if empty.",
    "What is Comparator.comparing?|Comparator.comparing(Function keyExtractor). Chaining: thenComparing.",
    "What is Comparator.naturalOrder?|Returns comparator for natural order (Comparable).",
    "What is Comparator.reverseOrder?|Reverses natural order.",
    "What is Comparator.nullsFirst?|Comparator that handles nulls as smaller than non-null.",
    "What is Comparator.nullsLast?|Comparator that handles nulls as larger than non-null.",
    "What is Collectors.toList?|Collects stream to List. No guarantee on type (use toCollection).",
    "What is Collectors.toSet?|Collects to HashSet. No guarantee on type.",
    "What is Collectors.toMap key mapper?|toMap(keyMapper, valueMapper). Key collision throws IllegalStateException.",
    "What is Collectors.toMap merge function?|toMap(keyMapper, valueMapper, mergeFn). Handles duplicate keys.",
    "What is Collectors.groupingByConcurrent?|Concurrent version of groupingBy. Uses ConcurrentHashMap.",
    "What is Collectors.partitioningBy?|Partitions by predicate into Map<Boolean, List<T>>.",
    "What is Collections.EMPTY_LIST?|Type-unsafe empty list constant. Prefer Collections.emptyList().",
]
b("Collections", java_col, "Junior", "Java")

# ========== Python (300) ==========
py4 = [
    "What is the setdefault dict method?|dict.setdefault(key, default). Returns existing or inserts default.",
    "What is the dict.get vs []?|get returns None/default if missing. [] raises KeyError.",
    "What is the dict.pop?|Removes key and returns value. Raises KeyError if missing.",
    "What is the dict.popitem?|Removes and returns last inserted (key, value). Python 3.7+ LIFO.",
    "What is the dict.update?|Updates dict with another dict or iterable of pairs.",
    "What is the dict.keys/values/items?|View objects. Dynamic reflection of dict changes.",
    "What is the dict.fromkeys?|Creates dict from keys with common value: dict.fromkeys(keys, 0).",
    "What is the list.sort vs sorted?|list.sort mutates in-place. sorted returns new list.",
    "What is the list.append vs extend?|append adds single element. extend adds iterable elements.",
    "What is the list.insert?|list.insert(index, element). Shifts elements right.",
    "What is the list.remove?|Removes first occurrence of value. ValueError if missing.",
    "What is the list.pop?|Removes and returns element at index. Default last. IndexError if empty.",
    "What is the list.index?|Returns index of first match. ValueError if missing.",
    "What is the list.count?|Returns count of occurrences.",
    "What is the list.reverse vs reversed?|reverse inverts in-place. reversed returns iterator.",
    "What is the set.add?|Adds element to set. No-op if already present.",
    "What is the set.update?|Adds all elements from iterable.",
    "What is the set.remove vs discard?|remove raises KeyError if missing. discard silently ignores.",
    "What is the set.pop?|Removes and returns arbitrary element. Raises KeyError if empty.",
    "What is the set clear?|Removes all elements from set.",
    "What is the set.union?|Returns new set with elements from both sets. | operator.",
    "What is the set.intersection?|Returns new set with common elements. & operator.",
    "What is the set.difference?|Returns elements in first but not second. - operator.",
    "What is the set.symmetric_difference?|Elements in either but not both. ^ operator.",
    "What is the set.issubset?|True if all elements of set are in other. <= operator.",
    "What is the set.issuperset?|True if set contains all elements of other. >= operator.",
    "What is the set.isdisjoint?|True if sets have no common elements.",
    "What is the frozenset properties?|Immutable, hashable, can be dict key.",
    "What is the bytes type?|Immutable byte sequence. bytes([72, 101, 108]).",
    "What is the bytearray type?|Mutable byte sequence. bytearray(b'hello').",
    "What is the memoryview?|Memory view of buffer. Zero-copy slicing.",
    "What is the array module?|Typed array: array('i', [1,2,3]). Compact storage.",
    "What is the struct.pack?|Packs values into bytes: struct.pack('>i', 1234).",
    "What is the struct.unpack?|Unpacks bytes to values: struct.unpack('>i', data).",
    "What is the struct.calcsize?|Returns byte size of struct format.",
    "What is the pickle protocol?|Binary serialization protocol. Protocol 0-5. 5 is default (3.8+).",
    "What is the json.dumps vs dump?|dumps to string. dump to file-like object.",
    "What is the json.loads vs load?|loads from string. load from file-like object.",
    "What is the json.dumps indent?|Pretty print: json.dumps(data, indent=2).",
    "What is the json.dumps sort_keys?|Sorts keys alphabetically: sort_keys=True.",
    "What is the json.JSONEncoder?|Custom encoder: class MyEncoder(JSONEncoder). default() method.",
    "What is the json.JSONDecoder?|Custom decoder: object_hook for dict conversion.",
    "What is the csv.DictReader?|Reads CSV as list of dicts. First row as fieldnames.",
    "What is the csv.DictWriter?|Writes dicts to CSV. fieldnames parameter.",
    "What is the csv.writer writerow vs writerows?|writerow writes one row. writerows writes multiple.",
    "What is the csv Sniffer?|Detects CSV dialect: delimiter, quotechar, skipinitialspace.",
    "What is the re.match vs re.search?|match starts at beginning. search finds anywhere.",
    "What is the re.fullmatch?|Matches entire string against pattern.",
    "What is the re.findall?|Returns all matches as list of strings or tuples.",
    "What is the re.finditer?|Returns iterator of Match objects.",
    "What is the re.sub?|Substitute matches: re.sub(pattern, repl, string, count).",
    "What is the re.compile?|Precompiles regex for reuse. Faster for repeated use.",
    "What is the re.IGNORECASE?|Case-insensitive matching. re.I flag.",
    "What is the re.MULTILINE?|^ and $ match line starts/ends. re.M flag.",
    "What is the re.DOTALL?|Dot matches newlines too. re.S flag.",
    "What is the re.VERBOSE?|Readable regex with whitespace and comments. re.X flag.",
    "What is the Match.group?|Returns matched group by index or name.",
    "What is the Match.groups?|Returns tuple of all groups.",
    "What is the Match.groupdict?|Returns dict of named groups.",
    "What is the Match.start/end?|Returns start and end positions of match.",
    "What is the Match.span?|Returns (start, end) tuple of match.",
    "What is the pathlib.Path.read_text?|Reads file content as string.",
    "What is the pathlib.Path.write_text?|Writes string to file.",
    "What is the pathlib.Path.read_bytes?|Reads file content as bytes.",
    "What is the pathlib.Path.write_bytes?|Writes bytes to file.",
    "What is the pathlib.Path.iterdir?|Iterates over directory entries as Path objects.",
    "What is the pathlib.Path.glob?|Matches files: path.glob('*.txt') or path.glob('**/*.py').",
    "What is the pathlib.Path.rglob?|Recursive glob: path.rglob('*.py') same as glob('**/*.py').",
    "What is the pathlib.Path.mkdir?|Creates directory. parents=True for recursive. exist_ok=True.",
    "What is the pathlib.Path.rename?|Renames file or directory to target path.",
    "What is the pathlib.Path.replace?|Replaces destination atomically.",
    "What is the pathlib.Path.unlink?|Removes file. FileNotFoundError if missing.",
    "What is the pathlib.Path.rmdir?|Removes empty directory.",
    "What is the pathlib.Path.exists?|Checks if path exists.",
    "What is the pathlib.Path.is_file/is_dir?|Checks if path is file or directory.",
    "What is the pathlib.Path.stat?|File metadata: st_size, st_mtime, st_mode.",
    "What is the pathlib.Path.lstat?|Like stat but does not follow symlinks.",
    "What is the pathlib.Path.symlink_to?|Creates symlink to target.",
    "What is the pathlib.Path.hardlink_to?|Creates hard link to target.",
    "What is the pathlib.PurePath?|Platform-independent path manipulation. No I/O.",
    "What is the pathlib.PurePosixPath?|Unix-style paths. No I/O operations.",
    "What is the pathlib.PureWindowsPath?|Windows-style paths. No I/O operations.",
    "What is the os.name?|Operating system name: 'posix', 'nt', 'java'.",
    "What is the os.sep?|Path separator: '/' (Unix) or '\\\\' (Windows).",
    "What is the os.linesep?|Line separator: '\\n' or '\\r\\n'.",
    "What is the os.pathsep?|Path separator for PATH: ':' or ';'.",
    "What is the os.curdir/pardir?|'.' and '..' for current/parent directory.",
    "What is the sys.platform?|Platform identifier: 'win32', 'linux', 'darwin'.",
    "What is the sys.executable?|Path to Python interpreter.",
    "What is the sys.modules?|Dict of imported modules.",
    "What is the sys.path?|Module search path list. Modifiable.",
    "What is the sys.stdin/stdout/stderr?|Standard I/O file objects.",
    "What is the sys.getsizeof?|Object memory size in bytes.",
    "What is the sys.getrecursionlimit?|Returns recursion limit. setrecursionlimit to change.",
    "What is the sys.getrefcount?|Returns reference count of object.",
    "What is the sys.exc_info?|Returns (type, value, traceback) of current exception.",
    "What is the sys.settrace?|Sets system trace function for debugger/profiler.",
    "What is the sys.setprofile?|Sets profile function for performance profiling.",
    "What is the sys.version_info?|Version as named tuple: major, minor, micro.",
    "What is the sys.implementation?|Python implementation: CPython, PyPy, etc.",
    "What is the sys.flags?|Command-line flags: -v verbose, -O optimize.",
]
b("Python Advanced", py4, "Junior", "Python")

# ========== TypeScript (250) ==========
ts4 = [
    "What is the Partial mapped type?|Partial<T> makes all properties optional: { [P in keyof T]?: T[P] }.",
    "What is the Required mapped type?|Required<T> makes all properties required: { [P in keyof T]-?: T[P] }.",
    "What is the Readonly mapped type?|Readonly<T> makes all properties readonly: { readonly [P in keyof T]: T[P] }.",
    "What is the Pick mapped type?|Pick<T, K> creates type with only keys K from T.",
    "What is the Omit mapped type?|Omit<T, K> creates type without keys K from T.",
    "What is the Record mapped type?|Record<K, T> creates object type with keys K and values T.",
    "What is the Exclude conditional type?|Exclude<T, U> = T extends U ? never : T.",
    "What is the Extract conditional type?|Extract<T, U> = T extends U ? T : never.",
    "What is the NonNullable conditional type?|NonNullable<T> = T extends null | undefined ? never : T.",
    "What is the Parameters conditional type?|Parameters<T> = T extends (...args: infer P) => any ? P : never.",
    "What is the ConstructorParameters?|ConstructorParameters<T> = T extends abstract new (...args: infer P) => any ? P : never.",
    "What is the ReturnType conditional type?|ReturnType<T> = T extends (...args: any[]) => infer R ? R : never.",
    "What is the InstanceType conditional type?|InstanceType<T> = T extends abstract new (...args: any[]) => infer R ? R : never.",
    "What is the ThisParameterType?|ThisParameterType<T> = T extends (this: infer U, ...args: any[]) => any ? U : never.",
    "What is the OmitThisParameter?|OmitThisParameter<T> removes this param from function type.",
    "What is the Uppercase intrinsic type?|type Upper = Uppercase<'hello'> => 'HELLO'.",
    "What is the Lowercase intrinsic type?|type Lower = Lowercase<'HELLO'> => 'hello'.",
    "What is the Capitalize intrinsic type?|type Cap = Capitalize<'hello'> => 'Hello'.",
    "What is the Uncapitalize intrinsic type?|type Uncap = Uncapitalize<'Hello'> => 'hello'.",
    "What is the Awaited type?|Awaited<Promise<Promise<string>>> => string. Unwraps nested Promises.",
    "What is the ThisType?|ThisType<T> sets this type in object literal methods.",
    "What is the NoInfer type?|Prevents inference of type parameter. TS 5.4+.",
    "What is the satisfies keyword?|Validates value against type without affecting inferred type.",
    "What is the enum reverse mapping?|enum Color { Red = 1 }. Color[1] => 'Red'. Color.Red => 1.",
    "What is the const enum?|const enum Color { Red, Green }. Inlined at compile time. No runtime object.",
    "What is the ambient enum?|declare enum Color { Red, Green } for existing JS enums.",
    "What is the declare keyword?|declare var x: number declares variable without implementation.",
    "What is the declare function?|declare function f(x: number): string.",
    "What is the declare class?|declare class MyClass { constructor(name: string); }.",
    "What is the declare module?|declare module 'my-lib' { export function fn(): void; }.",
    "What is the declare global?|declare global { interface Window { myProp: string; } }.",
    "What is the triple-slash reference?|/// <reference path='./types.d.ts' /> for file references.",
    "What is the triple-slash types?|/// <reference types='node' /> for type package reference.",
    "What is the triple-slash lib?|/// <reference lib='es2015' /> for specific lib inclusion.",
    "What is the downlevelIteration?|Enables iteration protocol for ES3/ES5 target.",
    "What is the importHelpers?|Import tslib helpers instead of inline. Reduces bundle size.",
    "What is the noEmitHelpers?|Don't generate helper functions. Use tslib instead.",
    "What is the emitBOM?|Emit UTF-8 Byte Order Mark in output files.",
    "What is the newLine?|Line ending: 'CRLF' or 'LF' for output files.",
    "What is the stripInternal?|Don't emit declarations for @internal tagged members.",
    "What is the disableSizeLimit?|Disable size limit for JavaScript output.",
    "What is the noLib?|Don't include default library files (lib.d.ts).",
    "What is the noResolve?|Don't resolve triple-slash references or modules.",
    "What is the preserveConstEnums?|Don't erase const enum declarations in output.",
    "What is the removeComments?|Remove comments from output files.",
    "What is the strictFunctionTypes?|Enable stricter checking of function parameter bivariance.",
    "What is the strictBindCallApply?|Check bind/call/apply arguments against function signatures.",
    "What is the noUncheckedIndexedAccess?|Add undefined to index signature access types.",
    "What is the noPropertyAccessFromIndexSignature?|Require bracket access for index signatures.",
    "What is the exactOptionalPropertyTypes?|Exact checks for optional property types.",
    "What is the useUnknownInCatchVariables?|Catch clause variables default to unknown.",
]
b("Advanced Types", ts4, "Middle", "TypeScript")

# ========== React (300) ==========
react4 = [
    "What is the useEffectEvent hook?|Creates stable callback reference without dependency tracking.",
    "What is the useOptimistic hook?|For optimistic updates. Shows predicted state before server confirms.",
    "What is the use hook?|Reads promise or context. Suspense-aware.",
    "What is the startTransition?|Marks update as non-urgent. UI stays responsive.",
    "What is the useTransition?|Returns [isPending, startTransition]. For pending indicators.",
    "What is the useDeferredValue?|Delays re-rendering of non-critical UI during heavy updates.",
    "What is the useSyncExternalStore?|For subscribing to external stores. getSnapshot and subscribe.",
    "What is the useInsertionEffect?|Runs before DOM mutations. For CSS-in-JS libraries.",
    "What is the useId?|Generates unique and stable ID. For accessibility attributes.",
    "What is the useImperativeHandle?|Customizes the ref handle exposed to parent.",
    "What is the useDebugValue?|Labels custom hooks in React DevTools.",
    "What is the useLayoutEffect vs useEffect?|useLayoutEffect fires synchronously after DOM mutations.",
    "What is the useReducer vs useState?|useReducer for complex state with sub-values and transitions.",
    "What is the useCallback vs useMemo?|useCallback memoizes function. useMemo memoizes computed value.",
    "What is the forwardRef?|Passes ref to child functional component.",
    "What is the memo wrapper?|React.memo(Component). Skips re-render if props unchanged.",
    "What is the lazy loading?|React.lazy(() => import('./Component')). Suspense for loading state.",
    "What is the Suspense component?|Shows fallback while children load. Can catch multiple async deps.",
    "What is the SuspenseList?|Controls reveal order of multiple Suspense components.",
    "What is the ErrorBoundary class component?|Catches errors via componentDidCatch. Shows fallback UI.",
    "What is the Profiler component?|Measures render performance. onRender callback with timings.",
    "What is the StrictMode component?|Activates additional checks in development. Double render effects.",
    "What is the Fragment component?|<>...</> groups children without extra DOM node.",
    "What is the createContext?|const MyCtx = React.createContext(defaultValue). Creates context object.",
    "What is the Context.Provider?|<MyCtx.Provider value={someValue}>{children}</MyCtx.Provider>.",
    "What is the useContext?|const value = useContext(MyCtx). Reads closest Provider value.",
    "What is the createPortal?|ReactDOM.createPortal(children, domNode). Renders outside parent tree.",
    "What is the flushSync?|Forces React to commit updates synchronously.",
    "What is the createRoot?|ReactDOM.createRoot(container).render(<App />) for React 18.",
    "What is the hydrateRoot?|ReactDOM.hydrateRoot(container, <App />). Hydrates server-rendered HTML.",
    "What is the renderToPipeableStream?|Server renders as Node.js stream. Progressive HTML.",
    "What is the renderToReadableStream?|Server renders as web stream. Edge/Deno compatible.",
    "What is the renderToString?|Server renders to string. Blocks until done.",
    "What is the renderToStaticMarkup?|Server renders to string without React attributes.",
    "What is the useState lazy initializer?|useState(() => expensiveComputation()). Runs once on mount.",
    "What is the useReducer lazy init?|useReducer(reducer, initialArg, init). init called on mount.",
    "What is the useEffect cleanup?|Return function from useEffect. Runs on unmount and before re-run.",
    "What is the useEffect strict mode double fire?|In development, StrictMode double invokes effects.",
    "What is the useRef initial value?|useRef(initialValue). Mutable .current property persists.",
    "What is the callback ref?|ref={(node) => { instance = node }}. Called on mount/unmount.",
    "What is the forwarding multiple refs?|Forward refs with different names, not just ref prop.",
    "What is the Server Components?|React Server Components render on server. Zero client JS overhead.",
    "What is the Client Components?|Components with 'use client' directive. Interactive on client.",
    "What is the Server Actions?|'use server' functions called from client components.",
    "What is the Server Action mutation?|Form action attribute calls Server Action. Progressive enhancement.",
    "What is the useFormStatus?|Hook for form submission state in Server Actions.",
    "What is the useFormState?|Hook for form state with Server Actions. Returns [state, action].",
    "What is the next/navigation?|Router functions: useRouter, usePathname, useSearchParams.",
    "What is the Next.js App Router?|File-system based router. app/ directory with page.tsx.",
    "What is the Next.js Pages Router?|Legacy router. pages/ directory. getServerSideProps.",
    "What is the Next.js layout?|layout.tsx wraps pages. Shared UI. Nested layouts.",
    "What is the Next.js loading?|loading.tsx shown during page load. Suspense boundary.",
    "What is the Next.js error?|error.tsx catches errors in page segment. Client component.",
    "What is the Next.js not-found?|not-found.tsx for 404 responses.",
    "What is the Next.js middleware?|middleware.ts runs before request. Redirect, rewrite, auth.",
    "What is the Next.js Route Handlers?|API routes in app/api/route.ts. HTTP method functions.",
    "What is the Next.js Image component?|next/image optimized image. Lazy load, responsive, WebP.",
    "What is the Next.js Font component?|next/font optimized fonts. Self-hosted, no layout shift.",
    "What is the Next.js Script component?|next/script for third-party scripts. Strategy: afterInteractive.",
    "What is the next/dynamic?|Dynamic import with SSR toggle. Same as React.lazy + Suspense.",
    "What is the Next.js revalidate?|ISR: revalidate in getStaticProps or fetch cache option.",
    "What is the Next.js generateStaticParams?|Generates static paths at build time for SSG.",
    "What is the Next.js generateMetadata?|Generates metadata for SEO: title, description, open graph.",
    "What is the Next.js parallel routes?|Multiple pages in same layout. @slot convention.",
    "What is the Next.js intercepting routes?|Intercepts routes for modal/navigation. (.) convention.",
]
b("React Advanced", react4, "Middle", "React")

# ========== Go (200) ==========
go4 = [
    "What is the fmt.Fprintf?|Writes formatted output to writer. fmt.Fprintf(w, 'Hello %s', name).",
    "What is the fmt.Sscanf?|Scans formatted string into variables. fmt.Sscanf(input, '%d-%s', &i, &s).",
    "What is the fmt.Errorf?|Creates error with formatted message: fmt.Errorf('user %d not found', id).",
    "What is the io.ReadAll?|Reads all bytes from reader. Returns []byte.",
    "What is the io.ReadFull?|Reads exactly len(buf) bytes from reader.",
    "What is the io.WriteString?|Writes string to writer.",
    "What is the io.CopyBuffer?|Copy with custom buffer size.",
    "What is the io.MultiReader?|Sequentially reads from multiple readers.",
    "What is the io.MultiWriter?|Writes to multiple writers simultaneously.",
    "What is the io.TeeReader?|Reads from reader and writes to writer simultaneously.",
    "What is the io.Pipe?|Creates synchronous in-memory pipe. PipeReader and PipeWriter.",
    "What is the io.NopCloser?|Wraps reader with no-op Close method.",
    "What is the io.ReadSeeker?|Reader + Seeker interface.",
    "What is the io.ReadWriteCloser?|Reader + Writer + Closer interface.",
    "What is the os.File.Read?|Reads from file into buffer. Returns bytes read.",
    "What is the os.File.Write?|Writes bytes to file. Returns bytes written.",
    "What is the os.File.Seek?|Sets file offset for next read/write. SeekStart, SeekCurrent, SeekEnd.",
    "What is the os.File.Stat?|Returns FileInfo. Name, Size, Mode, ModTime, IsDir.",
    "What is the os.File.Readdir?|Reads directory contents as []FileInfo (deprecated, use ReadDir).",
    "What is the os.File.ReadDir?|Reads directory as []DirEntry. Name, IsDir, Type, Info.",
    "What is the os.File.Truncate?|Truncates file to specified size.",
    "What is the os.File.Sync?|Flushes file writes to disk.",
    "What is the os.Create?|Creates or truncates file. Mode 0666.",
    "What is the os.Open?|Opens file for reading.",
    "What is the os.OpenFile?|Opens file with specific flag and mode.",
    "What is the os.ReadFile?|Reads entire file. Go 1.16+.",
    "What is the os.WriteFile?|Writes data to file. Go 1.16+.",
    "What is the os.Mkdir?|Creates directory. Perm 0755.",
    "What is the os.MkdirAll?|Creates directory with parents.",
    "What is the os.Remove?|Removes file or empty directory.",
    "What is the os.RemoveAll?|Removes file or directory recursively.",
    "What is the os.Rename?|Renames file or directory.",
    "What is the os.Chmod?|Changes file mode/permissions.",
    "What is the os.Chown?|Changes file owner and group.",
    "What is the os.Chtimes?|Changes file access and modification times.",
    "What is the os.Link?|Creates hard link.",
    "What is the os.Symlink?|Creates symbolic link.",
    "What is the os.Readlink?|Reads symlink target.",
    "What is the os.Getwd?|Returns current working directory.",
    "What is the os.Chdir?|Changes current working directory.",
]
b("Go Basics", go4, "Junior", "Go")

# Add to file
new_part = "\n".join(new_q_calls) + "\n"

with open(MJS, 'w', encoding='utf-8') as f:
    f.write(before_seed)
    f.write(new_part)
    f.write(from_seed)

total_new = len(new_q_calls)
print(f"Batch 4 added {total_new} new questions")

with open(MJS, 'r', encoding='utf-8') as f:
    content = f.read()
total = content.count("\n  Q(")
print(f"Total Q() calls: {total}")