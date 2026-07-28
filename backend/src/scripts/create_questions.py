import json, os, sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(REPO, 'data')
os.makedirs(DATA_DIR, exist_ok=True)
OUT = os.path.join(DATA_DIR, 'questions-data.json')

all_q = []
counter = [0]

def Q(cat, question, short, opts, diff, lang):
    all_q.append({"category": cat, "question": question, "short_answer": short, "options": opts, "difficulty": diff, "language": lang})
    counter[0] += 1

# ============================================================
# TEMPLATES PER LANGUAGE
# ============================================================

def gen_java():
    # Java Core Junior
    java_core_junior = [
        ("What is the difference between == and equals() in Java?",
         "== compares object references (memory addresses); equals() compares actual content/values of objects.",
         ["== compares references, equals() compares content", "== compares content, equals() compares references", "No difference, they are synonyms", "== is only for strings"]),
        ("What is a String Pool in Java?",
         "A special memory region in the Java heap where String literals are stored for reuse.",
         ["A cache for frequently used strings in heap memory", "A database table for string records", "A stack-based storage for strings", "A method for string compression"]),
        ("What are the main differences between String, StringBuilder, and StringBuffer?",
         "String is immutable. StringBuilder is mutable and not thread-safe. StringBuffer is mutable and thread-safe.",
         ["String is immutable, StringBuilder is not thread-safe, StringBuffer is thread-safe", "StringBuilder is immutable, String is mutable", "All three are mutable", "StringBuffer is faster than StringBuilder"]),
        ("What does the final keyword mean in Java?",
         "final makes variables constant, methods non-overridable, and classes non-subclassable.",
         ["It can make variables constant, methods non-overridable, and classes non-subclassable", "It only makes variables constant", "It only prevents method overriding", "It is used for garbage collection"]),
        ("What is autoboxing and unboxing in Java?",
         "Autoboxing automatically converts primitives to wrapper classes (e.g., int to Integer). Unboxing is the reverse.",
         ["Automatic conversion between primitives and their wrapper classes", "Converting objects to primitives only", "Converting strings to numbers", "A method for boxing Java classes in JAR files"]),
        ("What is the difference between a constructor and a method?",
         "A constructor has the same name as the class, no return type, and is called automatically when an object is created.",
         ["Constructors have no return type and same name as class, methods have return types and their own name", "Constructors can return values", "Methods cannot be overloaded", "Constructors are inherited"]),
        ("What is the purpose of the this keyword?",
         "this refers to the current instance of the class. It can access instance variables, call other constructors, or pass the current object.",
         ["Refers to the current instance of the class", "Refers to the parent class", "Is a static reference", "Is only used in static methods"]),
        ("What is the difference between a class and an interface?",
         "A class can have constructors, instance variables, and method implementations. An interface defines contracts with abstract methods.",
         ["Classes can have constructors and state, interfaces cannot", "Interfaces can have constructors", "Classes cannot extend multiple classes but interfaces can extend multiple", "There is no difference"]),
        ("What is garbage collection in Java?",
         "Garbage collection is automatic memory management that identifies and reclaims memory of unreachable objects.",
         ["Automatic memory reclamation of unreachable objects", "Manual memory deallocation by the programmer", "A method for compressing the hard drive", "A technique for optimizing CPU usage"]),
        ("What is the default value of a boolean in Java?",
         "The default value of a boolean field in Java is false.",
         ["false", "true", "0", "null"]),
        ("What is Method Overloading in Java?",
         "Method overloading occurs when multiple methods in the same class have the same name but different parameters.",
         ["Multiple methods with the same name but different parameters in the same class", "Multiple methods with the same name in different classes", "Overriding a method in a subclass", "Changing the return type of a method"]),
        ("What are wrapper classes in Java?",
         "Wrapper classes provide a way to use primitive data types as objects (Integer, Double, Boolean, etc.).",
         ["Classes that wrap primitives to use them as objects", "Classes that wrap other wrapper classes", "Classes used for database connections", "Classes for string formatting"]),
        ("What is the difference between a local variable and an instance variable?",
         "A local variable is declared inside a method. An instance variable is declared in the class body and belongs to each object.",
         ["Local variables are inside methods, instance variables are in the class body per object", "There is no difference", "Local variables are static", "Instance variables are only in static methods"]),
        ("What does static mean in Java?",
         "static means the member belongs to the class itself rather than any specific instance.",
         ["Belongs to the class rather than instances, shared across all objects", "Means the member cannot be changed", "Means the member is private", "Only applies to methods, not variables"]),
        ("What is the difference between import static and regular import?",
         "Regular import brings classes into scope. Import static brings static members directly into scope without class prefix.",
         ["Import static allows using static members without class prefix", "Regular import only works with public classes", "There is no difference", "Import static imports instance methods"]),
    ]
    for q, s, o in java_core_junior:
        Q("Java Core", q, s, o, "Junior", "Java")

def gen_java_middle():
    j = [
        ("Explain the Java Memory Model and happens-before relationships.",
         "The Java Memory Model defines when one thread write is guaranteed to be visible to another. Happens-before ensures ordering.",
         ["Defines visibility and ordering guarantees between threads", "A memory allocation strategy for the heap", "A garbage collection algorithm", "A model for database connections"]),
        ("What is the difference between Comparable and Comparator interfaces?",
         "Comparable defines natural ordering (compareTo) implemented by the class itself. Comparator defines external ordering (compare) implemented separately.",
         ["Comparable is internal/natural ordering, Comparator is external/custom ordering", "They are identical", "Comparable uses compare, Comparator uses compareTo", "Only Comparable can be used with Collections.sort"]),
        ("Explain the Java Module System (JPMS) introduced in Java 9.",
         "JPMS organizes code into modules with explicit dependencies and encapsulation, defining which packages are exported.",
         ["Organizes code into modules with explicit dependencies and encapsulation", "A replacement for the JVM", "A package management system like Maven", "A database module system"]),
        ("What are the differences between Process and Thread in Java?",
         "A Process is an independent program execution with its own memory space. A Thread shares the process memory.",
         ["Process has its own memory, threads share process memory", "Threads have their own memory space", "There is no fundamental difference", "Processes are lighter than threads"]),
        ("Explain Serializable vs Externalizable interfaces.",
         "Serializable uses default serialization automatically. Externalizable provides control through writeExternal/readExternal methods.",
         ["Serializable is marker with default serialization, Externalizable gives manual control", "They are identical", "Externalizable is faster but does not support inheritance", "Only Serializable supports backward compatibility"]),
        ("What is the Diamond Problem and how does Java resolve it?",
         "A multiple inheritance ambiguity resolved by requiring explicit disambiguation with super keyword.",
         ["A multiple inheritance ambiguity resolved by requiring explicit super calls", "A problem with diamond-shaped algorithms", "A database normalization issue", "A design pattern for creating objects"]),
        ("How does Java handle annotations at runtime?",
         "Annotations with RUNTIME retention are accessible through reflection using the AnnotatedElement interface.",
         ["Annotations with RUNTIME retention are accessible through reflection", "All annotations are available at runtime", "Annotations cannot be read at runtime", "Annotations are only for documentation"]),
        ("What is the difference between shallow copy and deep copy?",
         "Shallow copy copies primitives but references nested objects. Deep copy recursively copies all objects including nested ones.",
         ["Shallow copies references of nested objects, deep copy duplicates all nested objects", "There is no difference", "Shallow copy is always faster", "Deep copy cannot be implemented in Java"]),
        ("Explain the flyweight design pattern and String pool.",
         "Flyweight minimizes memory usage by sharing data among similar objects. String pool shares identical string literal objects.",
         ["Shares common data to minimize memory usage, String pool shares identical string objects", "A pattern for compressing strings", "A pattern for duplicating objects", "A database optimization technique"]),
        ("What are the Java Time API classes introduced in Java 8?",
         "java.time includes LocalDate, LocalTime, LocalDateTime, ZonedDateTime, Duration, Period, Instant. Immutable and thread-safe.",
         ["Immutable and thread-safe date/time classes replacing old Date/Calendar", "Mutable date classes for better performance", "Only works with GMT timezone", "A replacement for java.sql only"]),
        ("How does Java handle numeric overflow?",
         "Java silently wraps around using two's complement arithmetic for integer overflow. Developers must check overflow manually.",
         ["Silently wraps around using two's complement, no exception thrown", "Throws ArithmeticException", "Automatically converts to BigInteger", "Causes a JVM crash"]),
        ("What is the purpose of try-with-resources statement?",
         "try-with-resources automatically closes AutoCloseable resources. Resources closed in reverse declaration order.",
         ["Automatically closes AutoCloseable resources, closing in reverse order", "Only closes resources on successful execution", "Is a replacement for the finally block only", "Requires manual resource management"]),
        ("Explain checked vs unchecked exceptions.",
         "Checked exceptions extend Exception and must be caught/declared. Unchecked extend RuntimeException.",
         ["Checked must be caught/declared at compile time, unchecked extend RuntimeException", "Checked are runtime only", "There is no compiler difference", "Unchecked exceptions are always bugs"]),
        ("What is reflection in Java and when should it be used cautiously?",
         "Reflection allows examining class structure at runtime. Bypasses encapsulation, is slow, raises security concerns.",
         ["Runtime class inspection and modification, bypasses encapsulation and is slow", "Only used for debugging", "A compile-time analysis tool", "Only works with public members"]),
        ("How does Java compiler handle type erasure for generics?",
         "Type erasure replaces type parameters with their bounds (or Object) at compile time. Generics are not reified at runtime.",
         ["Replaces type parameters with bounds or Object at compile time", "Keeps type information at runtime", "Only erases unchecked types", "Generics are reified in Java"]),
    ]
    for q, s, o in j:
        Q("Java Core", q, s, o, "Middle", "Java")

def gen_java_senior():
    j = [
        ("Explain the JVM class loading mechanism including the three delegation models.",
         "Three class loaders: Bootstrap (core Java), Platform (Java modules), Application (classpath). Child delegates to parent first.",
         ["Bootstrap, Platform, System loaders with parent-first delegation", "Only one class loader exists", "Child class loaders are loaded first", "Class loaders are only for custom classes"]),
        ("Describe JIT compilation and its tiered compilation strategy.",
         "JIT converts bytecode to native code. Tiered: C1 for quick startup, C2 for aggressively optimized code.",
         ["Converts bytecode to native code at runtime with C1 for startup and C2 for optimization", "Only C2 is used for all methods", "JIT compiles only once at startup", "JIT is only available in Java 17+"]),
        ("How does G1 garbage collector work?",
         "G1 divides heap into equal-sized regions and collects regions with most garbage first for efficient space reclamation.",
         ["Divides heap into regions, collects regions with most garbage first", "Uses a single large heap segment", "Is a serial collector only", "Does not support parallel collection"]),
        ("Explain JVM Memory Architecture: heap, metaspace, stack, program counter.",
         "Heap stores objects, Metaspace stores class metadata (replacing PermGen), Stack stores frames/locals per thread, PC holds execution address.",
         ["Heap for objects, Metaspace for class metadata, Stack for thread frames, PC for execution address", "Stack stores objects, heap for metadata", "Metaspace is part of the stack", "Only heap and stack exist"]),
        ("How does Java achieve polymorphism at the bytecode level?",
         "Java uses invokevirtual for virtual methods, invokeinterface for interface methods, invokespecial for constructors/private methods. Resolution via vtable/itable lookup at runtime.",
         ["Uses invokevirtual/invokeinterface/invokespecial bytecodes with vtable/itable lookup", "Polymorphism is resolved at compile time only", "Uses a single invoke method for all calls", "Polymorphism does not exist at bytecode level"]),
        ("Describe happens-before guarantee and volatile visibility.",
         "A write to volatile variable happens-before every subsequent read ensuring memory visibility across threads.",
         ["Volatile write happens-before subsequent read, ensuring visibility", "Volatile only prevents instruction reordering", "Happens-before is only for synchronized blocks", "Volatile provides atomicity for long operations"]),
        ("Explain Project Loom virtual threads in Java 21.",
         "Virtual threads are lightweight JVM-managed threads enabling massive concurrency by multiplexing on few carrier threads.",
         ["Lightweight JVM-managed threads enabling massive concurrency for I/O tasks", "Replace OS threads entirely for all workloads", "Are only available in native mode", "Do not support structured concurrency"]),
        ("Describe ZGC and Shenandoah GC algorithms.",
         "Low-latency concurrent collectors for large heaps. ZGC uses colored pointers, Shenandoah uses Brooks pointers.",
         ["Low-latency concurrent collectors using colored pointers and Brooks pointers respectively", "Both are serial stop-the-world collectors", "Only ZGC is concurrent", "They cannot handle heaps larger than 64GB"]),
        ("Explain memory semantics of final fields and safe publication.",
         "Properly constructed object with final fields guarantees correct final values to any thread without synchronization.",
         ["Final fields have guaranteed visibility without synchronization once constructor completes", "Final fields still need volatile for visibility", "Only works with static final fields", "Final fields have no special memory semantics"]),
        ("Describe AOT compilation (jaotc) and trade-offs vs JIT.",
         "AOT compiles bytecode to native at build time. Reduces startup but loses runtime profiling for adaptive optimization.",
         ["Converts bytecode to native at build time, reduces startup but loses runtime profiling", "Produces faster code than JIT in all cases", "Is only available for server-class machines", "Replaces JIT entirely"]),
        ("How does VarHandle API provide low-level atomic operations?",
         "VarHandle provides atomic variable access with different memory ordering modes (plain, acquire, release, volatile).",
         ["Provides atomic access with configurable memory ordering for fields and arrays", "Only used for volatile variables", "Is a deprecated API replaced by AtomicReference", "Only works with instance fields"]),
        ("Explain CompletableFuture and Fork/Join pattern.",
         "CompletableFuture enables async programming with chaining and ForkJoinPool for parallel execution.",
         ["Enables async chaining with ForkJoinPool, supports thenApply/thenCompose/thenCombine", "Only supports sequential composition", "Does not handle exceptions", "Uses a separate thread for every operation"]),
        ("What about Project Panama Foreign Function & Memory API?",
         "Project Panama provides native interop beyond JNI with safer Foreign Function and Memory API.",
         ["Provides native interop beyond JNI with safer Foreign Function and Memory API", "Is the same as JNI", "Only works on Linux systems", "Does not support memory management"]),
        ("Explain Security Manager deprecation and module access control.",
         "Security Manager is deprecated and will be removed. Modern Java uses module encapsulation.",
         ["Deprecated sandboxing mechanism being replaced by module encapsulation", "Is the primary security mechanism in modern Java", "Was never deprecated", "Only applies to applets"]),
    ]
    for q, s, o in j:
        Q("Java Core", q, s, o, "Senior", "Java")

def gen_java_collections_junior():
    Q("Collections", "What is the difference between ArrayList and LinkedList?",
      "ArrayList uses dynamic array O(1) access O(n) middle insert. LinkedList uses doubly-linked list O(1) insert/delete O(n) access.",
      ["ArrayList uses array (fast access), LinkedList uses linked list (fast insert/delete)", "LinkedList uses array, ArrayList uses linked list", "No difference, they are interchangeable", "ArrayList is thread-safe but LinkedList is not"], "Junior", "Java")
    Q("Collections", "What is the difference between HashSet and TreeSet?",
      "HashSet uses hash table O(1) operations. TreeSet uses red-black tree O(log n) sorted operations.",
      ["HashSet uses hash table O(1), TreeSet uses red-black tree O(log n) sorted", "TreeSet is faster for all operations", "HashSet maintains insertion order", "TreeSet uses hashing too"], "Junior", "Java")
    Q("Collections", "What is the difference between HashMap and Hashtable?",
      "HashMap is non-synchronized allowing null key/values. Hashtable is synchronized and does not allow nulls.",
      ["HashMap is unsynchronized with null support, Hashtable is synchronized without nulls", "Hashtable is the modern replacement for HashMap", "They are identical", "Only Hashtable supports iteration"], "Junior", "Java")

def gen_java_collections_middle():
    Q("Collections", "Explain internal working of HashMap in Java 8+ including treeification.",
      "HashMap uses array of buckets. Collisions stored as linked list or tree when threshold exceeds 8 elements.",
      ["Array of buckets with linked lists that become trees at 8+ collisions", "Only uses linked lists regardless of size", "Uses a binary search tree from the start", "HashMap is a TreeMap with different syntax"], "Middle", "Java")
    Q("Collections", "Explain CopyOnWriteArrayList and when it should be used.",
      "CopyOnWriteArrayList creates new copy of underlying array on each mutation. Best for read-heavy scenarios.",
      ["Creates a new array copy on each write, ideal for read-heavy scenarios", "Is a synchronized version of ArrayList", "Is faster for frequent writes", "Does not support iteration"], "Middle", "Java")
    Q("Collections", "How does PriorityQueue work internally?",
      "PriorityQueue backed by min-heap array. Head is smallest element. Insertion/removal O(log n). No null elements.",
      ["Backed by a min-heap array with O(log n) insert/remove", "Backed by a sorted array", "Allows null elements", "Is a synchronized collection"], "Middle", "Java")

def gen_java_multithreading_junior():
    mt = [
        ("What is a thread in Java and how do you create one?",
         "A thread is a lightweight subprocess. Created by extending Thread or implementing Runnable/Callable.",
         ["Extend Thread or implement Runnable/Callable", "Only by extending Thread class", "Only by implementing Runnable", "Threads cannot be created in Java"]),
        ("What is the difference between sleep() and wait()?",
         "sleep() is static Thread method pausing for time without releasing locks. wait() releases lock and waits for notify.",
         ["sleep() is static Thread method (keeps lock), wait() is Object method (releases lock)", "Both release the lock", "Both are static methods", "wait() does not release the lock"]),
        ("What is the synchronized keyword in Java?",
         "synchronized provides mutual exclusion allowing only one thread at a time on same monitor.",
         ["Provides mutual exclusion allowing only one thread on a monitor at a time", "Makes code run faster", "Only prevents deadlocks", "Is only for static methods"]),
        ("What is a deadlock in multithreading?",
         "Two or more threads blocked forever, each waiting for lock held by the other.",
         ["Two or more threads blocked forever waiting for locks held by each other", "A thread that runs infinitely", "When a thread is paused by the OS", "When all threads complete successfully"]),
        ("What is the volatile keyword in Java?",
         "volatile ensures reads/writes go directly to main memory guaranteeing visibility across threads.",
         ["Ensures reads/writes go to main memory for visibility across threads", "Makes operations atomic", "Prevents thread creation", "Replaces synchronized entirely"]),
        ("What is difference between daemon thread and user thread?",
         "Daemon thread runs background and does not prevent JVM exiting. User threads keep JVM alive.",
         ["Daemon threads do not prevent JVM exit when only daemon threads remain", "Daemon threads have higher priority", "User threads run in background", "There is no difference"]),
        ("What is Runnable interface and how is it different from Callable?",
         "Runnable has run() returning void with no checked exceptions. Callable has call() returning value with checked exceptions.",
         ["Runnable returns void with no checked exceptions, Callable returns a value and can throw checked exceptions", "They are the same", "Runnable returns a value", "Callable cannot throw exceptions"]),
        ("What are the Object class methods for thread synchronization?",
         "wait(), notify(), notifyAll() defined in Object for inter-thread communication. Must be called from synchronized context.",
         ["wait(), notify(), notifyAll() defined in Object for inter-thread communication", "only synchronized(), sleep(), and join()", "wait() releases the lock, notify() keeps it", "They are only in the Thread class"]),
        ("What is an ExecutorService in Java?",
         "ExecutorService manages thread pools and async task execution with submit(), invokeAll(), shutdown().",
         ["Manages thread pools and async task execution with submit/invokeAll/shutdown", "Only creates new threads for each task", "Is the same as creating a new Thread", "Cannot be shut down"]),
        ("What is AtomicInteger and how does it work?",
         "AtomicInteger uses compare-and-swap (CAS) CPU instructions for lock-free atomic integer operations.",
         ["Uses CAS (compare-and-swap) CPU instructions for lock-free atomic operations", "Uses synchronized internally", "Is only for long values", "Cannot be used in concurrent programs"]),
    ]
    for q, s, o in mt:
        Q("Multithreading", q, s, o, "Junior", "Java")

def gen_java_multithreading_middle():
    mt = [
        ("Compare CountDownLatch, CyclicBarrier, and Semaphore.",
         "CountDownLatch: one-time event sync. CyclicBarrier: reusable barrier for threads. Semaphore: permit-based access control.",
         ["CountDownLatch waits for operations, CyclicBarrier waits for threads (reusable), Semaphore controls access with permits", "They are all the same", "Only Semaphore can be reused", "CountDownLatch can be reset"]),
        ("Explain ReentrantLock and how it differs from synchronized.",
         "ReentrantLock provides explicit lock control with tryLock, timed lock, fairness, and multiple Condition objects.",
         ["Explicit lock control with tryLock, timed lock, fairness, and multiple Conditions", "Is the same as synchronized", "Cannot be used in try-finally blocks", "Does not support reentrancy"]),
        ("Describe how CompletableFuture combines multiple async operations.",
         "CompletableFuture supports thenApply, thenCompose, thenCombine, thenAccept, and exceptionally using ForkJoinPool.",
         ["Supports thenApply/thenCompose/thenCombine/thenAccept/exceptionally with ForkJoinPool", "Only supports sequential chains", "Does not handle exceptions", "Uses a separate thread for every stage"]),
        ("What is producer-consumer problem and how BlockingQueue solves it?",
         "Producer-consumer problem with producers adding and consumers removing data. BlockingQueue provides thread-safe put/take.",
         ["BlockingQueue provides thread-safe put/take with blocking when empty/full", "Only works with synchronized methods", "Requires manual wait/notify", "Cannot be used for multiple producers"]),
        ("Explain importance of thread-safe publication of objects.",
         "Unsafe publication can lead to seeing partially constructed objects. Use static init, volatile, final fields for safe publication.",
         ["Unsafe publication can expose partially constructed objects; use static init, volatile, final, or atomic reference", "All objects are safely published in Java", "Only synchronized blocks publish safely", "Publication only matters for immutable objects"]),
        ("How does ThreadPoolExecutor work internally?",
         "Maintains worker pool and task queue. Creates workers up to corePoolSize, queues remainder, rejects at maxPoolSize.",
         ["Maintains worker pool and task queue, creates workers up to corePoolSize, queues remainder, rejects if at maxPoolSize", "Creates unlimited threads", "Does not use a queue", "Only works with fixed thread counts"]),
        ("What is spurious wakeup and how do you guard against it?",
         "Spurious wakeup is waking from wait() without notify/timeout. Guard with while loop checking condition.",
         ["A false wakeup from wait(); guard with a while loop checking the condition", "A bug in the JVM that cannot be guarded against", "Only happens with notifyAll", "Does not exist in modern JVMs"]),
        ("Explain Fork/Join framework and work-stealing algorithm.",
         "Fork/Join divides tasks recursively. Idle threads steal tasks from busy threads maximizing CPU utilization.",
         ["Divide-and-conquer framework with work-stealing where idle threads steal tasks from busy threads", "A single-threaded executor", "Uses a central task queue", "Cannot be used for recursive tasks"]),
    ]
    for q, s, o in mt:
        Q("Multithreading", q, s, o, "Middle", "Java")

def gen_java_multithreading_senior():
    mt = [
        ("Design a thread-safe publish-subscribe system for high-throughput event processing.",
         "Use ConcurrentHashMap + AtomicReference for subscribers. Disruptor pattern for lock-free message passing.",
         ["ConcurrentHashMap with atomic subscriber lists, Disruptor/ring buffer for lock-free passing", "Use synchronized on the publisher", "Use a single global lock for all topics", "Use only BlockingQueue without any map structure"]),
        ("How do you detect and recover from deadlocks in production?",
         "Use ThreadMXBean.findDeadlockedThreads() for detection. Recover via lock ordering and tryLock with timeout.",
         ["Use ThreadMXBean.findDeadlockedThreads() for detection; recover via lock ordering and tryLock with timeout", "Deadlocks cannot be detected", "Only restart the JVM", "Use Thread.sleep() to avoid deadlocks"]),
        ("Explain AQS (AbstractQueuedSynchronizer) framework.",
         "AQS manages volatile state and FIFO wait queue. Subclasses override tryAcquire/tryRelease for shared/exclusive mode.",
         ["Manages volatile state and FIFO wait queue; subclasses override tryAcquire/tryRelease for shared or exclusive mode", "Only used for ReentrantLock", "Uses a tree-based wait queue", "Cannot be used for custom synchronizers"]),
        ("Describe lock-free and wait-free algorithms with examples.",
         "Lock-free: at least one thread makes progress (CAS-based). Wait-free: every thread makes progress.",
         ["Lock-free means at least one thread makes progress (CAS-based), wait-free means every thread makes progress", "There is no difference between lock-free and wait-free", "Only lock-free algorithms exist in Java", "Wait-free algorithms cannot be implemented in Java"]),
        ("How does structured concurrency in Java 21 improve multithreaded programming?",
         "Structured concurrency treats threads as single unit of work. Auto-cancels children when parent scope exits.",
         ["Treats threads as single unit of work, auto-cancels children when parent scope exits", "Is the same as ExecutorService", "Only applies to virtual threads", "Does not improve error handling"]),
        ("Platform threads vs virtual threads (Project Loom).",
         "Platform threads are OS threads (~1MB stack). Virtual threads are JVM-managed lightweight threads multiplexed on few carrier threads.",
         ["Platform threads are OS threads (~1MB stack), virtual threads are JVM-managed lightweight threads multiplexed on few carrier threads", "Virtual threads are OS threads too", "Platform threads are managed by the JVM", "Virtual threads cannot be pinned"]),
        ("What is thread pinning in virtual threads?",
         "Pinning occurs when virtual thread cannot be unmounted because it holds synchronized block or calls JNI/native code.",
         ["When a virtual thread holds a synchronized block or calls JNI native code, it cannot be unmounted from its carrier", "Never happens in modern JVMs", "Only happens with platform threads", "Is the same as thread starvation"]),
        ("Design high-performance bounded buffer combining virtual threads with structured concurrency.",
         "Use ConcurrentLinkedQueue buffer. Submit virtual thread tasks to StructuredTaskScope. try-with-resources for scope management.",
         ["ConcurrentLinkedQueue buffer with virtual threads submitted to StructuredTaskScope for each request, try-with-resources for scope", "Use fixed thread pool with blocking queue", "Use a single thread for all producers and consumers", "Use ThreadLocal for buffer sharing"]),
        ("Compare performance of synchronized, ReentrantLock, StampedLock, ReadWriteLock.",
         "Synchronized simple no tryLock. ReentrantLock: tryLock/fairness/conditions. StampedLock: optimistic non-blocking read. ReadWriteLock: multi-read/single-write.",
         ["Synchronized simple no tryLock. ReentrantLock tryLock/fairness/conditions. StampedLock optimistic non-blocking read for read-heavy. ReadWriteLock multi-read/single-write", "ReentrantLock is always the fastest", "StampedLock is for write-heavy workloads", "All have identical performance characteristics"]),
    ]
    for q, s, o in mt:
        Q("Multithreading", q, s, o, "Senior", "Java")

# Spring Framework
def gen_spring():
    spring_j = [
        ("What is the Spring Framework and what problem does it solve?",
         "Spring provides infrastructure support via dependency injection (IoC), AOP, and modular architecture.",
         ["Provides infrastructure for Java apps with IoC, AOP, and modular architecture", "Is only a web framework", "Only supports XML configuration", "Is a database framework"]),
        ("What is Inversion of Control (IoC) and Dependency Injection?",
         "IoC means framework controls object lifecycle. DI provides dependencies rather than objects creating them.",
         ["IoC means framework manages object lifecycle, DI provides dependencies instead of objects creating them", "DI means objects create their own dependencies", "IoC and DI are the same thing", "Only DI exists in Spring, not IoC"]),
        ("What are different ways to configure Spring application?",
         "XML configuration, Java-based configuration (@Configuration, @Bean), annotation-based (@Component, @Autowired).",
         ["XML, Java-based (@Configuration/@Bean), and annotation-based (@Component/@Autowired)", "Only XML configuration", "Only annotation-based configuration", "Only Java-based configuration"]),
        ("Difference between @Component, @Repository, @Service, and @Controller?",
         "All are stereotypes. @Component generic, @Repository DAO layer, @Service business logic, @Controller web layer.",
         ["All are stereotypes: @Component generic, @Repository for DAO, @Service for business, @Controller for web", "Only @Component is a real annotation", "They have completely different functionality", "@Repository is for service layer"]),
        ("What is a Spring Bean and default scope?",
         "Spring Bean is object managed by IoC container. Default scope is singleton (one instance per container).",
         ["An object managed by the IoC container, default scope is singleton (one instance per container)", "A Java class annotated with @Bean", "An object with prototype scope by default", "Only objects in XML config are beans"]),
        ("What is the @Autowired annotation?",
         "@Autowired injects dependencies automatically by type. @Qualifier specifies which bean when multiple exist.",
         ["Injects dependencies automatically by type, uses @Qualifier to disambiguate if needed", "Only works with constructor injection", "Only works with XML configuration", "Is the same as @Resource"]),
    ]
    for q, s, o in spring_j:
        Q("Spring Framework", q, s, o, "Junior", "Java")

    spring_m = [
        ("Explain Spring bean lifecycle in detail.",
         "Instantiation, property population, Aware callbacks, BeanPostProcessor before/after init, @PostConstruct/@PreDestroy.",
         ["Instantiation, property population, Aware callbacks, BeanPostProcessor before/after init, @PostConstruct/@PreDestroy", "Only instantiation and destruction", "No BeanPostProcessor phase", "@PostConstruct runs before property population"]),
        ("Difference between @Bean and @Component?",
         "@Bean is method-level annotation in @Configuration classes. @Component is class-level for auto-detection.",
         ["@Bean is method-level in @Configuration classes; @Component is class-level for auto-detection", "They are identical", "@Bean registers a class as a bean", "@Component is only for XML config"]),
        ("Explain Spring AOP with proxies.",
         "Spring AOP uses JDK dynamic proxies for interfaces and CGLIB for classes. AOP concepts: join points, pointcuts, advice, aspects.",
         ["Uses JDK dynamic proxies for interfaces, CGLIB for classes; join points pointcuts and advice types", "Only uses CGLIB proxies", "Does not use proxies", "Only works with public methods"]),
        ("How does Spring handle transaction management?",
         "Spring supports declarative via @Transactional and programmatic with PlatformTransactionManager abstraction.",
         ["Declarative via @Transactional and programmatic with PlatformTransactionManager abstraction", "Only programmatic management", "Only supports JDBC transactions", "@Transactional is only for read operations"]),
        ("What are TransactionPropagation levels?",
         "REQUIRED (use existing or create new), REQUIRES_NEW (always new), NESTED (savepoint), SUPPORTS/MANDATORY/NEVER.",
         ["REQUIRED uses existing or creates new, REQUIRES_NEW always creates new, NESTED uses savepoints", "There is only REQUIRED and REQUIRES_NEW", "NESTED creates a completely separate transaction", "All propagation levels are identical"]),
        ("Difference between Spring MVC and Spring Boot?",
         "Spring MVC is web framework for building REST/web applications. Spring Boot auto-configures with starters.",
         ["Spring MVC is the web framework, Spring Boot auto-configures and speeds up development with starters", "They are the same thing", "Spring Boot replaces Spring MVC", "Spring MVC requires no configuration at all"]),
        ("How does Spring Security OAuth2 integration work?",
         "Spring Security provides OAuth2 client support and resource server with JWT validation.",
         ["OAuth2 client support and resource server with filter chain integration and JWT validation", "Only supports OAuth2 client credentials grant", "Does not integrate with Spring Security", "Only works with SAML"]),
    ]
    for q, s, o in spring_m:
        Q("Spring Framework", q, s, o, "Middle", "Java")

    spring_s = [
        ("Explain Spring Boot auto-configuration and conditional annotations.",
         "Auto-configuration uses @Conditional annotations (OnClass, OnBean, OnProperty, OnWebApplication) triggered by @EnableAutoConfiguration.",
         ["Uses @Conditional annotations to create beans based on classpath, existing beans, and properties", "Uses reflection to scan all classes at startup", "Only works with XML configuration", "Auto-configuration is disabled by default in production"]),
        ("Describe annotation-based configuration internals and @Conditional.",
         "@Conditional matches condition class boolean result. Framework inspects beans and only registers those evaluating to true.",
         ["@Conditional evaluates a condition class result to decide whether to register a bean definition", "Only works for @Bean methods", "Conditions are evaluated at runtime not at registration time", "@Conditional can only check classpath presence"]),
        ("Design Spring app for high-concurrency with connection pooling and caching.",
         "Use HikariCP for connection pooling with Spring Cache + Redis for distributed caching.",
         ["HikariCP for connection pooling with Spring Cache + Redis for distributed caching", "Use C3P0 only", "Do not use connection pooling", "Use a single database connection for all requests"]),
        ("Explain BeanPostProcessor and SmartInstantiationAwareBeanPostProcessor.",
         "BeanPostProcessor allows custom modification before/after initialization. SmartInstantiationAware adds type prediction and early reference resolution.",
         ["BeanPostProcessor for before/after init modification; SmartInstantiationAware adds type prediction and early reference resolution", "They are the same interface", "SmartInstantiationAware only works before initialization", "BeanPostProcessor cannot modify bean properties"]),
        ("How does Spring handle circular dependencies?",
         "Spring resolves single-constructor circular deps using early reference exposure. Setter/field deps use three-level cache (singletonObjects, earlySingletonObjects, singletonFactories).",
         ["Uses three-level cache (singletonObjects, earlySingletonObjects, singletonFactories) for setter/field circular deps, early reference exposure for single-constructor", "Cannot handle any circular dependencies", "Uses a single cache level", "Circular dependency resolution works for prototypes too"]),
        ("Design multi-tenant Spring Boot with isolated schemas and dynamic data source routing.",
         "Use AbstractRoutingDataSource with ThreadLocal tenant context. Spring Security for tenant-aware authorization.",
         ["AbstractRoutingDataSource with ThreadLocal tenant context, per-tenant datasources or schema-based isolation", "Use a single database with no schema separation", "Do not use tenant_id columns", "RLS is not supported in databases"]),
        ("Explain Spring WebFlux reactive stack vs Spring MVC.",
         "WebFlux uses non-blocking event-loop (Netty + Reactor) with Mono/Flux. MVC uses thread-per-request model.",
         ["Non-blocking event-loop model (Netty + Reactor) with Mono/Flux, few threads handle many requests vs MVC's thread-per-request", "WebFlux uses the same thread-per-request model", "WebFlux is not non-blocking", "WebFlux only works with WebSockets"]),
        ("Implement custom Spring Scope beyond singleton and prototype.",
         "Implement Scope interface with get/remove/registerDestructionCallback/getConversationId. Register with registerScope.",
         ["Implement Scope interface with get/remove/registerDestructionCallback/ getConversationId, register with registerScope", "Extend AbstractBeanFactory directly", "Only singleton and prototype scopes are possible", "Use a static HashMap to store scoped objects"]),
        ("Explain annotation processing and annotation-based vs XML at parsing level.",
         "Annotation config uses AnnotatedBeanDefinitionReader + ConfigurationClassPostProcessor with CGLIB proxying. XML uses BeanDefinitionReader with Document parsing.",
         ["Annotation config uses AnnotationBeanDefinitionReader and ConfigurationClassPostProcessor with CGLIB proxying; XML uses BeanDefinitionReader with Document parsing", "Annotations are just XML sugar", "ConfigurationClassPostProcessor does not intercept @Bean calls", "XML parsing happens at runtime for each request"]),
    ]
    for q, s, o in spring_s:
        Q("Spring Framework", q, s, o, "Senior", "Java")

# JVM Internals
def gen_jvm():
    jvm_j = [
        ("What is the Java Virtual Machine (JVM)?",
         "JVM is abstract computing machine providing runtime environment for executing Java bytecode with memory management and garbage collection.",
         ["Abstract machine that executes bytecode and manages memory/GC", "A physical machine that runs Java programs", "Only handles compilation", "Is specific to Windows operating systems"]),
        ("What are main components of the JVM?",
         "Class Loader Subsystem, Runtime Data Areas (Heap, Stack, Method Area, PC Register, Native Method Stack), Execution Engine, native interface.",
         ["Class Loader, Runtime Data Areas (Heap/Stack/Method Area/PC/Native Stack), Execution Engine (interpreter, JIT, GC), native interface", "Only Heap and Stack", "Only Class Loader and Execution Engine", "The JVM only has an interpreter, no JIT"]),
        ("What is Class Loader Subsystem?",
         "Class Loader loads class files. Performs loading (finding .class files), linking (verification, preparation, resolution), and initialization.",
         ["Loads .class files, performs linking (verify/prepare/resolve) and initialization", "Only loads .jar files", "Compiles Java code to bytecode", "Only runs during startup"]),
        ("What is difference between Heap and Stack memory?",
         "Heap stores all objects and instance variables (shared across threads). Stack stores method frames, local variables, partial results (per thread).",
         ["Heap stores objects (shared), Stack stores method frames and local variables (per thread)", "Both store objects", "Stack is larger than heap", "Heap only stores primitive values"]),
        ("What is bytecode in Java?",
         "Bytecode is intermediate representation of Java source after compilation (.class files). Platform-independent instructions executed by JVM.",
         ["Platform-independent intermediate instructions in .class files executed by JVM", "Machine-specific binary code", "Source code before compilation", "Only generated by JIT compiler"]),
        ("What is method area in JVM?",
         "Stores class-level data: structures, methods, constant pool, field data. Metaspace since Java 8 (was PermGen).",
         ["Stores class-level data: structures, methods, constant pool, field data. Metaspace since Java 8 (was PermGen)", "Only stores method bytecode", "Is the same as the heap", "Does not exist in Java 17+"]),
    ]
    for q, s, o in jvm_j:
        Q("JVM Internals", q, s, o, "Junior", "Java")

    jvm_m = [
        ("Explain Java class loading including three delegation models.",
         "Bootstrap -> Platform -> Application delegation. Prevents user classes from overriding core Java classes.",
         ["Bootstrap -> Platform -> Application delegation, prevents user classes from overriding core classes", "Application -> Platform -> Bootstrap", "All loaders act independently", "Only Bootstrap and Application loaders exist"]),
        ("Explain JIT compilation with tiered compilation.",
         "5 tiers: interpreter -> C1 simple -> C1 profiling -> C1 full profiling -> C2 optimized. Hot methods get promoted.",
         ["5 tiers: interpreter -> C1 simple -> C1 profiling -> C1 full profiling -> C2 optimized, hot methods get promoted", "Only C2 is used", "Only interpreter compiles", "Tiered compilation disables JIT entirely"]),
        ("What are different GC algorithms in HotSpot JVM?",
         "Serial, Parallel, CMS (deprecated), G1 (default since Java 9), ZGC, Shenandoah.",
         ["Serial, Parallel, CMS (deprecated), G1 (default), ZGC, Shenandoah", "Only G1 and ZGC", "CMS is default in Java 17+", "There are no GC algorithms in HotSpot"]),
        ("How does G1 garbage collector divide heap and decide which regions to collect?",
         "G1 divides heap into equal-sized regions. Per-region remembered sets for cross-region references. Prioritizes regions with most garbage.",
         ["Equal-sized regions with remembered sets, prioritizes regions with most garbage to maximize space reclaimed per time", "Uses a single contiguous heap space", "Collects regions randomly", "Does not divide heap into regions"]),
        ("What is Metaspace and how does it differ from PermGen?",
         "Metaspace stores class metadata in native memory (not heap). Auto-expands using native memory, unlike fixed PermGen.",
         ["Metaspace stores class metadata in native memory and auto-expands; PermGen was fixed-size in heap", "Metaspace is smaller than PermGen", "Metaspace is part of the Java heap", "Metaspace cannot be configured"]),
        ("Explain JIT compiler tiers and how JVM decides when to compile a method.",
         "Interpreted initially. Frequently executed methods become hot promoted through C1 tiers to C2 advanced optimization at tier 4.",
         ["Interpreted initially, hot methods promoted through C1 tiers to C2 aggressive optimization at tier 4", "All methods are compiled immediately at startup", "JIT compilation only happens once per JVM lifetime", "Only C1 compiler exists"]),
    ]
    for q, s, o in jvm_m:
        Q("JVM Internals", q, s, o, "Middle", "Java")

    jvm_s = [
        ("Describe JVM internals for escape analysis and scalar replacement.",
         "Escape analysis determines object scope. If not escaping, JVM allocates on stack and eliminates locks.",
         ["Escape analysis determines object scope; if not escaping, enables stack allocation, scalar replacement, and lock elimination", "Can only allocate objects on the heap", "Is disabled by default in all modern JVMs", "Only works for primitive types"]),
        ("Explain JVMCI and GraalVM with Truffle framework.",
         "JVMCI allows pluggable compilers into HotSpot. GraalVM uses JVMCI+Graal+Truffle for compilation and language interpretation.",
         ["JVMCI allows pluggable compilers into HotSpot; GraalVM uses JVMCI+Graal+Truffle for AST interpretation", "JVMCI is only used for bytecode interpretation", "GraalVM does not use JVMCI", "Truffle is a JIT compiler, not an interpreter"]),
        ("How does Project Leyden improve startup time?",
         "Leyden pre-computes class linking state in archived class data, skipping linking phases at startup.",
         ["Pre-computes and archives class linking state to skip linking at startup, reducing boot time", "Only reduces memory footprint, not startup time", "Requires changing Java source code", "Is a GC algorithm not a startup optimization"]),
        ("Explain JFR (Java Flight Recorder) events for production profiling.",
         "JFR is low-overhead event collection (<2% overhead) capturing GC, thread, memory, CPU, I/O events.",
         ["Low-overhead event collection infrastructure with <2% overhead capturing GC, thread, memory, CPU, I/O events", "Has significant performance overhead", "Only works in development environments", "Does not capture GC events"]),
        ("Describe AOT compilation pipeline in OpenJDK and vs JIT.",
         "AOT (jaotc) compiles at build time using C2/Graal. Reduces startup but loses runtime profiling for adaptive optimization.",
         ["jaotc compiles at build time using C2/Graal; GraalVM Native Image does full AOT reducing startup but losing runtime profiling", "AOT is always faster than JIT", "jaotc uses interpreter only", "AOT produces JVM bytecode at runtime"]),
        ("Design custom class loader validating bytecode integrity and enforcing security policies.",
         "Extend ClassLoader, override findClass, use BCEL/ASM to validate bytecode before defineClass, enforce security policies.",
         ["Extend ClassLoader, override findClass, use BCEL/ASM to validate bytecode before defineClass, enforce security policies", "Simply call Class.forName() in a SecurityManager", "Use URLClassLoader exclusively", "Override loadClass() to do security checks before delegation"]),
    ]
    for q, s, o in jvm_s:
        Q("JVM Internals", q, s, o, "Senior", "Java")

# Exceptions & Error Handling
def gen_exceptions():
    exc_j = [
        ("What is difference between checked and unchecked exceptions?",
         "Checked extends Exception and must be caught or declared. Unchecked extends RuntimeException and unchecked at compile time.",
         ["Checked extends Exception and must be caught/declared, unchecked extends RuntimeException", "There is no difference", "Only checked exceptions exist", "Unchecked exceptions must be declared in throws clause"]),
        ("What is finally block in Java?",
         "finally always executes after try-catch regardless of exception. Commonly used for cleanup code.",
         ["Always executes after try-catch regardless of exception, used for cleanup", "Only executes when an exception occurs", "Is optional and never required", "Executes before the catch block"]),
        ("Can you have multiple catch blocks?",
         "Yes, multiple catch blocks matched top to bottom. First matching catch block is executed.",
         ["Yes, multiple catch blocks are matched top to bottom; first matching catch executes", "Only one catch block is allowed", "Catch blocks are evaluated simultaneously", "Order of catch blocks does not matter"]),
        ("What is throw keyword used for?",
         "throw explicitly throws exception object from inside a method.",
         ["Explicitly throws an exception object from inside a method", "Catches an exception", "Declares exceptions a method might throw", "Only catches RuntimeExceptions"]),
        ("Difference between Error and Exception?",
         "Error indicates serious JVM failures. Exception is for catchable conditions.",
         ["Error is serious JVM failure (OOM, stack overflow); Exception is something the application should catch/handle", "Error is recoverable, Exception is not", "There is no hierarchy difference", "Error extends Exception"]),
    ]
    for q, s, o in exc_j:
        Q("Exceptions & Error Handling", q, s, o, "Junior", "Java")

    exc_m = [
        ("Explain try-with-resources and which interfaces it requires.",
         "try-with-resources auto-closes AutoCloseable resources in reverse order. Close() exceptions are suppressed.",
         ["AutoCloseable/Closeable required; resources closed in reverse order; close() exceptions are suppressed", "Only Closeable is supported", "Resources are closed in declaration order", "try-with-resources does not handle exceptions"]),
        ("Difference between Exception and Throwable?",
         "Throwable is superclass of all errors and exceptions. Exception for catchable conditions. Error for JVM failures.",
         ["Throwable is root superclass; Exception for catchable, Error for JVM failures", "Exception extends Error", "They are the same class", "Throwable only contains Errors"]),
        ("How does Java streams handle exceptions?",
         "Streams do not handle checked exceptions well since lambdas do not declare checked exceptions.",
         ["Streams do not handle checked exceptions natively since Lambdas do not declare checked exceptions", "Streams handle all exceptions automatically", "Only unchecked exceptions can be caught in streams", "You cannot use try-catch in stream operations"]),
    ]
    for q, s, o in exc_m:
        Q("Exceptions & Error Handling", q, s, o, "Middle", "Java")

    exc_s = [
        ("Design resilient error handling for microservices with circuit breaker, retry, bulkhead.",
         "Resilience4j for circuit breaker. Retry with exponential backoff+jitter. Bulkhead with thread pool isolation. Micrometer metrics.",
         ["Resilience4j for circuit breaker, retry with backoff+jitter, bulkhead thread isolation, Micrometer metrics", "Only retry is needed", "Circuit breakers prevent all failures", "Bulkhead means using a single shared thread pool"]),
        ("Handle exception propagation through virtual threads in structured concurrency.",
         "Exceptions propagate to parent scope via StructuredTaskScope. Children cancelled, completed results available.",
         ["Exceptions propagate to parent scope via StructuredTaskScope, siblings cancelled, completed results available", "Exceptions in virtual threads are silently swallowed", "Each virtual thread handles own exceptions independently", "Virtual threads cannot throw exceptions"]),
        ("Implement custom exception hierarchy for DDD in Java.",
         "Base domain exception. Specific exceptions per domain concept. Translation layers at boundaries.",
         ["Base domain exception, specific exceptions per concept, translation layers at boundaries", "Only use standard Java exceptions", "All exceptions should be checked", "Custom exceptions cannot be runtime exceptions"]),
    ]
    for q, s, o in exc_s:
        Q("Exceptions & Error Handling", q, s, o, "Senior", "Java")

# OOP Principles
def gen_oop():
    oop_j = [
        ("What are four pillars of OOP?",
         "Encapsulation, Inheritance, Polymorphism, and Abstraction.",
         ["Encapsulation, Inheritance, Polymorphism, Abstraction", "Inheritance, Abstraction, Compilation, Interpretation", "Only Encapsulation and Inheritance", "OOP has no principles"]),
        ("What is encapsulation in OOP?",
         "Encapsulation bundles data and methods in a class with access restrictions and public getters/setters.",
         ["Bundling data and methods in a class with restricted access via access modifiers and public getters/setters", "Making all fields public", "Only using private fields with no methods", "Is the same as inheritance"]),
        ("What is polymorphism in Java?",
         "Polymorphism allows objects to take many forms: method overloading (compile-time) and overriding (runtime).",
         ["Objects take many forms via method overloading (compile-time) and overriding (runtime), parent ref to child object", "Only method overloading exists", "Only method overriding exists", "Polymorphism does not exist in Java"]),
        ("What is abstraction in Java?",
         "Abstraction hides implementation details showing only functionality. Abstract classes and interfaces provide it.",
         ["Hides implementation details, achieved through abstract classes and interfaces", "Is the same as encapsulation", "Only abstract classes provide it", "Only interfaces provide it"]),
        ("What is inheritance in Java?",
         "Inheritance allows a class to acquire properties/methods from another class promoting reuse and IS-A relationships.",
         ["A class acquires properties/methods from another class, promotes reuse and IS-A relationship", "A class can inherit from multiple classes", "Inheritance is only for fields", "Inheritance is not supported in Java"]),
        ("Difference between method overloading and overriding?",
         "Overloading: same name, different params (compile-time). Overriding: subclass implements parent method (runtime).",
         ["Overloading=same name different params (compile-time), Overriding=subclass provides parent method impl (runtime)", "They are the same thing", "Overloading requires inheritance", "Overriding changes method name"]),
    ]
    for q, s, o in oop_j:
        Q("OOP Principles", q, s, o, "Junior", "Java")

    oop_m = [
        ("Explain SOLID principles with Java examples.",
         "SOLID: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.",
         ["SRP, OCP, LSP, ISP, DIP - explained with Java examples", "SOLID has only 3 principles", "SOLID is only about class design not interfaces", "Dependency Inversion means concrete classes depend on abstractions"]),
        ("What is Liskov Substitution Principle (LSP)?",
         "Subtypes must be substitutable wherever parent type is used, honoring preconditions/postconditions/invariants.",
         ["Subclasses must be substitutable wherever the parent type is used, honoring preconditions/postconditions/invariants", "Subclasses can weaken preconditions of parent methods", "LSP only applies to interfaces not classes", "There is no such principle in SOLID"]),
        ("What is Open/Closed Principle?",
         "Software entities open for extension (add new behavior) closed for modification (existing code unchanged) via abstractions.",
         ["Open for extension (add new behavior via new classes), closed for modification (existing code stays unchanged)", "Classes should be open to modification", "Only applies to interfaces", "Is the same as Liskov Substitution Principle"]),
        ("Abstract classes vs interfaces in modern Java (8+)?",
         "Abstract classes have state/constructors. Interfaces have default methods but no instance state. Multiple interfaces, one class extension.",
         ["Abstract classes have state and constructors; interfaces (8+) have defaults/statics but no instance state; a class can implement many interfaces but extend one class", "Abstract classes cannot have constructors", "Interfaces can have instance variables", "A class can extend multiple classes"]),
        ("How composition differs from inheritance for code reuse?",
         "Composition (has-a) preferred over inheritance (is-a) for flexibility and loose coupling. Runtime behavior change.",
         ["Composition (has-a) is preferred over inheritance (is-a) for flexibility and loose coupling, allows runtime behavior change", "Inheritance is always better than composition", "Composition and inheritance are identical", "Composition requires multiple inheritance"]),
        ("What is principle of least knowledge (Law of Demeter)?",
         "A module should only communicate with immediate friends, not strangers. Avoid train wreck chain calls.",
         ["A class should only talk to its immediate associated objects, not to objects returned by other methods (avoid train wreck)", "There is no such principle in OOP", "Methods should call as many chained methods as possible", "Only applies to static methods"]),
    ]
    for q, s, o in oop_m:
        Q("OOP Principles", q, s, o, "Middle", "Java")

    oop_s = [
        ("Design event-driven architecture using Observer and Strategy patterns.",
         "Event interface + Subject/Observable + Strategy for handlers. Compose for routing logic.",
         ["Event interface + Subject/Observable + Strategy pattern for handlers, compose for routing", "Only use inheritance for all event types", "Do not use interfaces at all", "Use static methods exclusively"]),
        ("Apply Dependency Inversion in layered Spring application.",
         "Define repository interfaces in domain layer. Implement in persistence. Service depends on interface, not impl.",
         ["Define repository interfaces in domain layer, implement in persistence, service depends on interface not impl", "Domain layer should depend on persistence impl", "Only outer layer should define interfaces", "DIP does not apply in Spring"]),
    ]
    for q, s, o in oop_s:
        Q("OOP Principles", q, s, o, "Senior", "Java")

# Stream API & Lambda
def gen_stream():
    Q("Stream API & Lambda", "What is Stream API in Java 8?",
      "Stream API provides functional approach to process sequences with lazy intermediate and terminal operations.",
      ["Functional approach for processing sequences with lazy intermediate (map/filter) and terminal (collect/forEach/reduce) operations", "Only processes collections sequentially", "Modifies the original collection", "Is only for parallel processing"], "Junior", "Java")
    Q("Stream API & Lambda", "What is a lambda expression in Java?",
      "Lambda expressions provide concise anonymous functions using arrow operator (->). Allow passing behavior as method arguments.",
      ["Anonymous function using arrow operator (->), allows passing behavior as arguments", "Is same as anonymous class with no difference", "Only works with abstract classes", "Cannot access final variables"], "Junior", "Java")
    Q("Stream API & Lambda", "What is difference between map() and flatMap() in Stream API?",
      "map() transforms each element to one new element (1:1). flatMap() transforms to stream and flattens all into one (1:n).",
      ["map is 1:1 transformation, flatMap is 1:n that flattens streams", "There is no difference", "flatMap only works with Lists", "map flattens while flatMap does not"], "Junior", "Java")

    Q("Stream API & Lambda", "Explain lazy evaluation in Stream API and short-circuiting terminal operations.",
      "Intermediate ops lazy until terminal triggers. Stateless process independently. Stateful consume full stream. Short-circuiting stops early.",
      ["Intermediate ops are lazy until terminal op; stateless process independently, stateful consume full stream", "All stream operations are eager", "Lazy evaluation means nothing is ever computed", "Short-circuiting only works with findFirst"], "Middle", "Java")
    Q("Stream API & Lambda", "How do collectors in Stream API work internally?",
      "Collector implements Supplier/Accumulator/Combiner/Finisher functions used by collect() terminal operation.",
      ["Collector interface with supplier/accumulator/combiner/finisher functions used by collect()", "Collectors only return Lists", "Collectors do not support parallel stream processing", "Collector is a functional interface with no methods"], "Middle", "Java")
    Q("Stream API & Lambda", "Differences between sequential and parallel streams?",
      "Sequential is one thread. Parallel splits across ForkJoinPool threads for large/compute-heavy data.",
      ["Sequential is one thread, parallel splits across ForkJoinPool threads for large/compute-heavy data", "Parallel streams are always faster", "Sequential streams can never be converted to parallel", "Parallel streams do not require thread-safe operations"], "Middle", "Java")

    Q("Stream API & Lambda", "Design custom Collector that accumulates elements into concurrent data structure for parallel streams.",
      "Implement Collector interface with ConcurrentHashMap.newKeySet as supplier, set::add accumulator, set1::addAll combiner.",
      ["Implement Collector with ConcurrentHashMap.newKeySet as supplier, set::add accumulator, set1::addAll combiner", "Just use Collections.synchronizedSet", "Custom Collectors cannot work in parallel streams", "Do not implement combiner at all"], "Senior", "Java")
    Q("Stream API & Lambda", "Explain Stream spliterator for enabling parallel processing and custom Spliterator implementation.",
      "Spliterator partitions data for parallel processing. Provides trySplit/tryAdvance/estimateSize/characteristics.",
      ["Spliterator provides trySplit/tryAdvance/estimateSize/characteristics for data partitioning in parallel streams", "Spliterator is only used for sequential streams", "trySplit is optional and never used", "Spliterator cannot be implemented for custom data structures"], "Senior", "Java")
    Q("Stream API & Lambda", "How optimize stream performance for large datasets avoiding boxing overhead?",
      "Use primitive streams (IntStream/LongStream/DoubleStream), mapToInt/mapToLong/mapToDouble, Spliterator over primitive arrays.",
      ["Use primitive streams (IntStream/LongStream/DoubleStream), mapToInt/mapToLong etc., specialized collectors, Spliterator over primitives", "Boxing is unavoidable in Java streams", "Use Stream<Integer> directly", "There is no way to avoid boxing"], "Senior", "Java")

gen_java()
gen_java_middle()
gen_java_senior()
gen_java_collections_junior()
gen_java_collections_middle()
gen_java_multithreading_junior()
gen_java_multithreading_middle()
gen_java_multithreading_senior()
gen_spring()
gen_jvm()
gen_exceptions()
gen_oop()
gen_stream()

print(f"Java questions generated: {len(all_q)}")