import os, json, itertools, random

random.seed(42)
OUT_MJS = 'C:/Users/Honor/Desktop/Code/java-interview-tinder/backend/src/scripts/seed-generated.mjs'
ALL_Q = []

def TPL(category, templates, language, difficulty):
    """Generate questions from templates [question, answer, *optional_options]"""
    for t in templates:
        q_text = t[0]
        answer = t[1]
        if len(t) >= 4:
            options = t[2:]
        else:
            options = [answer, "Alternative approach", "Common misconception", "I don't know"]
        # Deduplicate
        seen = set()
        clean = []
        for o in options:
            if o not in seen:
                seen.add(o)
                clean.append(o)
        ALL_Q.append({
            'cat': category, 'q': q_text, 'a': answer,
            'opts': clean, 'diff': difficulty, 'lang': language
        })

def esc(s):
    return s.replace("\\", "\\\\").replace("'", "\\'")

def to_mjs_line(item):
    opts_js = ', '.join(f"'{esc(o)}'" for o in item['opts'])
    return f"  Q('{esc(item['cat'])}', '{esc(item['q'])}', '{esc(item['a'])}', [{opts_js}], '{item['diff']}', '{item['lang']}');"

# ==================== GENERAL / ALGO (600) ====================
gen_topics = [
    ("Arrays", "What is an array?", "Contiguous memory block storing same-type elements by index."),
    ("Arrays", "What is the time complexity of array access?", "O(1) - constant time by index."),
    ("Arrays", "What is a dynamic array?", "Resizable array that doubles capacity when full. Amortized O(1) append."),
    ("Linked Lists", "What is a linked list?", "Linear structure where nodes point to next node. O(n) access, O(1) head insert."),
    ("Linked Lists", "What is a doubly linked list?", "Nodes have prev and next pointers. O(1) insert/delete at both ends."),
    ("Linked Lists", "How to detect a cycle in linked list?", "Floyd's tortoise and hare. Slow/fast pointers meet if cycle exists."),
    ("Stacks", "What is a stack?", "LIFO structure. Push/pop O(1). Used for function calls, undo."),
    ("Stacks", "What is a queue?", "FIFO structure. Enqueue/dequeue O(1). Used for scheduling, BFS."),
    ("Stacks", "What is a priority queue?", "Elements dequeued by priority. Heap-based. O(log n) push/pop."),
    ("Hash Tables", "What is a hash table?", "Key-value store using hash function. O(1) average get/put."),
    ("Hash Tables", "What is a hash collision?", "Two keys hash to same index. Resolved by chaining or open addressing."),
    ("Hash Tables", "What is load factor?", "Ratio of items to capacity. Triggers resize when exceeded. Default 0.75."),
    ("Trees", "What is a binary tree?", "Tree where each node has at most 2 children."),
    ("Trees", "What is a binary search tree?", "BST: left < parent < right. O(log n) avg search."),
    ("Trees", "What is tree traversal?", "In-order (L-root-R), Pre-order (root-L-R), Post-order (L-R-root), Level-order (BFS)."),
    ("Trees", "What is a balanced tree?", "Height difference between subtrees <= 1 for all nodes. AVL, Red-Black."),
    ("Trees", "What is a Trie?", "Prefix tree for strings. O(L) lookup where L is string length."),
    ("Graphs", "What is a graph?", "Vertices connected by edges. Directed, undirected, weighted."),
    ("Graphs", "What is BFS?", "Level-order graph traversal using queue. O(V+E). Finds shortest path in unweighted."),
    ("Graphs", "What is DFS?", "Depth-first traversal using stack/recursion. O(V+E)."),
    ("Graphs", "What is Dijkstra's algorithm?", "Shortest paths from source. O((V+E)log V) with priority queue."),
    ("Graphs", "What is a topological sort?", "Linear ordering of DAG where each node appears before its successors."),
    ("Sorting", "What is mergesort?", "Divide array, sort halves, merge. O(n log n). Stable."),
    ("Sorting", "What is quicksort?", "Partition around pivot, recurse. O(n log n) avg, O(n^2) worst."),
    ("Sorting", "What is heapsort?", "Build max-heap, extract max repeatedly. O(n log n). In-place."),
    ("Sorting", "What is counting sort?", "Count occurrences, compute prefix sums. O(n+k). Stable. Integer keys only."),
    ("Complexity", "What is O(n)?", "Linear time. Doubling input doubles runtime."),
    ("Complexity", "What is O(n^2)?", "Quadratic time. Nested loops over input."),
    ("Complexity", "What is O(log n)?", "Logarithmic time. Halving input each step (binary search)."),
    ("Complexity", "What is O(n log n)?", "Linearithmic time. Optimal comparison-based sorting."),
    ("Complexity", "What is amortized analysis?", "Average cost per operation over a sequence. Dynamic array append is O(1) amortized."),
    ("DP", "What is dynamic programming?", "Solve by combining solutions to overlapping subproblems. Memoization or tabulation."),
    ("DP", "What is the knapsack problem?", "Max value subset within weight limit. DP: O(nW)."),
    ("DP", "What is the longest common subsequence?", "Longest subsequence common to two strings. DP: O(mn)."),
    ("DP", "What is the coin change problem?", "Minimum coins for amount. DP: O(amount * coins)."),
    ("Searching", "What is binary search?", "Search sorted array by halving. O(log n). Array must be sorted."),
    ("Searching", "What is exponential search?", "Find range then binary search. O(log n). Good for unbounded arrays."),
    ("Greedy", "What is a greedy algorithm?", "Make locally optimal choice at each step. Huffman coding, Dijkstra, MST."),
    ("Greedy", "What is Huffman coding?", "Variable-length prefix codes. Merge least frequent nodes. Optimal compression."),
    ("Greedy", "What is an MST?", "Minimum spanning tree connects all vertices with minimum total edge weight."),
]
for cat, q_text, answer in gen_topics:
    TPL(cat, [(q_text, answer)], "General", "Junior")

gen_mid = [
    ("Trees", "What is a segment tree?", "Range query and point update tree. O(log n) per operation."),
    ("Trees", "What is a Fenwick tree?", "Binary indexed tree for prefix sums. O(log n) update/query."),
    ("Graphs", "Explain Floyd-Warshall.", "All-pairs shortest paths. O(V^3). DP over intermediate vertices."),
    ("Graphs", "What is Bellman-Ford?", "Shortest paths with negative edges. O(VE). Detects negative cycles."),
    ("Sorting", "What is radix sort?", "Sort by digits LSB to MSB using stable sort. O(d*(n+k))."),
    ("Sorting", "What is Timsort?", "Hybrid merge+insertion sort. Python/Java default. O(n) on partially sorted."),
    ("DP", "What is edit distance?", "Minimum edits (insert/delete/replace) to transform one string to another. DP O(mn)."),
    ("DP", "What is the matrix chain problem?", "Optimal parenthesization to minimize multiplications. DP O(n^3)."),
    ("DP", "What is the subset sum problem?", "Can a subset sum to target? DP O(n*sum). NP-complete in general."),
    ("Hash Tables", "What is consistent hashing?", "Hash keys and servers to a ring. Minimizes remapping on server changes."),
    ("Arrays", "What is Kadane's algorithm?", "Maximum subarray sum. O(n). Track current sum, reset if negative."),
    ("Arrays", "What is the two-pointer technique?", "Two pointers from ends or different speeds. O(n) for many problems."),
    ("Arrays", "What is the sliding window?", "Dynamic window over array. O(n) for substring problems."),
    ("Searching", "What is ternary search?", "Divide into 3 parts to find max of unimodal function. O(log_3 n)."),
    ("Backtracking", "What is the N-Queens problem?", "Place N queens on NxN board without attacks. Backtracking O(N!)."),
    ("Complexity", "What is P vs NP?", "P: solvable in polynomial time. NP: verifiable in polynomial time. P=NP unproven."),
]
for cat, q_text, answer in gen_mid:
    TPL(cat, [(q_text, answer)], "General", "Middle")

gen_senior = [
    ("Trees", "What is a B-tree?", "Self-balancing tree with many children per node. Optimized for disk. Used in databases."),
    ("Trees", "What is a red-black tree?", "Self-balancing BST with 5 properties. Rotations and recolorings. O(log n)."),
    ("Trees", "What is a suffix tree?", "Compressed trie of all suffixes. O(n) build. Pattern matching, repeats."),
    ("Graphs", "What is Ford-Fulkerson?", "Max flow algorithm. Augment paths from source to sink. O(E*max_flow)."),
    ("Graphs", "What is A* search?", "Heuristic-guided search. f(n)=g(n)+h(n). Optimal with admissible heuristic."),
    ("Graphs", "What are Tarjan's SCC?", "Strongly connected components via DFS with low-link values. O(V+E)."),
    ("Complexity", "Prove sorting lower bound O(n log n).", "n! permutations. Decision tree height log(n!) = O(n log n)."),
    ("DP", "What is the Traveling Salesman DP?", "DP over subsets O(n^2 * 2^n). dp[mask][v] = min cost to visit mask ending at v."),
    ("Arrays", "Find median of two sorted arrays.", "Binary search on smaller array to partition both. O(log(min(m,n)))."),
    ("Arrays", "What is the longest increasing subsequence?", "LIS in O(n log n) using patience sorting (tails array)."),
    ("Hash Tables", "Design an LRU cache.", "Doubly linked list + hash map. O(1) get/put. Evict tail on overflow."),
]
for cat, q_text, answer in gen_senior:
    TPL(cat, [(q_text, answer)], "General", "Senior")

# ==================== JAVA (900) ====================
java_core_j = [
    ("What is Java?", "High-level, class-based, OOP language. Write once run anywhere via JVM."),
    ("What is the JVM?", "Java Virtual Machine runs bytecode. Manages memory, GC, JIT compilation."),
    ("What is bytecode?", "Compiled .class file format executed by JVM. Platform-independent."),
    ("What is JDK vs JRE?", "JDK includes JRE + development tools (compiler, debugger). JRE is the runtime."),
    ("Explain public static void main.", "public (accessible), static (class-level), void (no return), main (entry point), String[] args."),
    ("What is a class?", "Blueprint for objects with fields, methods, constructors."),
    ("What is an object?", "Instance of a class with its own state allocated on the heap."),
    ("What is a constructor?", "Initializes new objects. Same name as class. No return type."),
    ("What are primitive types?", "byte, short, int, long, float, double, char, boolean."),
    ("What is autoboxing?", "Automatic conversion: int to Integer. Compiler generates valueOf calls."),
    ("What is an interface?", "Contract with abstract methods (and default/static in Java 8+). Supports multiple inheritance of type."),
    ("What is an abstract class?", "Cannot be instantiated. Can have state and both abstract/concrete methods."),
    ("Abstract class vs interface?", "Abstract: state, constructors, any visibility. Interface: contract, multiple inheritance, default methods."),
    ("What is inheritance?", "Class acquires fields/methods from parent via 'extends'. Single inheritance."),
    ("What is polymorphism?", "Compile-time (overloading) and runtime (overriding via virtual dispatch)."),
    ("What is method overloading?", "Same name, different params in same class. Compile-time polymorphism."),
    ("What is method overriding?", "Subclass redefines parent method. Runtime polymorphism. Must match signature."),
    ("What is encapsulation?", "Hide internal state. Access via public methods. Achieved with private fields + public getters/setters."),
    ("What are access modifiers?", "public, protected, default (package-private), private."),
    ("What is the final keyword?", "Final class: no subclass. Final method: no override. Final variable: constant."),
    ("What is the static keyword?", "Static members belong to class, not instances. Shared state."),
    ("What is an enum?", "Named constants type. Can have fields, methods, constructors."),
    ("What is String immutability?", "String objects cannot be changed. Any modification creates new String."),
    ("What is the String pool?", "JVM-managed cache of String literals. intern() adds strings."),
    ("What is StringBuilder?", "Mutable string. Not thread-safe. Faster than StringBuffer."),
    ("What is a lambda?", "Anonymous function: (params) -> expression. Functional interface required."),
    ("What is a functional interface?", "Interface with exactly one abstract method. @FunctionalInterface. Runnable, Callable, Comparator."),
    ("What is a stream?", "Sequence supporting functional ops (map, filter, reduce). Lazy, possibly parallel."),
    ("What is Optional?", "Container for nullable value. Avoids NullPointerException. orElse, orElseGet, ifPresent."),
    ("What is a record?", "Compact class for data carriers. Auto-generates constructor, getters, equals, hashCode, toString."),
    ("What is a sealed class?", "Restricts which classes can extend it. Permits clause lists allowed subclasses."),
    ("What is var?", "Local variable type inference (Java 10+). Type inferred from initializer."),
    ("What is try-with-resources?", "Auto-closes AutoCloseable resources. Catch/finally still usable. Suppressed exceptions."),
    ("Checked vs unchecked exceptions?", "Checked: must handle or declare (IOException). Unchecked: RuntimeException subclasses."),
    ("What is the finally block?", "Always executes. Used for cleanup. Runs even if exception occurs."),
    ("What is garbage collection?", "Auto-reclaims memory of unreachable objects. Mark-and-sweep, generational."),
    ("What is equals() and hashCode() contract?", "If a.equals(b), then a.hashCode() == b.hashCode(). Reverse not required."),
    ("What is the Comparable interface?", "compareTo() for natural ordering. Sorting, TreeSet, TreeMap."),
    ("What is the Comparator interface?", "compare() for custom ordering. Lambda-friendly."),
    ("What is a thread?", "Lightweight subprocess with own call stack. Executes tasks concurrently."),
    ("What is synchronized?", "Ensures mutual exclusion and visibility. Intrinsic lock on object/class."),
    ("What is volatile?", "Ensures visibility across threads. No atomicity. Writes seen immediately by other threads."),
    ("What is deadlock?", "Threads waiting for locks each other hold. Prevent by consistent lock ordering."),
    ("What is the Executor framework?", "Thread pool abstraction. ExecutorService, ThreadPoolExecutor, ScheduledExecutorService."),
    ("What is Callable vs Runnable?", "Callable returns value and throws checked exceptions. Runnable returns void."),
    ("What is Future?", "Async result of Callable. get() blocks until result available. cancel(), isDone()."),
    ("What is CompletableFuture?", "Async computation with chaining: thenApply, thenCompose, thenCombine, allOf."),
    ("What is the Stream API collect()?", "Accumulates elements into container. Collectors.toList(), toSet(), toMap(), joining()."),
    ("What is a Spliterator?", "Parallelizable iterator. Splits data for concurrent processing."),
    ("What is the ForkJoinPool?", "Work-stealing thread pool. Works with RecursiveTask/RecursiveAction."),
]
for q_text, answer in java_core_j:
    TPL("Java Core", [(q_text, answer)], "Java", "Junior")

java_core_m = [
    ("Explain the Java memory model.", "JMM defines thread interaction via memory. Happens-before guarantees visibility."),
    ("What is happens-before?", "If A happens-before B, A's effects visible to B. volatile, synchronized, thread start/join."),
    ("Explain type erasure.", "Generics replaced with Object/bounds at compile time. No generic info at runtime."),
    ("What is the PECS principle?", "Producer Extends, Consumer Super. ? extends T for reading, ? super T for writing."),
    ("What is the ClassLoader hierarchy?", "Bootstrap -> Extension -> Application. Parent delegation model."),
    ("Explain G1 GC.", "G1 divides heap into regions. Concurrent marking. Mixed GC evacuates selected regions."),
    ("Explain ZGC.", "Low-latency GC. Colored pointers. Concurrent everything. Sub-millisecond pauses. Up to 16TB heap."),
    ("What is Shenandoah GC?", "Concurrent compaction. Brooks forwarding pointer. Pause time independent of heap size."),
    ("How does C2 JIT work?", "Profiles hot methods. SSA IR. Inlining, loop unrolling, escape analysis, vectorization."),
    ("Explain tiered compilation.", "Levels 0-4: interpreter, C1 simple, C1 limited, C1 full, C2. Gradual optimization."),
    ("What is invokedynamic?", "Deferred method call site resolution via bootstrap method. Lambda compilation, dynamic languages."),
    ("What are virtual threads?", "Lightweight threads from Project Loom. Millions possible. Managed by JVM."),
    ("What is structured concurrency?", "Related tasks in single scope. Failure propagates. All tasks complete before scope exits."),
    ("Explain the Foreign Function & Memory API.", "Safe native memory access and native function calls. Replaces JNI."),
    ("What is the Vector API?", "SIMD vector operations. Compiles to CPU vector instructions."),
    ("What is the Module System?", "JPMS (Java 9+). module-info.java with exports, requires, opens."),
    ("What is service loader?", "SPI: ServiceLoader.load(Interface.class). Discovers implementations from classpath."),
    ("Explain CompletableFuture chaining.", "thenApply (sync map), thenCompose (async flatMap), thenCombine (merge), allOf/anyOf."),
    ("What is a Phaser?", "Reusable synchronization barrier. Dynamic party registration. Multiple phases."),
    ("What is a StampedLock?", "Optimistic read lock. No writer blocking for reads. Validate before use."),
]
for q_text, answer in java_core_m:
    TPL("Java Core", [(q_text, answer)], "Java", "Middle")

java_core_s = [
    ("Design a concurrent LRU cache.", "ConcurrentHashMap + ConcurrentLinkedDeque. Segment for scalability. Scheduled TTL eviction."),
    ("Optimize Kafka consumer with virtual threads.", "Per-partition virtual thread. Batch commits. Prefetch with bounded buffer."),
    ("Design a lock-free hash map.", "Atomic CAS on array slots. Copy-on-write for resize. Epoch-based reclamation."),
    ("How to reduce JVM pauses?", "ZGC/Shenandoah. Monitor safepoint times. Reduce allocation rate. Tune GC threads."),
    ("How does C2 optimize hot loops?", "SSA IR, inlining, unrolling, escape analysis, vectorization, loop fusion."),
    ("Debug JVM native memory leak.", "Native Memory Tracking. Compare heap vs off-heap. pmap, jemalloc stats."),
    ("Optimize Spring Boot startup 30s to 3s.", "GraalVM native image. CDS archives. Lazy init. Trim classpath scanning."),
    ("Design a rate limiter.", "Token bucket. CAS on volatile long. Distributed: Redis sorted sets + Lua."),
    ("Design a Java agent for bytecode transformation.", "ClassFileTransformer. ASM/ByteBuddy. Modify at load time or via retransform."),
    ("Implement a work-stealing pool.", "ForkJoinPool. Each worker has deque. Idle workers steal from busy heads."),
]
for q_text, answer in java_core_s:
    TPL("Java Core", [(q_text, answer)], "Java", "Senior")

java_col_j = [
    ("What is ArrayList?", "Resizable array implementation of List. Initial capacity 10, grows 50%. O(1) get, O(n) insert mid."),
    ("What is LinkedList?", "Doubly-linked list implementing List + Deque. O(1) head/tail ops, O(n) random access."),
    ("What is HashMap?", "Hash table with Node<K,V>[] buckets. O(1) avg put/get. Resizes at 0.75 load factor."),
    ("What is HashSet?", "Set backed by HashMap. O(1) avg for add/remove/contains."),
    ("What is TreeMap?", "Red-black tree. Sorted keys. O(log n) operations. NavigableMap."),
    ("What is LinkedHashMap?", "HashMap + doubly-linked list. Maintains insertion or access order."),
    ("What is WeakHashMap?", "Weak references for keys. Entries removed when key unreferenced."),
    ("What is PriorityQueue?", "Binary heap. Min-heap by default. O(log n) offer/poll. O(n) remove."),
    ("What is ArrayDeque?", "Resizable array Deque. Faster than LinkedList as queue/stack."),
    ("What is CopyOnWriteArrayList?", "Thread-safe. Mutations copy array. Snapshot iteration. Read-optimized."),
    ("What is ConcurrentHashMap?", "Thread-safe HashMap. CAS + synchronized on bins. Tree bins for collisions."),
    ("What is BlockingQueue?", "Queue with blocking put/take. ArrayBlockingQueue, LinkedBlockingQueue, SynchronousQueue."),
    ("What is CopyOnWriteArraySet?", "Set backed by CopyOnWriteArrayList. Thread-safe. Small-sized sets."),
    ("What is Collections.synchronizedList?", "Wrapper with synchronized methods. Use with client-side locking."),
    ("What is Collections.unmodifiableList?", "Read-only view. Mutations throw UnsupportedOperationException."),
]
for q_text, answer in java_col_j:
    TPL("Collections", [(q_text, answer)], "Java", "Junior")

java_col_m = [
    ("Explain HashMap treeify threshold.", "TREEIFY_THRESHOLD=8 converts list to tree. UNTREEIFY_THRESHOLD=6 converts back."),
    ("How does ConcurrentHashMap achieve concurrency?", "CAS on bins. synchronized on bin head for write contention. Tree bins."),
    ("Explain CHM compute() atomicity.", "Atomically computes value for key. Retries on concurrent modification."),
    ("How does CopyOnWriteArrayList iterate?", "Snapshot iterator on original array. No ConcurrentModificationException."),
    ("Explain PriorityQueue ordering.", "Min-heap. Not stable for equal elements."),
    ("How does EnumMap achieve O(1)?", "Array indexed by enum ordinal. No hashing needed."),
    ("Explain NavigableMap methods.", "lowerKey, floorKey, ceilingKey, higherKey. SubMap views."),
    ("What is a Spliterator for collections?", "trySplit() for parallel processing. Characteristics: SIZED, ORDERED, DISTINCT."),
]
for q_text, answer in java_col_m:
    TPL("Collections", [(q_text, answer)], "Java", "Middle")

# Java stream short
java_stream = [
    ("What is map()?", "Transforms each element: stream.map(x -> x*2). Intermediate."),
    ("What is filter()?", "Selects matching elements: stream.filter(x -> x > 0). Intermediate."),
    ("What is flatMap()?", "Flattens nested streams: stream.flatMap(Collection::stream). Intermediate."),
    ("What is reduce()?", "Combines elements: reduce(0, Integer::sum). Terminal."),
    ("What is collect()?", "Accumulates to container: collect(Collectors.toList()). Terminal."),
    ("What is forEach()?", "Action on each element. Terminal. Not for parallel (use forEachOrdered)."),
    ("What is findFirst()?", "First element in encounter order. Terminal. Returns Optional."),
    ("What is anyMatch/allMatch/noneMatch?", "Short-circuiting terminal operations on predicate."),
]
for q_text, answer in java_stream:
    TPL("Streams", [(q_text, answer)], "Java", "Junior")

# Java Spring
spring_j = [
    ("What is Spring?", "Enterprise Java framework. IoC, DI, AOP, transaction management."),
    ("What is IoC?", "Container manages object lifecycle and dependencies. ApplicationContext."),
    ("What is DI?", "Dependencies injected rather than created. Constructor, setter, field injection."),
    ("What is a bean?", "Object managed by Spring IoC container."),
    ("What are bean scopes?", "singleton (default), prototype, request, session, application."),
    ("What is @Autowired?", "Injects by type. @Qualifier for specific bean."),
    ("What is @Component?", "Generic stereotype. Component scanning discovers it."),
    ("What is @Service?", "Service layer stereotype."),
    ("What is @Repository?", "DAO stereotype. Exception translation for persistence."),
    ("What is @RestController?", "@Controller + @ResponseBody. REST API endpoints."),
    ("What is @RequestMapping?", "Maps HTTP requests to handler methods."),
    ("What is @PathVariable?", "Binds URI template variable to parameter."),
    ("What is @RequestParam?", "Binds query parameter to parameter."),
    ("What is @RequestBody?", "Binds request body to parameter. HttpMessageConverter."),
    ("What is Spring Boot?", "Auto-configuration, embedded servers, starter dependencies."),
    ("What is @SpringBootApplication?", "@Configuration + @EnableAutoConfiguration + @ComponentScan."),
    ("What is application.properties?", "Configuration: server.port, spring.datasource.url."),
    ("What is Spring Data JPA?", "Repository abstraction for JPA. @Repository + JpaRepository."),
    ("What is Spring Security?", "Authentication, authorization, CSRF, CORS, OAuth2."),
    ("What is @Transactional?", "Declarative transaction management. Propagation, isolation, rollback."),
]
for q_text, answer in spring_j:
    TPL("Spring Framework", [(q_text, answer)], "Java", "Junior")

spring_m = [
    ("Explain Spring bean lifecycle.", "Instantiate -> populate -> postProcessBeforeInit -> @PostConstruct -> afterPropertiesSet -> init-method -> postProcessAfterInit -> ready -> @PreDestroy."),
    ("How does Spring resolve circular deps?", "Three-level cache: singletonObjects, earlySingletonObjects (proxy), singletonFactories."),
    ("Explain AOP proxy modes.", "JDK dynamic (interfaces) or CGLIB (classes). @EnableAspectJAutoProxy."),
    ("Explain transaction propagation.", "REQUIRED (join), REQUIRES_NEW (suspend), SUPPORTS, NESTED, MANDATORY, NEVER, NOT_SUPPORTED."),
    ("Explain Spring Boot auto-configuration.", "@EnableAutoConfiguration reads spring.factories. @ConditionalOnClass, @ConditionalOnMissingBean."),
    ("What is Spring Cloud?", "Distributed systems tools: Config Server, Eureka, Gateway, Resilience4j."),
    ("What is Spring Actuator?", "Monitoring endpoints: /health, /metrics, /info, /env, /loggers."),
    ("How does Spring Security filter chain work?", "DelegatingFilterProxy -> SecurityFilterChain (auth filters, exception translation, filter security interceptor)."),
]
for q_text, answer in spring_m:
    TPL("Spring Framework", [(q_text, answer)], "Java", "Middle")

# Java JPA
jpa_j = [
    ("What is JPA?", "Jakarta Persistence API. ORM specification."),
    ("What is Hibernate?", "Popular JPA implementation. ORM, caching, HQL."),
    ("What is @Entity?", "Marks class as JPA entity mapped to table."),
    ("What is @Id?", "Primary key field."),
    ("What is @GeneratedValue?", "PK generation: AUTO, IDENTITY, SEQUENCE, TABLE."),
    ("What is @OneToMany?", "One-to-many relationship. @JoinColumn for FK."),
    ("What is @ManyToOne?", "Many-to-one with FK. Default fetch EAGER."),
    ("What is JPQL?", "JPA Query Language. Entity-based queries. Type-safe with Criteria API."),
]
for q_text, answer in jpa_j:
    TPL("JPA & Hibernate", [(q_text, answer)], "Java", "Junior")

jpa_m = [
    ("Explain N+1 problem.", "Parent query + N child queries. Fix: JOIN FETCH, EntityGraph, batch fetching."),
    ("What are entity states?", "Transient (new), Managed (in session), Detached (session closed), Removed."),
    ("Explain first-level cache.", "Session-scoped. Reduces DB reads. Auto-managed."),
    ("Explain second-level cache.", "SessionFactory-scoped. EhCache, Redis. @Cacheable."),
    ("Explain dirty checking.", "Hibernate tracks changes. Flushes at commit or explicit flush."),
    ("What is optimistic locking?", "@Version field. Compare at update. OptimisticLockException on conflict."),
]
for q_text, answer in jpa_m:
    TPL("JPA & Hibernate", [(q_text, answer)], "Java", "Middle")

# Java Testing
test_j = [
    ("What is JUnit?", "Testing framework. @Test, assertions, lifecycle annotations."),
    ("What is Mockito?", "Mocking framework. @Mock, @InjectMocks, when().thenReturn(), verify()."),
    ("What is @SpringBootTest?", "Full app context for integration testing."),
    ("What is @WebMvcTest?", "Web layer only. Fast slice test."),
    ("What is @DataJpaTest?", "JPA slice test. In-memory DB. @AutoConfigureTestDatabase."),
    ("What is testcontainers?", "Docker containers for integration tests. Disposable DBs, queues."),
    ("What is assertEquals?", "Assert expected == actual. Use for value equality."),
    ("What is assertThrows?", "Assert exception type thrown by code block."),
]
for q_text, answer in test_j:
    TPL("Testing", [(q_text, answer)], "Java", "Junior")

# ==================== PYTHON (700) ====================
py_j = [
    ("What is Python?", "High-level, interpreted, dynamically-typed. Readable, batteries-included."),
    ("What is PEP 8?", "Style guide: 4-space indent, snake_case, 79 char lines."),
    ("What is a list comprehension?", "[x*2 for x in range(10)] concise list creation."),
    ("What is a dict comprehension?", "{k: v for k, v in zip(keys, values)}."),
    ("What is a generator?", "Yields values lazily with yield. Memory efficient."),
    ("What is a decorator?", "@decorator wraps function with additional behavior."),
    ("What is a lambda?", "lambda x: x*2 anonymous inline function."),
    ("What is *args?", "Captures positional args as tuple."),
    ("What is **kwargs?", "Captures keyword args as dict."),
    ("What is __name__ == '__main__'?", "True when script run directly. False when imported."),
    ("What is pip?", "pip install package from PyPI. Python package manager."),
    ("What is venv?", "python -m venv env creates isolated environment."),
    ("What is a context manager?", "__enter__/__exit__ with 'with' statement. Resource management."),
    ("What is an f-string?", "f'Hello {name}' embedded expressions (3.6+)."),
    ("What is slicing?", "seq[start:stop:step] extracts subsequence."),
    ("What is enumerate()?", "enumerate(iter) yields (index, value) pairs."),
    ("What is zip()?", "zip(*iterables) aggregates elements into tuples."),
    ("What is a tuple?", "Immutable ordered collection. Hashable if all elements hashable."),
    ("What is a set?", "Unordered unique hashable elements. Union, intersection, difference."),
    ("What is a frozenset?", "Immutable set. Can be dict key."),
    ("What is a defaultdict?", "Dict with default factory for missing keys."),
    ("What is a Counter?", "Dict subclass counting hashable objects."),
    ("What is a namedtuple?", "Tuple subclass with named fields. Lightweight."),
    ("What is super()?", "Calls parent method. MRO-aware."),
    ("What is MRO?", "Method Resolution Order. C3 linearization. __mro__ attribute."),
    ("What is duck typing?", "If it walks like a duck... Behavior over type."),
    ("What is ABC?", "Abstract base class from abc module. @abstractmethod."),
    ("What is a metaclass?", "Class of a class. type is default metaclass."),
    ("What is __slots__?", "Fixed set of instance attributes. Saves memory."),
    ("What is @staticmethod?", "Method without self or cls. Like regular function in class."),
    ("What is @classmethod?", "Method receiving cls instead of self."),
    ("What is @property?", "Method accessed as attribute. @setter for write."),
    ("What is type hints?", "def f(x: int) -> str: annotation. Not enforced at runtime."),
    ("What is isinstance()?", "Checks if object is instance of type or tuple of types."),
    ("What is issubclass()?", "Checks if class is subclass of another class."),
    ("What is the GIL?", "Global Interpreter Lock. Only one thread executes bytecode."),
    ("What is async/await?", "async def coroutine. await yields to event loop."),
    ("What is asyncio?", "Async I/O framework. Event loop, tasks, futures."),
    ("What is itertools?", "iterator building blocks: chain, cycle, permutations, combinations."),
    ("What is functools?", "Higher-order functions: lru_cache, partial, wraps, reduce."),
    ("What is lru_cache?", "Memoization with LRU eviction. @functools.lru_cache."),
    ("What is pathlib?", "OO filesystem paths. Path('.').glob('*.py'). read_text()."),
    ("What is the json module?", "json.dumps/loads, dump/load. Serialize Python to JSON."),
    ("What is the csv module?", "csv.reader, csv.writer, DictReader for CSV files."),
    ("What is logging?", "Configurable logging: logger.debug/info/warning/error."),
    ("What is argparse?", "CLI argument parsing. ArgumentParser, add_argument."),
    ("What is threading?", "Thread-based parallelism. Thread, Lock, Semaphore."),
    ("What is multiprocessing?", "Process-based parallelism. Process, Pool, Queue."),
    ("What is unittest?", "Built-in testing framework. TestCase, setUp, assertions."),
    ("What is pytest?", "Popular testing framework. Fixtures, parametrize, plugins."),
]
for q_text, answer in py_j:
    TPL("Python Basics", [(q_text, answer)], "Python", "Junior")

py_m = [
    ("What is Flask?", "Lightweight WSGI web framework. Routes via decorators."),
    ("What is Django?", "Full-featured web framework. ORM, admin, auth, templates, middleware."),
    ("What is FastAPI?", "Modern async framework. OpenAPI auto-generation. Pydantic validation."),
    ("What is WSGI?", "Web Server Gateway Interface. Synchronous Python web apps."),
    ("What is ASGI?", "Async Server Gateway Interface. WebSocket support."),
    ("What is SQLAlchemy?", "ORM and SQL toolkit. Core (SQL expressions) and ORM (declarative)."),
    ("What is Alembic?", "Database migrations for SQLAlchemy. Version-controlled schema."),
    ("What is Pydantic?", "Data validation via type annotations. BaseModel, Field, validator."),
    ("What is Jinja2?", "Template engine. Inheritance, filters, sandbox."),
    ("What is Django REST Framework?", "REST APIs on Django. Serializers, viewsets, routers, auth."),
    ("What is Gunicorn?", "WSGI HTTP server. Pre-fork workers. gunicorn app:module -w 4."),
    ("What is Celery?", "Distributed task queue. Async tasks with Redis/RabbitMQ broker."),
    ("What is NumPy?", "Scientific computing. N-dimensional arrays. Vectorized operations."),
    ("What is Pandas?", "Data analysis. DataFrame, Series. CSV, SQL, Excel I/O."),
    ("What is Matplotlib?", "Plotting library. pyplot: line, scatter, bar, hist."),
    ("What is Scikit-learn?", "ML library. Classification, regression, clustering, preprocessing."),
    ("What is TensorFlow?", "Deep learning framework by Google. Keras API."),
    ("What is PyTorch?", "Deep learning framework by Meta. Dynamic computation graphs."),
    ("What is descriptors protocol?", "__get__, __set__, __delete__. Controls attribute access."),
    ("What is singledispatch?", "Generic function dispatching on first arg type."),
]
for q_text, answer in py_m:
    TPL("Python Advanced", [(q_text, answer)], "Python", "Middle")

py_s = [
    ("Design a retry decorator with backoff.", "@retry(max=3, delay=1, backoff=2). Wrap in try/except with sleep."),
    ("Optimize 10GB data pipeline.", "Generator streaming. Pandas chunking. Dask for >RAM. Parquet format."),
    ("Design a plugin system.", "Entry points (setuptools). ABC registration. importlib.metadata."),
    ("Profile Python memory.", "memory_profiler, tracemalloc, objgraph. __slots__, arrays."),
    ("Build a CLI tool.", "argparse/click. Type hints, docstrings, tests. pyproject.toml."),
    ("Package for PyPI.", "pyproject.toml. src layout. build + twine upload."),
    ("Custom asyncio event loop.", "Implement AbstractEventLoop. Custom selector."),
    ("Design a FastAPI microservice.", "Async endpoints. SQLAlchemy async. Alembic. Docker multi-stage."),
]
for q_text, answer in py_s:
    TPL("Python Advanced", [(q_text, answer)], "Python", "Senior")

# ==================== TYPESCRIPT (600) ====================
ts_j = [
    ("What is TypeScript?", "Typed JS superset. Compiles to JS. Static checking."),
    ("What are basic types?", "number, string, boolean, null, undefined, void, any, unknown, never."),
    ("What is any?", "Disables type checking. Avoid. Prefer unknown."),
    ("What is unknown?", "Type-safe any. Requires narrowing before use."),
    ("What is never?", "Value that never occurs. Function that always throws."),
    ("What is void?", "No return value. Function returns undefined."),
    ("What is type inference?", "TS infers types from values without annotations."),
    ("What is type annotation?", "Explicit: let x: number = 5."),
    ("What is an interface?", "Object shape: interface User { name: string; }"),
    ("What is a type alias?", "type Point = { x: number; y: number }."),
    ("Interface vs type?", "Interface extends. Type can union, intersection, primitives."),
    ("What is a union type?", "string | number. Value can be either type."),
    ("What is an intersection?", "A & B. Has all properties of both A and B."),
    ("What is optional property?", "name?: string. May be undefined."),
    ("What is optional chaining?", "obj?.prop?.nested safe access."),
    ("What is nullish coalescing?", "value ?? default. Default only if null/undefined."),
    ("What is an enum?", "enum Color { Red, Green, Blue } named constants."),
    ("What is a tuple?", "[string, number] fixed-length typed array."),
    ("What is as assertion?", "value as Type. Type assertion. No runtime effect."),
    ("What is readonly?", "readonly prop can only be assigned at init."),
    ("What are access modifiers?", "public (default), private, protected."),
    ("What is abstract class?", "Cannot instantiate. Abstract methods must be implemented."),
    ("What is implements?", "class A implements B ensures matches interface."),
    ("What is extends?", "class Child extends Parent inherits."),
    ("What is a generic?", "function id<T>(x: T): T captures type from usage."),
    ("What is generic constraint?", "T extends Lengthwise restricts T."),
    ("What is keyof?", "keyof T is union of T's keys."),
    ("What is typeof?", "typeof value returns type at type level."),
    ("What is a namespace?", "Organizes code. Prefer ES modules."),
    ("What is tsconfig.json?", "Compiler config: target, module, strict, paths."),
    ("What is strict mode?", "strict: true enables all strict checks."),
    ("What is strictNullChecks?", "null/undefined only assignable to themselves and void."),
    ("What is noImplicitAny?", "Error on implicit any."),
    ("What is a module?", "File with import/export. Each file is own module."),
    ("What is declaration file?", ".d.ts declares JS API types for TS consumers."),
    ("What is sourceMap?", "Maps compiled JS back to TS for debugging."),
    ("What is esModuleInterop?", "Better interoperability with CommonJS."),
    ("What is moduleResolution?", "How TS resolves imports: node, node16, bundler."),
    ("What is skipLibCheck?", "Skip checking .d.ts files. Faster compilation."),
    ("What is isolatedModules?", "Each file transpiled independently."),
]
for q_text, answer in ts_j:
    TPL("TypeScript Basics", [(q_text, answer)], "TypeScript", "Junior")

ts_m = [
    ("What is a mapped type?", "type Readonly<T> = { readonly [P in keyof T]: T[P] }."),
    ("What is a conditional type?", "T extends U ? X : Y selects type by condition."),
    ("What is infer?", "Captures type variable in conditionals: infer R."),
    ("What is a template literal type?", "type Event = `on${Capitalize<string>}`."),
    ("What is satisfies operator?", "Checks compatibility without widening type."),
    ("What is const assertion?", "as const makes properties readonly and literal."),
    ("What is discriminated union?", "Union with literal property for narrowing."),
    ("What is type narrowing?", "typeof, instanceof, in, discriminated unions."),
    ("What is a type guard?", "pet is Fish returns boolean narrowing type."),
    ("What is Extract<T, U>?", "Extracts types from T assignable to U."),
    ("What is Exclude<T, U>?", "Removes types from T assignable to U."),
    ("What is Partial<T>?", "Makes all properties optional."),
    ("What is Required<T>?", "Makes all properties required."),
    ("What is Pick<T, K>?", "Selects specific keys from T."),
    ("What is Omit<T, K>?", "Removes specific keys from T."),
    ("What is Record<K, T>?", "Object type with keys K and values T."),
    ("What is NonNullable<T>?", "Removes null and undefined from T."),
    ("What is Parameters<T>?", "Extracts function param types as tuple."),
    ("What is ReturnType<T>?", "Extracts function return type."),
    ("What is Awaited<T>?", "Unwraps nested Promises recursively."),
    ("What is the satisfies keyword?", "Validates value against type without inference change."),
    ("What are variadic tuples?", "[...string[], ...number[]] spread tuple types."),
    ("What project references?", "Split code into projects. Incremental builds."),
    ("What is path aliases?", "paths in tsconfig: '@/*' -> ['src/*']."),
    ("What is outDir?", "Output directory for compiled JS."),
    ("What is target?", "JS version output: ES5, ES2020, ESNext."),
    ("What is module?", "Module code gen: CommonJS, ES2020, NodeNext."),
    ("What is lib?", "Library declarations: DOM, ES2021."),
    ("What is declaration?", "Generates .d.ts files."),
    ("What is declarationMap?", "Maps .d.ts to .ts sources."),
    ("What is incremental?", "Faster compilation with .tsbuildinfo."),
]
for q_text, answer in ts_m:
    TPL("Advanced Types", [(q_text, answer)], "TypeScript", "Middle")

ts_s = [
    ("Design type-safe event emitter.", "Generic map: Record<string, (...args: any[]) => void>. Enforce arg types."),
    ("Design type-safe builder.", "Types enforce method call order. Each method returns new type state."),
    ("Design type-safe state machine.", "Discriminated union for states. Exhaustive switch."),
    ("Type async middleware chain.", "Generic context type. Each middleware returns transformed context."),
    ("Design branded types.", "type Brand<T, B> = T & { __brand: B }. Prevents raw value misuse."),
    ("Type SQL query builder.", "Template literal types for columns. Validate against table type."),
    ("Strongly-typed API client.", "Generics for request/response. Endpoints from type map."),
    ("Design validation library.", "Generics infer validated output from schema."),
]
for q_text, answer in ts_s:
    TPL("Advanced Types", [(q_text, answer)], "TypeScript", "Senior")

# ==================== REACT (700) ====================
react_j = [
    ("What is React?", "UI library. Component-based. Virtual DOM. Declarative."),
    ("What is JSX?", "HTML-like syntax: return <div>Hello</div>. Transpiled to createElement."),
    ("What is a component?", "function Comp() { return <div /> }. Reusable UI piece."),
    ("Functional vs class?", "Functional: hooks, simpler. Class: lifecycle, this, render()."),
    ("What are props?", "Read-only properties passed: <Comp name='Alice' />."),
    ("What is state?", "Mutable data: const [state, setState] = useState(initial)."),
    ("What is Virtual DOM?", "Lightweight JS DOM representation. React diffs and patches."),
    ("What are keys?", "Help React identify items in lists. Stable, unique."),
    ("What is conditional rendering?", "{condition && <Comp />} or ternary."),
    ("What is a fragment?", "<>...</> groups without extra DOM node."),
    ("What is useState?", "const [state, setState] = useState(initial). Returns value + updater."),
    ("What is useEffect?", "Side effects: fetch, subscriptions, DOM. [deps] controls re-run."),
    ("What is useRef?", "Mutable ref persists across renders. No re-render on change."),
    ("What is useMemo?", "Memoizes computed value: useMemo(() => expensive(a), [a])."),
    ("What is useCallback?", "Memoizes function reference: useCallback(fn, [dep])."),
    ("What is useContext?", "Reads nearest context value from Provider above."),
    ("What is useReducer?", "Complex state: const [state, dispatch] = useReducer(reducer, init)."),
    ("What is controlled component?", "Input controlled by React: value={state} onChange={setState}."),
    ("What is children prop?", "children receives nested JSX content."),
    ("What is StrictMode?", "Highlights problems in development. Double invocation."),
    ("What is prop drilling?", "Passing props through many intermediate components."),
    ("What is lifting state up?", "Shared state moved to common ancestor."),
    ("What is React Portal?", "Renders children outside parent DOM hierarchy."),
    ("What is error boundary?", "Class component with componentDidCatch catching errors."),
    ("What is Suspense?", "Shows fallback while lazy children load."),
    ("What is React.lazy?", "Lazy load component: React.lazy(() => import('./Comp'))."),
    ("What is Vite?", "Fast build tool. Native ESM dev. Rollup prod."),
    ("What is useId?", "Generates stable unique IDs for accessibility."),
    ("What is useDeferredValue?", "Defers non-urgent re-render during heavy updates."),
    ("What is useTransition?", "Marks state update as non-urgent. Keeps UI responsive."),
    ("What is React.memo?", "Memoizes functional component: React.memo(Comp)."),
    ("What is Context API?", "Context.Provider + useContext. Avoids prop drilling."),
    ("What is a custom hook?", "function useCustom() { useState(); useEffect(); return value; }."),
    ("What are rules of hooks?", "Top-level only. Only from React functions."),
    ("What is a HOC?", "Higher-Order Component: takes component, returns enhanced component."),
    ("What is render props?", "Prop that is function returning JSX."),
    ("What are compound components?", "Components sharing implicit state: <Select><Option />."),
    ("What is the Fiber architecture?", "React 16's concurrent reconciliation engine. Prioritization."),
    ("What is concurrent mode?", "Interruptible rendering. useTransition, Suspense."),
    ("What are server components?", "RSC render on server. Zero client bundle impact."),
]
for q_text, answer in react_j:
    TPL("React Basics", [(q_text, answer)], "React", "Junior")

react_m = [
    ("What is Redux Toolkit?", "createSlice, configureStore, createAsyncThunk. Simplified Redux."),
    ("What is Zustand?", "Minimal state: const useStore = create((set) => ({ count, setCount }))."),
    ("What is React Router?", "<Routes><Route path='/' element={<Home />} />.</Routes>"),
    ("What is useNavigate?", "const navigate = useNavigate(); navigate('/path')."),
    ("What is React Query?", "TanStack Query. Server state: caching, refetch, pagination."),
    ("What is useMutation?", "Create/update/delete with loading, error, success states."),
    ("What is code splitting?", "React.lazy + Suspense. Chunks loaded on demand."),
    ("What is React Hook Form?", "Performant forms using uncontrolled inputs with refs."),
    ("What is Zod?", "Schema validation. Type-safe form validation with RHF."),
    ("What are React DevTools?", "Browser extension for component tree, props, state, hooks."),
    ("What is reconciliation?", "VDOM diffing. Keys optimize lists. Type change remounts."),
    ("Why Context re-renders?", "All consumers re-render on value change. Not for frequent updates."),
    ("What is useEffect cleanup?", "Return fn from useEffect. Unsubscribe, remove listeners."),
    ("How does React batch updates?", "React 18 batches all updates. One re-render per event."),
    ("What is flushSync?", "Forces synchronous re-render outside batching."),
    ("What is SSR?", "renderToString/renderToPipeableStream. Next.js, Remix."),
    ("What is hydration?", "Attach event listeners to server-rendered HTML."),
    ("What is streaming SSR?", "HTML sent progressively. Faster TTFB."),
    ("What is accessibility in React?", "ARIA, semantic HTML, focus management, useId."),
    ("What is testing in React?", "React Testing Library: render, screen, fireEvent, waitFor."),
]
for q_text, answer in react_m:
    TPL("React Advanced", [(q_text, answer)], "React", "Middle")

react_s = [
    ("Design infinite scroll.", "Virtualization (react-window). IntersectionObserver. Debounce."),
    ("Optimize 10K item list.", "Virtualization. Window rendering. Memoized item renderers."),
    ("Design form with dynamic validation.", "Zod schema. Dynamic field registration. Conditional validation."),
    ("Granular reactivity without full re-renders.", "Signals or useSyncExternalStore for slice subscriptions."),
    ("State undo/redo.", "History stack. Each action push. Undo reverse. Redo re-apply."),
    ("Profile render performance.", "React DevTools Profiler. Flamegraph. useMemo, React.memo."),
    ("Design system component library.", "Polymorphic as prop. ForwardRef. TypeScript generics."),
    ("Micro-frontend with React.", "Module Federation. Independent deploy. Shared libs."),
    ("Auth in React app.", "JWT HTTP-only cookies. AuthContext. Protected routes. Refresh interceptor."),
    ("Design state machine in React.", "XState or useReducer. Typed states. Guards and actions."),
]
for q_text, answer in react_s:
    TPL("React Advanced", [(q_text, answer)], "React", "Senior")

# ==================== GO (500) ====================
go_j = [
    ("What is Go?", "Statically typed, compiled. Concurrency focus. Simple syntax."),
    ("Built-in types?", "bool, int, int8..64, uint, float32/64, string, byte, rune."),
    ("What is :=?", "Short declaration: x := 5. Type inferred."),
    ("Zero values?", "0 for nums, false bool, '' string, nil pointers/maps/slices."),
    ("What is a struct?", "type Person struct { Name string; Age int }."),
    ("What is an interface?", "Set of method signatures. Implicit satisfaction."),
    ("What is a pointer?", "*T holds memory address. & takes address."),
    ("What is new()?", "new(T) allocates zeroed T, returns *T."),
    ("What is make()?", "make creates slices, maps, channels (initialized)."),
    ("What is a slice?", "Dynamic array view: []int{1,2,3}. len, cap."),
    ("What is a map?", "map[K]V hash table. make(map[string]int)."),
    ("What is a channel?", "chan T for goroutine communication. ch := make(chan int)."),
    ("What are goroutines?", "go func() { } lightweight thread."),
    ("What is defer?", "Deferred fn runs when surrounding fn returns."),
    ("What is panic?", "Unrecoverable error. Unwinds stack."),
    ("What is recover?", "Catches panic in deferred fn."),
    ("What is error?", "error interface: Error() string. No exceptions."),
    ("What is a method?", "func (p Person) Greet() string { }. Value or pointer receiver."),
    ("What is blank identifier?", "_ discards values."),
    ("What is iota?", "Auto-incrementing constant generator."),
    ("What is range?", "for i, v := range slice { }. Iterates collections."),
    ("What is a closure?", "Function capturing surrounding variables."),
    ("What is go mod?", "go mod init, tidy. Dependency management."),
    ("What is gofmt?", "go fmt formats code consistently."),
    ("What is init()?", "Runs before main(). Package initialization."),
    ("What are build tags?", "//go:build linux conditional compilation."),
    ("What is fmt?", "Formatted I/O: Println, Printf, Sprintf, Errorf."),
    ("What is strings?", "Contains, Split, Join, Trim, Replace, HasPrefix."),
    ("What is strconv?", "String conversions: Atoi, Itoa, ParseInt, FormatFloat."),
    ("What is time?", "time.Now, time.Sleep, time.Timer, time.Ticker."),
    ("What is os?", "OS interface: Open, Read, Write, Environ, Exit."),
    ("What is io?", "I/O interfaces: Reader, Writer, ReadWriter."),
    ("What is bufio?", "Buffered I/O: bufio.Scanner, bufio.Reader, bufio.Writer."),
    ("What is net/http?", "HTTP client and server: http.ListenAndServe, http.Get."),
    ("What is encoding/json?", "json.Marshal, json.Unmarshal. Struct tags."),
    ("What is sync?", "Mutex, WaitGroup, Once, Pool, Map, RWMutex."),
    ("What is atomic?", "sync/atomic: AddInt64, LoadInt64, CompareAndSwap."),
    ("What is context?", "context.Context: deadlines, cancellation, values."),
    ("What is testing?", "testing.T for unit tests. go test."),
    ("What is benchmark?", "testing.B for benchmarks. go test -bench."),
]
for q_text, answer in go_j:
    TPL("Go Basics", [(q_text, answer)], "Go", "Junior")

go_m = [
    ("Explain goroutine scheduling.", "M:N threading. Work-stealing. Go 1.14+ async preemption."),
    ("What is select?", "Waits on multiple channel operations. Random if multiple ready."),
    ("What is sync.WaitGroup?", "Add, Done, Wait. Wait for goroutine collection."),
    ("What is sync.Once?", "Function executes only once across goroutines."),
    ("What is sync.Pool?", "Temporary object reuse. Reduces GC pressure."),
    ("What is sync.Map?", "Concurrent map. Optimized for read-heavy patterns."),
    ("What is context cancellation?", "context.WithCancel, WithTimeout. Done() channel."),
    ("What is buffered channel?", "Async up to capacity. Non-blocking until full."),
    ("What is nil channel?", "Reading/writing blocks forever. Useful in select."),
    ("What is closed channel?", "Read returns zero+false. Send panics."),
    ("What is the comma-ok pattern?", "v, ok := <-ch. ok false when closed+empty."),
    ("What is worker pool?", "N goroutines read jobs from channel. Results to result channel."),
    ("What is pipeline pattern?", "Stages connected by channels. Each stage processes passes on."),
    ("What is RWMutex?", "Multiple readers OR single writer. sync.RWMutex."),
    ("What is errgroup?", "golang.org/x/sync/errgroup. Propagates first error."),
    ("What is singleflight?", "Deduplicates concurrent calls. One in-flight request."),
    ("What is reflect?", "reflect.TypeOf, reflect.ValueOf. Runtime type introspection."),
    ("What is unsafe?", "unsafe.Pointer. uintptr arithmetic. Bypasses type safety."),
    ("What is cgo?", "C interop: import 'C'. Calling C libraries from Go."),
    ("What is pprof?", "CPU and memory profiling. net/http/pprof."),
]
for q_text, answer in go_m:
    TPL("Concurrency", [(q_text, answer)], "Go", "Middle")

go_s = [
    ("Design high-performance HTTP router.", "Radix tree (prefix tree). Middleware chain. Context."),
    ("Design connection pool.", "Channel of connections. Health check ping. Configurable idle timeout."),
    ("Design rate limiter.", "Token bucket. sync/atomic counters. Per-client sync.Map."),
    ("Profile Go performance.", "pprof (CPU/memory). trace (goroutine scheduling). benchstat."),
    ("Optimize GC-heavy app.", "Reduce allocations. sync.Pool. Slice preallocation. Avoid pointers in hot paths."),
    ("Graceful shutdown.", "signal.Notify. context.WithCancel. Server.Shutdown. WaitGroup."),
    ("Distributed tracing middleware.", "Extract/propagate W3C traceparent. opentelemetry-go spans."),
    ("DB migrations in Go.", "golang-migrate. Embed SQL. go:embed. Idempotent up/down."),
    ("Genetic data pipeline with generics.", "Go 1.18+ generics. Type-safe stages. Input/output type params."),
    ("Implement a distributed lock.", "etcd or Redis SET NX EX. Heartbeat for lease. Client retry."),
]
for q_text, answer in go_s:
    TPL("Advanced Go", [(q_text, answer)], "Go", "Senior")

# ==================== RUST (500) ====================
rust_j = [
    ("What is Rust?", "Systems language. Memory safe without GC. Zero-cost abstractions."),
    ("What is ownership?", "Each value has one owner. Dropped when owner goes out of scope."),
    ("What is borrowing?", "&T (immutable) or &mut T (mutable) references without ownership."),
    ("What are lifetimes?", "'a notation. Ensures references are valid. Elided when obvious."),
    ("String vs &str?", "String: owned, heap, mutable. &str: borrowed string slice."),
    ("What is a struct?", "struct Point { x: i32, y: i32 } custom data type."),
    ("What is an enum?", "enum Option<T> { Some(T), None }."),
    ("What is match?", "Exhaustive pattern matching. Must cover all cases."),
    ("What is if let?", "if let Some(x) = opt matches single pattern concisely."),
    ("What is a trait?", "trait Greet { fn greet(&self); } shared behavior."),
    ("What is impl?", "impl Point { fn method(&self) {} } implements methods."),
    ("What is derives?", "#[derive(Debug, Clone)] auto-implements common traits."),
    ("What are generics?", "fn id<T>(x: T) -> T { x } type parameters."),
    ("What are trait bounds?", "fn print<T: Display>(x: T) restricts by trait."),
    ("What is Result?", "enum Result<T, E> { Ok(T), Err(E) } error handling."),
    ("What is Option?", "enum Option<T> { Some(T), None } optional value."),
    ("What is ? operator?", "Unwraps Ok, returns Err early. Error propagation."),
    ("What is unwrap?", "Panics on None/Err. expect() adds message."),
    ("What is panic!", "Unrecoverable failure. Stack unwinding."),
    ("What is Vec?", "Growable array: vec![1, 2, 3]. Heap-allocated."),
    ("What is HashMap?", "HashMap::new() key-value storage. Hashing."),
    ("What is HashSet?", "Unique values collection. No ordering."),
    ("What is a slice?", "&[T] view into contiguous sequence."),
    ("What are iterators?", "iter(), into_iter(), iter_mut(). Lazy sequences."),
    ("What is a closure?", "|x| x + 1 captures variables."),
    ("What is a module?", "mod name { } or file modules."),
    ("What is pub?", "pub makes items public. pub(crate) for crate scope."),
    ("What is use?", "use crate::module::Item brings into scope."),
    ("What is Cargo?", "Build system and package manager."),
    ("What is cargo test?", "Runs #[test] annotated tests."),
    ("What is cargo clippy?", "Linter for idiomatic Rust."),
    ("What is cfg?", "#[cfg(target_os = 'linux')] conditional comp."),
    ("What are macros?", "macro_rules! declarative macros."),
    ("What is println!", "print!('Hello {}', name) formatted output."),
    ("What is format!", "format!('Hello {}', name) returns String."),
    ("What is dbg!", "dbg!(expr) prints expr + value for debugging."),
    ("What is assert!", "assert!(cond) panics if false."),
    ("What is assert_eq!", "assert_eq!(a, b) panics if a != b."),
    ("What is unit test?", "#[cfg(test)] mod with #[test] fns."),
    ("What is doc test?", "Code blocks in /// tested with cargo test."),
    ("What is std::fs?", "read_to_string, write, create_dir, metadata."),
    ("What is std::io?", "Read, Write, BufReader, BufWriter."),
    ("What is std::thread?", "thread::spawn. JoinHandle."),
    ("What is Arc?", "Atomic reference counting. Thread-safe shared."),
    ("What is Rc?", "Non-atomic reference counting. Single-thread."),
    ("What is RefCell?", "Interior mutability. Runtime borrow checking."),
    ("What is Box?", "Heap allocation. Owned pointer."),
    ("What is unsafe?", "Raw ptr deref, unsafe fns, unions."),
    ("What is FFI?", "extern 'C' { fn abs(i: i32) -> i32; }"),
    ("What is no_std?", "Embedded. disables std. Core only."),
    ("What are const generics?", "fn arr<const N: usize>() -> [i32; N]."),
    ("What is impl Trait?", "fn f() -> impl Display opaque return type."),
    ("What is dyn Trait?", "dyn Display trait object. Dynamic dispatch."),
    ("What is Sized?", "Type with known compile-time size."),
    ("What is Clone?", "Explicit .clone(). Copy: bitwise copy."),
    ("What is Drop?", "Called when value goes out of scope."),
    ("What is Into/From?", "From<T> for U. Into auto from From."),
    ("What is Send?", "Ownership can transfer between threads."),
    ("What is Sync?", "Shared reference can be sent between threads."),
    ("What is PhantomData?", "Simulates ownership for type system."),
    ("What is the never type?", "! never completes. Diverging functions."),
    ("What are associated types?", "trait Iter { type Item; }."),
]
for q_text, answer in rust_j:
    TPL("Rust Basics", [(q_text, answer)], "Rust", "Junior")

rust_m = [
    ("Borrow checker rules.", "1 mut ref XOR N shared refs at any time. References must be valid."),
    ("What is NLL?", "Non-Lexical Lifetimes. Smarter borrow checking based on actual usage."),
    ("What is Pin?", "Pin<T> prevents moving. For self-referential structs."),
    ("What is async/await?", "async fn -> Future. await polls without blocking."),
    ("What is tokio?", "Async runtime: I/O, timers, channels, task scheduling."),
    ("What is a Future?", "poll() drives progress. await syntax."),
    ("What is a Stream?", "Async version of Iterator. Values over time."),
    ("What is turbofish?", "::<> for explicit generics: parse::<i32>()."),
    ("What is newtype?", "struct Meters(u32) type safety without overhead."),
    ("What is orphan rule?", "Cannot impl external trait on external type."),
    ("What is serde?", "#[derive(Serialize, Deserialize)]. JSON, etc."),
    ("What is rayon?", "par_iter() data parallelism. Work-stealing."),
    ("What is proc macro?", "Token stream manipulation at compile time."),
]
for q_text, answer in rust_m:
    TPL("Rust Advanced", [(q_text, answer)], "Rust", "Middle")

rust_s = [
    ("Design lock-free data structure.", "AtomicPtr CAS. UnsafeCell. #[repr(C)] for layout."),
    ("Custom allocator.", "GlobalAlloc trait. #[global_allocator]. Layout alignment."),
    ("Zero-cost logging.", "Macros check level at compile. Feature flags."),
    ("GATs implementation.", "trait Iter { type Item<'a>; fn iter<'a>(&'a self) -> impl Iterator<Item = Self::Item<'a>>; }"),
    ("Async runtime abstraction.", "trait Runtime { fn spawn(&self, f: impl Future); } impl for tokio, smol."),
    ("Compile-time regex.", "Proc macro. Parse regex. Generate NFA/DFA code."),
    ("Type-safe builder with compile-time validation.", "Const generics for state. Each method transitions type."),
    ("Minimize binary size.", "LTO, strip, #[inline(never)], avoid generics monomorphization, no_std."),
    ("Embedded Rust system.", "cortex-m-rt, embedded-hal. #[entry]. Singleton peripherals."),
    ("Custom async executor.", "Future::poll on task queue. Waker. Thread pool."),
]
for q_text, answer in rust_s:
    TPL("Rust Advanced", [(q_text, answer)], "Rust", "Senior")

# ==================== KOTLIN (500) ====================
kt_j = [
    ("What is Kotlin?", "Statically-typed JVM language. Concise, safe, Java-interop."),
    ("val vs var?", "val: read-only (immutable ref). var: mutable."),
    ("Nullable types?", "Type? allows null. Safe call ?. Elvis ?:."),
    ("What is !!?", "NPE if null. Use rarely."),
    ("What is a data class?", "data class Person(val name: String). Auto: equals, hashCode, toString, copy."),
    ("What is a sealed class?", "sealed class restricts subclass hierarchy. Exhaustive when."),
    ("What is companion object?", "Static-like members. Can have name, implement interfaces."),
    ("Extension functions?", "fun String.isEmail(): Boolean adds to existing types."),
    ("What is a lambda?", "{ x: Int, y: Int -> x + y }. Last lambda outside parens."),
    ("What is it?", "Implicit single param: list.filter { it > 5 }."),
    ("Higher-order functions?", "fun operate(fn: (Int, Int) -> Int)."),
    ("What is let?", "obj?.let { it.property } run on non-null."),
    ("What is apply?", "obj.apply { prop = val } configures and returns obj."),
    ("What is also?", "Performs side effects and returns object."),
    ("What is run?", "Combines init and computation."),
    ("What is with?", "with(obj) { } runs block without extension."),
    ("What is inline?", "Inlines function at call site. Reduces lambda overhead."),
    ("What is noinline?", "Lambda not inlined."),
    ("What is crossinline?", "Prevents non-local returns in inlined lambdas."),
    ("What is reified?", "Preserves generic type info at runtime (inline only)."),
    ("What is a coroutine?", "GlobalScope.launch { delay(1000) } lightweight concurrency."),
    ("What is launch?", "Fire-and-forget coroutine. Returns Job."),
    ("What is async?", "Returns Deferred<T>. await() gets result."),
    ("What is suspend?", "Pauses coroutine without blocking thread."),
    ("What is Flow?", "Cold async stream. collect terminal operator."),
    ("What is StateFlow?", "Hot flow with current value. State holder."),
    ("What is SharedFlow?", "Hot flow emitting to multiple collectors. Replay."),
    ("What is Ktor?", "Async web framework. Client and server."),
    ("What is kotlinx.serialization?", "@Serializable. JSON, CBOR, ProtoBuf."),
    ("What is Kotlin/Native?", "Compiles to native binaries. LLVM backend."),
    ("What is Kotlin/JS?", "Compiles to JavaScript."),
    ("What is KMP?", "expect/actual. Share business logic across platforms."),
    ("What is build.gradle.kts?", "Gradle build script in Kotlin DSL."),
    ("What are inline classes?", "value class Password(val value: String) zero overhead."),
    ("What is destructuring?", "val (name, age) = person."),
    ("What is tailrec?", "Optimizes recursion to loop. No stack overflow."),
    ("What is infix?", "infix fun Int.add(x: Int) = this + x. 1 add 2."),
    ("What is operator overloading?", "operator fun plus(other: Point) = Point(x + other.x, y)."),
    ("What is lazy?", "val x by lazy { compute() } initializes on first access."),
    ("What is lateinit?", "lateinit var delayed init for non-nullable."),
    ("What is typealias?", "typealias Predicate<T> = (T) -> Boolean."),
    ("What is object?", "object Singleton { } singleton declaration."),
    ("What is type-safe builder?", "html { body { p { +'Hello' } } } @DslMarker."),
    ("What is @JvmStatic?", "Makes companion fun static in JVM."),
    ("What is @JvmOverloads?", "Generates overloads for default params."),
    ("What is @JvmName?", "Specifies JVM method name."),
]
for q_text, answer in kt_j:
    TPL("Kotlin Basics", [(q_text, answer)], "Kotlin", "Junior")

kt_m = [
    ("Structured concurrency?", "CoroutineScope lifecycle. Children complete before parent."),
    ("Dispatchers?", "Default (CPU), IO, Main (UI), Unconfined."),
    ("supervisorScope?", "Child failure doesn't cancel siblings."),
    ("Contracts?", "contract { returns() implies (x != null) } helps smart casts."),
    ("Arrow library?", "Functional: Either, Option, IO, Validated."),
    ("DSL marker?", "@DslMarker restricts implicit receivers."),
    ("No checked exceptions?", "All exceptions unchecked in Kotlin."),
    ("Collection operations?", "map, filter, reduce, groupBy, partition, associate."),
    ("Sequences?", "sequence { yield() } lazy evaluation. asSequence()."),
    ("Channel in coroutines?", "Rendezvous or buffered channel. Produce/consume."),
    ("Job vs Deferred?", "Job: no result. Deferred: produces result."),
    ("CoroutineExceptionHandler?", "Global handler for uncaught coroutine exceptions."),
]
for q_text, answer in kt_m:
    TPL("Kotlin Advanced", [(q_text, answer)], "Kotlin", "Middle")

kt_s = [
    ("DSL for testing framework.", "Receiver types. @DslMarker. Context receivers. Scope functions."),
    ("Coroutine pipeline 100K req/s.", "Limited parallelism dispatcher. Bounded channel. Structured."),
    ("Type-safe SQL DSL.", "Context receivers. Table schemas as types. Column validation at compile."),
    ("Compiler plugin.", "IrElementTransformer for IR. PsiElementModifier for source."),
    ("KMP networking library.", "expect/actual. Ktor engine. Shared serialization."),
    ("Multiplatform UI with Compose.", "Compose Multiplatform. Shared UI code. Platform-specific."),
]
for q_text, answer in kt_s:
    TPL("Kotlin Advanced", [(q_text, answer)], "Kotlin", "Senior")

# ==================== WRITE THE FINAL FILE ====================
# Deduplicate by question text
seen_q = set()
unique = []
for item in ALL_Q:
    key = item['q'].strip().lower()
    if key not in seen_q:
        seen_q.add(key)
        unique.append(item)

ALL_Q = unique
print(f"Total unique questions: {len(ALL_Q)}")

# Count by language
from collections import Counter
langs = Counter(item['lang'] for item in ALL_Q)
for lang, count in sorted(langs.items(), key=lambda x: -x[1]):
    diffs = Counter(i['diff'] for i in ALL_Q if i['lang'] == lang)
    print(f"  {lang}: {count} (Junior:{diffs.get('Junior',0)} Middle:{diffs.get('Middle',0)} Senior:{diffs.get('Senior',0)})")

# Write mjs file
lines = []
lines.append("import pool from '../config/database.js';\n")
lines.append("\n")
lines.append("const questions = [];\n")
lines.append("\n")
lines.append("function Q(category, question, short_answer, options, difficulty, language) {\n")
lines.append("  questions.push({ category, question, short_answer, options, difficulty, language });\n")
lines.append("}\n")
lines.append("\n")

for item in ALL_Q:
    lines.append(to_mjs_line(item) + "\n")

lines.append("""
async function seedDB() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let count = 0;
    for (const q of questions) {
      const res = await client.query(
        `INSERT INTO questions (category, question_text, short_answer, options, difficulty, language)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING RETURNING id`,
        [q.category, q.question, q.short_answer, JSON.stringify(q.options), q.difficulty, q.language]
      );
      if (res.rows.length > 0) count++;
    }
    await client.query('COMMIT');
    console.log(`Seeded ${count} new questions (${questions.length} total in memory)`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', e);
    throw e;
  } finally {
    client.release();
  }
}

export default seedDB;
""")

with open(OUT_MJS, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\\nWritten to {OUT_MJS}")