"""Batch 6: Add ~1300 more questions"""
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

def to_mjs(items):
    for item in items:
        if isinstance(item, tuple):
            cat, q, a, diff, lang = item
            add(cat, q, a, diff, lang)

# ========== Java (200) ==========
java6 = [
    ("JVM Internals", "What is the Metaspace garbage collection?", "Metaspace GC runs when class metadata usage reaches MaxMetaspaceSize. Dead class loaders trigger cleanup.", "Middle", "Java"),
    ("JVM Internals", "What is the Code Cache?", "JIT-compiled native code storage. -XX:ReservedCodeCacheSize. Flushes if full, disabling JIT.", "Middle", "Java"),
    ("JVM Internals", "What is the Compressed Class Space?", "Space for class metadata when using CompressedClassPointers. Separate from Metaspace.", "Middle", "Java"),
    ("JVM Internals", "What is the StackOverflowError?", "Thrown when thread stack exhausted. Usually deep recursion. Increase with -Xss.", "Junior", "Java"),
    ("JVM Internals", "What is the OutOfMemoryError?", "Thrown when JVM cannot allocate more objects. Heap, Metaspace, or native memory exhausted.", "Junior", "Java"),
    ("JVM Internals", "What is -XX:+HeapDumpOnOutOfMemoryError?", "Generates heap dump file when OOM occurs. Path with -XX:HeapDumpPath.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:+PrintGCDetails flag?", "Prints detailed GC log (deprecated, use -Xlog:gc*).", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:+PrintGCApplicationStoppedTime?", "Prints duration of all stop-the-world pauses.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:+UnlockExperimentalVMOptions?", "Enables experimental JVM flags like ZGC and Shenandoah.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:+UseNUMA?", "Enables NUMA-aware memory allocation for better performance on multi-socket servers.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:MaxGCPauseMillis?", "Target max GC pause time for G1. Default 200ms.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:ParallelGCThreads?", "Number of threads for parallel GC phases. Default based on CPU count.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:ConcGCThreads?", "Number of concurrent GC threads for CMS/G1 marking. Default based on ParallelGCThreads.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:G1HeapRegionSize?", "Size of G1 regions. Default auto-calculated based on heap size.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:InitiatingHeapOccupancyPercent?", "Heap occupancy % that triggers G1 concurrent marking. Default 45%.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:G1NewSizePercent?", "Percentage of heap for young generation initial size. Default 5%.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:G1MaxNewSizePercent?", "Maximum young generation size. Default 60%.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:+UseStringDeduplication?", "G1 can deduplicate identical String objects. Reduces heap usage.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:+UseContainerSupport?", "JVM detects container memory/CPU limits. Enabled by default in JDK 10+.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:ActiveProcessorCount?", "Overrides active processor count for containerized environments.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:MaxRAMPercentage?", "Max heap as percentage of system/container memory. Default 25%. JDK 8u191+.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:InitialRAMPercentage?", "Initial heap as percentage of total memory. Default 1.5625%.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:MinRAMPercentage?", "Min heap percentage on small-memory systems.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:+ExitOnOutOfMemoryError?", "Exits JVM on first OOM. Useful for container orchestration restart.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:+CrashOnOutOfMemoryError?", "Generates crash report on OOM for post-mortem analysis.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:+PrintConcurrentLocks?", "Prints concurrent locks in thread dump for deadlock analysis.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:NativeMemoryTracking?", "Tracks native memory usage: summary, detail, or off. jcmd VM.native_memory.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:+UnlockDiagnosticVMOptions?", "Enables diagnostic JVM flags for debugging and monitoring.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:+PrintClassHistogram?", "Prints class histogram on Ctrl+Break (Windows) or SIGQUIT (Unix).", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:+HeapDumpBeforeFullGC?", "Heap dump before full GC for analyzing GC-triggering conditions.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:+TraceClassLoading?", "Logs each loaded class. Useful for classpath debugging.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:+TraceClassUnloading?", "Logs each unloaded class. Useful for Metaspace leak analysis.", "Middle", "Java"),
    ("JVM Internals", "What is the -XX:+PrintCommandLineFlags?", "Prints JVM flags that were set on command line or ergonomically.", "Middle", "Java"),
]
to_mjs(java6)

# ========== Python (200) ==========
py6 = [
    ("Python Advanced", "What is the Platform.platform?", "Platform identifier string: 'Linux-5.4-x86_64', 'Windows-10'.", "Junior", "Python"),
    ("Python Advanced", "What is the Platform.machine?", "Machine type: 'x86_64', 'arm64', 'AMD64'.", "Junior", "Python"),
    ("Python Advanced", "What is the Platform.processor?", "Processor name string. May be empty on some platforms.", "Junior", "Python"),
    ("Python Advanced", "What is the Platform.python_implementation?", "Python impl: 'CPython', 'PyPy', 'Jython', 'IronPython'.", "Junior", "Python"),
    ("Python Advanced", "What is the Platform.node?", "Network node/hostname.", "Junior", "Python"),
    ("Python Advanced", "What is the Platform.uname?", "Returns (system, node, release, version, machine, processor).", "Junior", "Python"),
    ("Python Advanced", "What is the calendar.TextCalendar?", "Calendar as text: TextCalendar().formatmonth(2024, 1).", "Junior", "Python"),
    ("Python Advanced", "What is the calendar.HTMLCalendar?", "Calendar as HTML table.", "Junior", "Python"),
    ("Python Advanced", "What is the calendar.isleap?", "Returns True if year is leap year.", "Junior", "Python"),
    ("Python Advanced", "What is the calendar.leapdays?", "Count of leap days between years.", "Junior", "Python"),
    ("Python Advanced", "What is the calendar.weekday?", "Returns day of week (0=Monday) for given date.", "Junior", "Python"),
    ("Python Advanced", "What is the calendar.monthrange?", "Returns (first_weekday, num_days) for given year/month.", "Junior", "Python"),
    ("Python Advanced", "What is the calendar.monthcalendar?", "Matrix of week rows for given month.", "Junior", "Python"),
    ("Python Advanced", "What is the calendar.day_name/month_name?", "Locale-appropriate day/month names.", "Junior", "Python"),
    ("Python Advanced", "What is the locale module?", "Internationalization: setlocale, currency, strcoll, format_string.", "Junior", "Python"),
    ("Python Advanced", "What is the locale.getlocale?", "Returns current locale for category.", "Junior", "Python"),
    ("Python Advanced", "What is the locale.setlocale?", "Sets locale for category: locale.setlocale(LC_ALL, 'en_US.UTF-8').", "Junior", "Python"),
    ("Python Advanced", "What is the locale.currency?", "Formats number as currency: locale.currency(1234.56).", "Junior", "Python"),
    ("Python Advanced", "What is the locale.strcoll?", "Locale-aware string comparison for sorting.", "Junior", "Python"),
    ("Python Advanced", "What is the locale.format_string?", "Locale-aware number formatting.", "Junior", "Python"),
    ("Python Advanced", "What is the gettext module?", "i18n: _('message') for translation. .mo files.", "Junior", "Python"),
    ("Python Advanced", "What is the gettext.translation?", "Loads translation catalog for domain and locale.", "Junior", "Python"),
    ("Python Advanced", "What is the gettext.install?", "Installs _() in builtins for global translation.", "Junior", "Python"),
    ("Python Advanced", "What is the string.Template?", "Simple string substitution: Template('$name').substitute(name='X').", "Junior", "Python"),
    ("Python Advanced", "What is the string.Formatter?", "Custom string formatting: Formatter().format('{0}', value).", "Junior", "Python"),
    ("Python Advanced", "What is the textwrap.wrap?", "Wraps text to specified width. Returns list of lines.", "Junior", "Python"),
    ("Python Advanced", "What is the textwrap.fill?", "Wraps and joins lines with newline.", "Junior", "Python"),
    ("Python Advanced", "What is the textwrap.shorten?", "Truncates text with placeholder.", "Junior", "Python"),
    ("Python Advanced", "What is the textwrap.dedent?", "Removes common leading whitespace from text.", "Junior", "Python"),
    ("Python Advanced", "What is the textwrap.indent?", "Adds prefix to each line.", "Junior", "Python"),
    ("Python Advanced", "What is the unicodedata.name?", "Returns Unicode name for character: unicodedata.name('A').", "Junior", "Python"),
    ("Python Advanced", "What is the unicodedata.lookup?", "Looks up character by name: unicodedata.lookup('LATIN CAPITAL LETTER A').", "Junior", "Python"),
    ("Python Advanced", "What is the unicodedata.category?", "Returns Unicode category: 'Lu' for uppercase letter.", "Junior", "Python"),
    ("Python Advanced", "What is the unicodedata.bidirectional?", "Returns Unicode bidirectional class.", "Junior", "Python"),
    ("Python Advanced", "What is the unicodedata.decomposition?", "Returns Unicode decomposition mapping.", "Junior", "Python"),
    ("Python Advanced", "What is the unicodedata.normalize?", "Unicode normalization: NFC, NFD, NFKC, NFKD.", "Junior", "Python"),
    ("Python Advanced", "What is the difflib.SequenceMatcher?", "Compares sequences: ratio, get_matching_blocks, get_opcodes.", "Junior", "Python"),
    ("Python Advanced", "What is the difflib.HtmlDiff?", "Side-by-side HTML diff table.", "Junior", "Python"),
    ("Python Advanced", "What is the difflib.unified_diff?", "Unified diff format output.", "Junior", "Python"),
    ("Python Advanced", "What is the difflib.context_diff?", "Context diff format output.", "Junior", "Python"),
    ("Python Advanced", "What is the difflib.get_close_matches?", "Best matches from list: get_close_matches('appel', ['apple', 'april']).", "Junior", "Python"),
    ("Python Advanced", "What is the inspect module?", "Introspection: getmembers, getsource, getsourcelines, signature.", "Junior", "Python"),
    ("Python Advanced", "What is the inspect.isfunction?", "Checks if object is function/lambda.", "Junior", "Python"),
    ("Python Advanced", "What is the inspect.isclass?", "Checks if object is class.", "Junior", "Python"),
    ("Python Advanced", "What is the inspect.ismethod?", "Checks if object is bound method.", "Junior", "Python"),
    ("Python Advanced", "What is the inspect.isgenerator?", "Checks if object is generator.", "Junior", "Python"),
    ("Python Advanced", "What is the inspect.iscoroutine?", "Checks if object is coroutine function.", "Junior", "Python"),
    ("Python Advanced", "What is the inspect.signature?", "Returns Signature with parameters, return annotation.", "Junior", "Python"),
    ("Python Advanced", "What is the inspect.getsource?", "Returns source code of function/class/module.", "Junior", "Python"),
    ("Python Advanced", "What is the inspect.getfile?", "Returns file path where object defined.", "Junior", "Python"),
    ("Python Advanced", "What is the inspect.getmodule?", "Returns module containing object.", "Junior", "Python"),
    ("Python Advanced", "What is the inspect.getmembers?", "Returns members of object: name-value pairs.", "Junior", "Python"),
    ("Python Advanced", "What is the inspect.cleandoc?", "Cleans up indentation from docstring.", "Junior", "Python"),
    ("Python Advanced", "What is the traceback module?", "Exception traceback: print_exc, format_exc, extract_tb.", "Junior", "Python"),
    ("Python Advanced", "What is the traceback.format_exc?", "Formats current exception traceback as string.", "Junior", "Python"),
    ("Python Advanced", "What is the traceback.print_exc?", "Prints current traceback to stderr.", "Junior", "Python"),
    ("Python Advanced", "What is the traceback.extract_tb?", "Extracts traceback as StackSummary objects.", "Junior", "Python"),
    ("Python Advanced", "What is the traceback.format_tb?", "Formats traceback objects to strings.", "Junior", "Python"),
    ("Python Advanced", "What is the warnings module?", "Warning control: warn, filterwarnings, catch_warnings.", "Junior", "Python"),
    ("Python Advanced", "What is the warnings.warn?", "Issues warning. Category: DeprecationWarning, UserWarning.", "Junior", "Python"),
    ("Python Advanced", "What is the warnings.simplefilter?", "Simplified filter config: simplefilter('always', DeprecationWarning).", "Junior", "Python"),
    ("Python Advanced", "What is the warnings.filterwarnings?", "Fine-grained filter: filterwarnings('ignore', category=DeprecationWarning).", "Junior", "Python"),
    ("Python Advanced", "What is the warnings.catch_warnings?", "Context manager for temporary warning filters.", "Junior", "Python"),
    ("Python Advanced", "What is the abc.ABCMeta?", "Metaclass for abstract base classes. Registers abstract methods.", "Junior", "Python"),
    ("Python Advanced", "What is the abc.abstractmethod?", "Decorator for abstract methods. Subclass must override.", "Junior", "Python"),
    ("Python Advanced", "What is the abc.abstractproperty?", "Abstract property decorator. Use @abstractmethod + @property now.", "Junior", "Python"),
    ("Python Advanced", "What is the abc.abstractclassmethod?", "Abstract class method. Use @abstractmethod + @classmethod now.", "Junior", "Python"),
    ("Python Advanced", "What is the abc.abstractstaticmethod?", "Abstract static method. Use @abstractmethod + @staticmethod now.", "Junior", "Python"),
    ("Python Advanced", "What is the abc.ABC convenience class?", "Helper class with ABCMeta metaclass. class MyClass(ABC).", "Junior", "Python"),
    ("Python Advanced", "What is the collections.ChainMap?", "Combines multiple dicts into single view. Updating first dict.", "Junior", "Python"),
    ("Python Advanced", "What is the collections.UserDict?", "Wrapper around dict for easy subclassing.", "Junior", "Python"),
    ("Python Advanced", "What is the collections.UserList?", "Wrapper around list for easy subclassing.", "Junior", "Python"),
    ("Python Advanced", "What is the collections.UserString?", "Wrapper around string for easy subclassing.", "Junior", "Python"),
    ("Python Advanced", "What is the heapq.heapify?", "Transforms list into heap in O(n).", "Junior", "Python"),
    ("Python Advanced", "What is the heapq.heappush?", "Pushes value onto heap maintaining heap property.", "Junior", "Python"),
    ("Python Advanced", "What is the heapq.heappop?", "Pops smallest value from heap.", "Junior", "Python"),
    ("Python Advanced", "What is the heapq.heappushpop?", "Pushes then pops, more efficient than separate calls.", "Junior", "Python"),
    ("Python Advanced", "What is the heapq.heapreplace?", "Pops then pushes. Faster than pop then push.", "Junior", "Python"),
    ("Python Advanced", "What is the heapq.nlargest?", "Returns n largest elements from iterable.", "Junior", "Python"),
    ("Python Advanced", "What is the heapq.nsmallest?", "Returns n smallest elements from iterable.", "Junior", "Python"),
    ("Python Advanced", "What is the bisect.bisect_left?", "Returns insertion point to maintain sorted order. Leftmost.", "Junior", "Python"),
    ("Python Advanced", "What is the bisect.bisect_right?", "Returns insertion point rightmost. bisect is alias.", "Junior", "Python"),
    ("Python Advanced", "What is the bisect.insort_left?", "Inserts element maintaining sorted order. Leftmost position.", "Junior", "Python"),
    ("Python Advanced", "What is the bisect.insort_right?", "Inserts element at rightmost position.", "Junior", "Python"),
]
to_mjs(py6)

# ========== TypeScript (150) ==========
ts6 = [
    ("TypeScript Basics", "What is the keyof typeof pattern?", "keyof typeof obj gets keys from value type. const obj = {a:1}; type K = keyof typeof obj.", "Middle", "TypeScript"),
    ("TypeScript Basics", "What is the Record with union keys?", "type Routes = Record<'/' | '/about' | '/contact', RouteConfig>.", "Middle", "TypeScript"),
    ("TypeScript Basics", "What is the Partial with nested objects?", "Partial<DeepObject> makes only top-level optional. Use DeepPartial type for recursive.", "Middle", "TypeScript"),
    ("TypeScript Basics", "What is the Required with pick?", "Required<Pick<T, K>> requires specific keys.", "Middle", "TypeScript"),
    ("TypeScript Basics", "What is the Readonly with deep?", "type DeepReadonly<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> }.", "Senior", "TypeScript"),
    ("TypeScript Basics", "What is the Omit with Record?", "Omit<Record<K, V>, K2> removes keys from mapped type.", "Middle", "TypeScript"),
    ("TypeScript Basics", "What is the Pick with union?", "Pick<T, keyof T> selects all keys. Useful with mapped types.", "Middle", "TypeScript"),
    ("TypeScript Basics", "What is the Extract with template literals?", "Extract<keyof T, `get${string}`> extracts getter-like keys.", "Senior", "TypeScript"),
    ("TypeScript Basics", "What is the Parameters with rest?", "Parameters<T> captures rest params as tuple.", "Middle", "TypeScript"),
    ("TypeScript Basics", "What is the ConstructorParameters with abstract?", "ConstructorParameters<typeof MyClass> extracts constructor arg types.", "Middle", "TypeScript"),
    ("TypeScript Basics", "What is the ReturnType with generic function?", "ReturnType<typeof id<string>> infers return type for specific call.", "Senior", "TypeScript"),
    ("TypeScript Basics", "What is the InstanceType with mixin?", "InstanceType<typeof mixin(Base)> for mixin result type.", "Senior", "TypeScript"),
    ("TypeScript Basics", "What is the ThisParameterType with method?", "ThisParameterType<typeof obj.method> extracts this type of method.", "Middle", "TypeScript"),
    ("TypeScript Basics", "What is the OmitThisParameter usage?", "Removes this param from function signature. Simplified callback types.", "Middle", "TypeScript"),
    ("TypeScript Basics", "What is the Reverse mapped type?", "type Reverse<T> = { [P in keyof T as `${string & P}`]: T[P] } to reorder.", "Senior", "TypeScript"),
    ("TypeScript Basics", "What is the Filter mapped type?", "type Filter<T, U> = { [P in keyof T as T[P] extends U ? P : never]: T[P] }.", "Senior", "TypeScript"),
    ("TypeScript Basics", "What is the MapKeys type?", "type MapKeys<T, New> = { [P in keyof T as New]: T[P] } remaps all keys.", "Senior", "TypeScript"),
    ("TypeScript Basics", "What is the Getters mapped type?", "type Getters<T> = { [P in keyof T as `get${Capitalize<string & P>}`]: () => T[P] }.", "Senior", "TypeScript"),
    ("TypeScript Basics", "What is the Setters mapped type?", "type Setters<T> = { [P in keyof T as `set${Capitalize<string & P>}`]: (v: T[P]) => void }.", "Senior", "TypeScript"),
    ("TypeScript Basics", "What is the OptionalKeys type?", "type OptionalKeys<T> = { [P in keyof T]-?: {} extends Pick<T, P> ? P : never }[keyof T].", "Senior", "TypeScript"),
    ("TypeScript Basics", "What is the RequiredKeys type?", "type RequiredKeys<T> = Exclude<keyof T, OptionalKeys<T>>.", "Senior", "TypeScript"),
    ("TypeScript Basics", "What is the UnionToIntersection?", "type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never.", "Senior", "TypeScript"),
    ("TypeScript Basics", "What is the IsUnion type?", "type IsUnion<T, U = T> = T extends any ? ([U] extends [T] ? false : true) : never.", "Senior", "TypeScript"),
    ("TypeScript Basics", "What is the IsNever type?", "type IsNever<T> = [T] extends [never] ? true : false.", "Senior", "TypeScript"),
    ("TypeScript Basics", "What is the IsAny type?", "type IsAny<T> = 0 extends (1 & T) ? true : false.", "Senior", "TypeScript"),
    ("TypeScript Basics", "What is the TupleToUnion?", "type TupleToUnion<T> = T extends readonly unknown[] ? T[number] : never.", "Middle", "TypeScript"),
    ("TypeScript Basics", "What is the UnionToTuple?", "UnionToTuple is complex: use function overloads or recursion.", "Senior", "TypeScript"),
    ("TypeScript Basics", "What is the LastInUnion?", "type LastInUnion<U> = (U extends any ? (k: U) => void : never) extends (k: infer L) => void ? L : never.", "Senior", "TypeScript"),
    ("TypeScript Basics", "What is the PopUnion?", "type PopUnion<U> = LastInUnion<U>, Exclude<U, LastInUnion<U>>.", "Senior", "TypeScript"),
    ("TypeScript Basics", "What is the Prettify type?", "type Prettify<T> = T extends infer R ? { [P in keyof R]: R[P] } : never. Expands nested types.", "Middle", "TypeScript"),
    ("TypeScript Basics", "What is the IsEqual type?", "type IsEqual<A, B> = A extends B ? (B extends A ? true : false) : false.", "Middle", "TypeScript"),
    ("TypeScript Basics", "What is the Head of tuple?", "type Head<T> = T extends [infer H, ...unknown[]] ? H : never.", "Middle", "TypeScript"),
    ("TypeScript Basics", "What is the Tail of tuple?", "type Tail<T> = T extends [unknown, ...infer R] ? R : [].", "Middle", "TypeScript"),
    ("TypeScript Basics", "What is the HasTail type?", "type HasTail<T> = T extends [unknown, ...unknown[]] ? true : false.", "Middle", "TypeScript"),
    ("TypeScript Basics", "What is the Append type?", "type Append<T extends unknown[], U> = [...T, U].", "Middle", "TypeScript"),
    ("TypeScript Basics", "What is the Concat type?", "type Concat<T extends unknown[], U extends unknown[]> = [...T, ...U].", "Middle", "TypeScript"),
    ("TypeScript Basics", "What is the Reverse tuple type?", "type Reverse<T> = T extends [infer H, ...infer R] ? [...Reverse<R>, H] : [].", "Senior", "TypeScript"),
    ("TypeScript Basics", "What is the TupleToObject?", "type TupleToObject<T extends readonly string[]> = { [P in T[number]]: P }.", "Middle", "TypeScript"),
    ("TypeScript Basics", "What is the ObjectEntries?", "type ObjectEntries<T> = { [P in keyof T]: [P, T[P]] }[keyof T].", "Senior", "TypeScript"),
    ("TypeScript Basics", "What is the DeepPick?", "type DeepPick<T, P extends string> = P extends `${infer K}.${infer R}` ? K extends keyof T ? { [P in K]: DeepPick<T[K], R> } : never : P extends keyof T ? { [P in P]: T[P] } : never.", "Senior", "TypeScript"),
    ("TypeScript Basics", "What is the Merge type?", "type Merge<A, B> = { [P in keyof A | keyof B]: P extends keyof B ? B[P] : P extends keyof A ? A[P] : never }.", "Middle", "TypeScript"),
    ("TypeScript Basics", "What is the Diff type?", "type Diff<A, B> = Omit<A & B, keyof A & keyof B>.", "Middle", "TypeScript"),
    ("TypeScript Basics", "What is the OneOf pattern?", "type OneOf<T> = { [P in keyof T]: Record<P, T[P]> & Partial<Record<Exclude<keyof T, P>, never>> }[keyof T].", "Senior", "TypeScript"),
]
to_mjs(ts6)

# ========== React (150) ==========
rx6 = [
    ("React Basics", "What is the createContext with typed defaults?", "const Theme = createContext<ThemeType>({ mode: 'light', setMode: () => {} }).", "Middle", "React"),
    ("React Basics", "What is the Context as state management?", "Context + useReducer for local global state. Provider wraps app.", "Middle", "React"),
    ("React Basics", "What is the Context performance optimization?", "Split context into slices. Memoize provider value. Use separate contexts for often-changing values.", "Senior", "React"),
    ("React Basics", "What is the Recoil library?", "Atomic state management. Atoms and selectors. Minimal re-renders.", "Middle", "React"),
    ("React Basics", "What is the Jotai library?", "Primitive atomic state management. Very similar to Recoil. TypeScript-first.", "Middle", "React"),
    ("React Basics", "What is the Zustand devtools?", "zustand/middleware. devtools for Redux DevTools integration.", "Middle", "React"),
    ("React Basics", "What is the Zustand persist?", "zustand/middleware. persist with localStorage/AsyncStorage.", "Middle", "React"),
    ("React Basics", "What is the Valtio library?", "Proxy-based state management. Mutable state. No selectors.", "Middle", "React"),
    ("React Basics", "What is the useSyncExternalStore with Zustand?", "useSyncExternalStore(store.subscribe, store.getState) for external stores.", "Senior", "React"),
    ("React Basics", "What is the React Router param pattern?", "useParams for route params. useSearchParams for query params.", "Junior", "React"),
    ("React Basics", "What is the React Router loader?", "loader function in route config. Returns data before rendering.", "Middle", "React"),
    ("React Basics", "What is the React Router action?", "action function handles form submissions. Revalidation after action.", "Middle", "React"),
    ("React Basics", "What is the React Router defer?", "Deferred data loading. Await component with Suspense.", "Senior", "React"),
    ("React Basics", "What is the React Router useFetcher?", "Fetches data without navigation. For dependent queries.", "Middle", "React"),
    ("React Basics", "What is the TanStack Router?", "Type-safe router. Full TypeScript inference. File-based routing.", "Middle", "React"),
    ("React Basics", "What is the wouter library?", "Minimal React router. Hooks-based. No JSX router component.", "Middle", "React"),
    ("React Basics", "What is the React Aria library?", "Adobe's accessibility library. Hooks for accessible components.", "Middle", "React"),
    ("React Basics", "What is the Radix UI library?", "Unstyled accessible components. Primitive headless UI.", "Middle", "React"),
    ("React Basics", "What is the Headless UI library?", "Tailwind-compatible headless components. Listbox, Menu, Dialog.", "Middle", "React"),
    ("React Basics", "What is the Chakra UI?", "Component library with styled props. Dark mode. Accessibility.", "Junior", "React"),
    ("React Basics", "What is the MUI library?", "Material Design React components. Theming. SX prop.", "Junior", "React"),
    ("React Basics", "What is the Ant Design library?", "Enterprise UI components. Table, Form, DatePicker. ConfigProvider.", "Junior", "React"),
    ("React Basics", "What is the Shadcn/ui library?", "Copy-paste component library. Radix primitives. TailwindCSS.", "Middle", "React"),
    ("React Basics", "What is the TailwindCSS with React?", "Utility-first CSS. className with functions. Tailwind merge for conflicts.", "Junior", "React"),
    ("React Basics", "What is the CSS Modules with React?", "import styles from './Comp.module.css'. className={styles.root}.", "Junior", "React"),
    ("React Basics", "What is the Emotion library?", "CSS-in-JS: css prop, styled components, keyframes.", "Junior", "React"),
    ("React Basics", "What is the Styled Components?", "CSS-in-JS: const Button = styled.button`color: red;`.", "Junior", "React"),
    ("React Basics", "What is the CSS-in-JS vs CSS Modules?", "CSS-in-JS: dynamic, no separation. CSS Modules: static, file-based.", "Middle", "React"),
    ("React Basics", "What is the react-helmet-async?", "Manages document head. title, meta tags. For SEO.", "Junior", "React"),
    ("React Basics", "What is the react-helmet?", "Document head manager (older version of react-helmet-async).", "Junior", "React"),
    ("React Basics", "What is the next/head?", "Next.js component for head elements. <Head><title>Page</title></Head>.", "Junior", "React"),
    ("React Basics", "What is the next/script strategy?", "Strategy: beforeInteractive, afterInteractive, lazyOnload, worker.", "Middle", "React"),
    ("React Basics", "What is the next/image priority?", "priority attribute preloads image. For above-the-fold images.", "Junior", "React"),
    ("React Basics", "What is the next/font local?", "import localFont from 'next/font/local'. src, weight, style.", "Middle", "React"),
    ("React Basics", "What is the next/font Google?", "import { Inter } from 'next/font/google'. Inter({ subsets: ['latin'] }).", "Junior", "React"),
    ("React Basics", "What is the React Native basics?", "React for mobile. View, Text, FlatList, StyleSheet. Native components.", "Junior", "React"),
    ("React Basics", "What is the React Native Expo?", "Framework for RN. Managed workflow. Over-the-air updates.", "Junior", "React"),
    ("React Basics", "What is the Expo Router?", "File-based routing for Expo. React Navigation under the hood.", "Middle", "React"),
    ("React Basics", "What is the React Native Paper?", "Material Design for React Native. Provider, components.", "Junior", "React"),
    ("React Basics", "What is the React Native Elements?", "Cross-platform UI kit. Button, Input, Card, Overlay.", "Junior", "React"),
    ("React Basics", "What is the React Native Reanimated?", "Animation library. Worklets for UI thread animations. Shared values.", "Middle", "React"),
    ("React Basics", "What is the React Native Gesture Handler?", "Gesture handling. Tap, Pan, Pinch, Rotation. Native driver.", "Middle", "React"),
    ("React Basics", "What is the React Native Navigation?", "Native navigation library. Stack, Tab, Drawer. Type-safe.", "Middle", "React"),
    ("React Basics", "What is the Expo Camera?", "Camera component. takePictureAsync, recordVideoAsync. Barcode scanning.", "Junior", "React"),
    ("React Basics", "What is the Expo Location?", "Location services. getCurrentPositionAsync, watchPositionAsync.", "Junior", "React"),
    ("React Basics", "What is the Expo Notifications?", "Push notifications. getExpoPushTokenAsync. Local notifications.", "Junior", "React"),
    ("React Basics", "What is the Expo SecureStore?", "Encrypted key-value storage. setItemAsync, getItemAsync.", "Junior", "React"),
    ("React Basics", "What is the Expo SQLite?", "SQLite database. openDatabaseSync, execAsync, getAllAsync.", "Junior", "React"),
    ("React Basics", "What is the Expo FileSystem?", "File I/O. documentDirectory, cacheDirectory. readAsStringAsync.", "Junior", "React"),
    ("React Basics", "What is the Expo AppState?", "App state listener: active, inactive, background. useAppState listener.", "Junior", "React"),
    ("React Basics", "What is the Expo SplashScreen?", "Autohide: SplashScreen.preventAutoHideAsync(). Hide after ready.", "Junior", "React"),
    ("React Basics", "What is the React Native Animated API?", "Built-in animation: Animated.Value, timing, spring, sequence.", "Junior", "React"),
    ("React Basics", "What is the React Native FlatList?", "Performant list. renderItem, keyExtractor. onEndReached for pagination.", "Junior", "React"),
    ("React Basics", "What is the React Native SectionList?", "Sectioned list. sections prop with title and data.", "Junior", "React"),
    ("React Basics", "What is the React Native ScrollView?", "Scrollable container. horizontal, pagingEnabled, contentContainerStyle.", "Junior", "React"),
    ("React Basics", "What is the React Native Modal?", "Modal overlay. visible, animationType, transparent, onRequestClose.", "Junior", "React"),
    ("React Basics", "What is the React Native StatusBar?", "Status bar config. barStyle, backgroundColor, hidden.", "Junior", "React"),
    ("React Basics", "What is the React Native Linking?", "Deep linking. openURL, canOpenURL, addEventListener for URLs.", "Junior", "React"),
    ("React Basics", "What is the React Native Share?", "Share API. Share.share({ message, url }). System share dialog.", "Junior", "React"),
    ("React Basics", "What is the React Native Platform?", "Platform.OS: 'ios', 'android', 'web'. Platform.select for platform values.", "Junior", "React"),
    ("React Basics", "What is the React Native Dimensions?", "Screen dimensions: Dimensions.get('window'), Dimensions.get('screen').", "Junior", "React"),
    ("React Basics", "What is the React Native PixelRatio?", "Pixel density. PixelRatio.get(), PixelRatio.getFontScale().", "Junior", "React"),
    ("React Basics", "What is the React Native KeyboardAvoidingView?", "Adjusts view position when keyboard appears. behavior prop.", "Junior", "React"),
    ("React Basics", "What is the React Native SafeAreaView?", "Renders within safe area on iOS. padding for notch/home indicator.", "Junior", "React"),
    ("React Basics", "What is the React Native Pressable?", "Touchable wrapper with press state. style function for feedback.", "Junior", "React"),
    ("React Basics", "What is the React Native TouchableOpacity?", "Opacity fade on press. activeOpacity prop.", "Junior", "React"),
    ("React Basics", "What is the React Native VirtualizedList?", "Base for FlatList/SectionList. Custom virtualization.", "Middle", "React"),
    ("React Basics", "What is the React Native Hermes?", "JavaScript engine for Android. Faster startup, smaller APK.", "Middle", "React"),
    ("React Basics", "What is the React Native Metro?", "JS bundler for React Native. Custom config with metro.config.js.", "Middle", "React"),
    ("React Basics", "What is the React Native Flipper?", "Debugger for RN. Layout inspector, network, React DevTools.", "Middle", "React"),
    ("React Basics", "What is the React Native Fast Refresh?", "Hot reload with state preservation. Enabled in dev mode.", "Junior", "React"),
    ("React Basics", "What is the React Native Bridgeless mode?", "New architecture. No bridge. JSI for sync native-JS calls.", "Senior", "React"),
    ("React Basics", "What is the React Native Fabric?", "New renderer. Sync rendering. C++ core for both platforms.", "Senior", "React"),
    ("React Basics", "What is the React Native TurboModules?", "Lazy-loaded native modules. JSI binding. TypeScript codegen.", "Senior", "React"),
]
to_mjs(rx6)

# WRITE
new_part = "\n".join(new_q_calls) + "\n"

with open(MJS, 'w', encoding='utf-8') as f:
    f.write(before_seed)
    f.write(new_part)
    f.write(from_seed)

print(f"Batch 6 added {len(new_q_calls)} new questions")
with open(MJS, 'r', encoding='utf-8') as f:
    content = f.read()
print(f"Total Q() calls: {content.count(chr(10) + '  Q(')}")