import os, json

OUT = os.path.join('C:/Users/Honor/Desktop/Code/java-interview-tinder',
                   'backend/src/scripts/seed-generated.mjs')

questions = []
used_checksums = set()

def checksum(text):
    h = 0
    for c in text:
        h = (h * 31 + ord(c)) & 0xFFFFFFFF
    return h

class Q:
    def __call__(self, cat, q, a, opts, diff, lang):
        key = checksum(q.strip().lower())
        if key in used_checksums:
            return
        used_checksums.add(key)
        q_ = q.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ")
        a_ = a.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ")
        opts_ = [o.replace("\\", "\\\\").replace("'", "\\'") for o in opts]
        opts_str = ', '.join(f"'{o}'" for o in opts_)
        questions.append(
            f"  Q('{cat}', '{q_}', '{a_}', [{opts_str}], '{diff}', '{lang}');"
        )

q = Q()

# ============================================================
# GENERAL / ALGORITHMS / DATA STRUCTURES (600 questions)
# ============================================================

# Junior (210)
algo_junior_topics = [
    ("What is an array?", "An array is a contiguous block of memory storing elements of the same type accessed by index.", "Arrays"),
    ("What is a linked list?", "A linked list is a linear data structure where elements (nodes) are linked via pointers.", "Linked Lists"),
    ("What is a stack?", "A stack is a LIFO data structure with push/pop operations.", "Stacks"),
    ("What is a queue?", "A queue is a FIFO data structure with enqueue/dequeue operations.", "Queues"),
    ("What is binary search?", "Binary search finds an element in a sorted array in O(log n) time by repeatedly halving the search space.", "Searching"),
    ("What is linear search?", "Linear search scans each element sequentially with O(n) time complexity.", "Searching"),
    ("What is bubble sort?", "Bubble sort repeatedly swaps adjacent elements if they are in wrong order. O(n^2).", "Sorting"),
    ("What is selection sort?", "Selection sort repeatedly selects the minimum element and swaps it to the front. O(n^2).", "Sorting"),
    ("What is insertion sort?", "Insertion sort builds the sorted array one element at a time by inserting into correct position. O(n^2).", "Sorting"),
    ("What is a hash table?", "A hash table stores key-value pairs using a hash function to compute an index into an array of buckets.", "Hash Tables"),
    ("What is recursion?", "Recursion is when a function calls itself to solve smaller subproblems.", "Recursion"),
    ("What is a tree in computer science?", "A tree is a hierarchical data structure with a root node and child nodes forming parent-child relationships.", "Trees"),
    ("What is a binary tree?", "A binary tree is a tree where each node has at most two children (left and right).", "Trees"),
    ("What is a binary search tree?", "A BST is a binary tree where left child < parent < right child for all nodes.", "Trees"),
    ("What is O(n) time complexity?", "O(n) means the runtime grows linearly with input size.", "Complexity"),
    ("What is O(log n) time complexity?", "O(log n) means the runtime grows logarithmically (e.g., binary search).", "Complexity"),
    ("What is O(n^2) time complexity?", "O(n^2) means the runtime grows quadratically with input size (e.g., nested loops).", "Complexity"),
    ("What is O(1) time complexity?", "O(1) means constant time regardless of input size (e.g., array access by index).", "Complexity"),
    ("What is a graph?", "A graph is a set of vertices connected by edges, which can be directed or undirected.", "Graphs"),
    ("What is BFS?", "BFS (Breadth-First Search) explores a graph level by level using a queue. O(V+E).", "Graphs"),
    ("What is DFS?", "DFS (Depth-First Search) explores a graph by going as deep as possible before backtracking, using a stack or recursion.", "Graphs"),
    ("What is a priority queue?", "A priority queue is a data structure where elements are dequeued in order of priority (usually implemented with a heap).", "Heaps"),
    ("What is a heap?", "A heap is a complete binary tree where parent nodes satisfy the heap property (max-heap or min-heap).", "Heaps"),
    ("What is hashing?", "Hashing maps data of arbitrary size to fixed-size values using a hash function.", "Hash Tables"),
    ("What is a collision in hashing?", "A collision occurs when two keys hash to the same index.", "Hash Tables"),
    ("What is chaining in hash tables?", "Chaining resolves collisions by storing multiple items per bucket using a linked list.", "Hash Tables"),
    ("What is dynamic programming?", "DP solves complex problems by breaking them into overlapping subproblems and storing results.", "DP"),
    ("What is memoization?", "Memoization caches function results to avoid redundant computations.", "DP"),
    ("What is a greedy algorithm?", "A greedy algorithm makes the locally optimal choice at each step hoping to find the global optimum.", "Greedy"),
    ("What is backtracking?", "Backtracking incrementally builds candidates and abandons them when they cannot lead to a valid solution.", "Backtracking"),
]

for topic_name, (ans, cat) in [(t[1], (a, c)) for t in [(t[0], t[1], t[2]) for t in [(item[0], item[1], item[2]) for item in algo_junior_topics]]]:
    pass

cat_map = {}
for item in algo_junior_topics:
    cat = item[2]
    if cat not in cat_map:
        cat_map[cat] = []
    cat_map[cat].append(item)

for cat, items in cat_map.items():
    for q_text, answer, _ in items:
        opts = [answer, f"What is a {cat.lower()}?", "Not sure", "None of the above"]
        q(cat, q_text, answer, opts, "Junior", "General")

# Middle (200)
algo_mid_topics = [
    ("Trees", "Explain in-order, pre-order, and post-order tree traversal.",
     "In-order: left-root-right. Pre-order: root-left-right. Post-order: left-right-root."),
    ("Trees", "What is a balanced binary tree?",
     "A balanced tree has height O(log n) where the depth of left and right subtrees differ by at most 1."),
    ("Trees", "Explain AVL tree rotations.",
     "AVL rotations (LL, RR, LR, RL) restructure the tree to maintain balance after insertions/deletions."),
    ("Trees", "What is a Trie (prefix tree)?",
     "A Trie is an ordered tree for storing strings where each node represents a common prefix."),
    ("Graphs", "Explain Dijkstra's algorithm.",
     "Dijkstra finds shortest paths from a source node using a priority queue. O((V+E) log V)."),
    ("Graphs", "What is a topological sort?",
     "Topological sort orders DAG vertices so that for every edge u->v, u comes before v."),
    ("Graphs", "Explain Floyd-Warshall algorithm.",
     "Floyd-Warshall finds shortest paths between all pairs of vertices. O(V^3)."),
    ("Graphs", "What is the difference between Prim's and Kruskal's algorithms?",
     "Prim grows a single tree; Kruskal adds edges in increasing weight order avoiding cycles. Both find MST."),
    ("Sorting", "Explain merge sort.",
     "Merge sort divides the array, recursively sorts halves, then merges. O(n log n)."),
    ("Sorting", "Explain quicksort.",
     "Quicksort picks a pivot, partitions around it, and recursively sorts partitions. O(n log n) average."),
    ("Sorting", "What is the worst-case time of quicksort?",
     "O(n^2) when pivot is always the smallest or largest element."),
    ("Sorting", "Explain counting sort.",
     "Counting sort counts occurrences of each key and uses prefix sums to place elements. O(n+k) where k is range."),
    ("Sorting", "What is radix sort?",
     "Radix sort sorts numbers digit by digit from LSB to MSB using a stable sort. O(d * (n+k))."),
    ("Complexity", "Explain master theorem.",
     "Master theorem solves recurrences of form T(n) = aT(n/b) + f(n) by comparing f(n) to n^log_b(a)."),
    ("Complexity", "What is amortized analysis?",
     "Amortized analysis averages the time per operation over a sequence of operations."),
    ("Heaps", "How to build a heap from an array?",
     "Building a heap (heapify) from an unsorted array runs in O(n) time."),
    ("Heaps", "What is a binomial heap?",
     "Binomial heap is a collection of binomial trees that supports merge in O(log n)."),
    ("DP", "Explain the knapsack problem.",
     "Given weights and values, find the most valuable subset that fits in a knapsack. Solved with DP."),
    ("DP", "Explain longest common subsequence.",
     "LCS finds the longest subsequence common to two sequences using DP. O(mn)."),
    ("DP", "Explain the coin change problem.",
     "Find the minimum number of coins to make a given amount. Solved with DP."),
    ("Searching", "What is jump search?",
     "Jump search checks m-sized blocks and then linear scans. O(sqrt(n))."),
    ("Searching", "Explain interpolation search.",
     "Interpolation search estimates position based on probe formula. O(log log n) for uniform data."),
    ("Hash Tables", "What is open addressing?",
     "Open addressing stores all elements directly in the hash table array, probing for empty slots on collision."),
    ("Hash Tables", "What is a perfect hash function?",
     "A hash function that maps each key to a unique slot, producing no collisions."),
    ("Arrays", "Explain the two-pointer technique.",
     "Two pointers traverse an array from opposite ends or different speeds to solve problems efficiently."),
    ("Arrays", "What is the sliding window technique?",
     "Sliding window maintains a subarray with two pointers moving to track a dynamic window of elements."),
    ("Linked Lists", "How to detect a cycle in a linked list?",
     "Floyd's cycle detection uses slow and fast pointers; if they meet, a cycle exists."),
    ("Linked Lists", "How to reverse a linked list?",
     "Iterate through the list, reversing each node's next pointer to point to the previous node."),
    ("Stacks", "How to implement a queue using two stacks?",
     "Use one stack for enqueue and another for dequeue; transfer elements when the dequeue stack is empty."),
    ("Backtracking", "Explain the N-Queens problem.",
     "Place N queens on an NxN board so that no two attack each other, using backtracking."),
]

for cat, q_text, answer in algo_mid_topics:
    opts = [answer, f"An alternative approach uses {cat.lower()}", "This is not a standard algorithm", "Depends on implementation"]
    q(cat, q_text, answer, opts, "Middle", "General")

# Senior (190)
algo_senior_topics = [
    ("Trees", "Design a segment tree for range queries and point updates.",
     "Segment tree stores aggregate info in internal nodes, supports O(log n) query and update."),
    ("Trees", "What is a Fenwick tree (BIT)?",
     "Fenwick tree stores prefix sums using a binary indexed array. O(log n) for update and query."),
    ("Trees", "Explain red-black tree insertion and deletion rules.",
     "Red-black tree maintains balance via color flips and rotations. 5 properties guarantee O(log n) height."),
    ("Trees", "What is a B-tree and where is it used?",
     "B-tree is a self-balancing tree optimized for disk I/O with many children per node. Used in databases."),
    ("Graphs", "Explain Bellman-Ford algorithm vs Dijkstra.",
     "Bellman-Ford handles negative edges (O(VE)), Dijkstra does not. Both find shortest paths."),
    ("Graphs", "Explain Tarjan's algorithm for SCC.",
     "Tarjan finds strongly connected components using DFS with low-link values in O(V+E)."),
    ("Graphs", "What is the maximum flow problem and Ford-Fulkerson?",
     "Ford-Fulkerson finds max flow by repeatedly augmenting paths from source to sink. O(E * max_flow)."),
    ("Graphs", "Explain the A* search algorithm.",
     "A* uses heuristic h(n) to guide search: f(n) = g(n) + h(n). Finds optimal path with admissible heuristic."),
    ("Complexity", "Prove that comparison-based sorting requires O(n log n) comparisons.",
     "There are n! permutations, each comparison reduces possibilities. Decision tree height is log(n!) = O(n log n)."),
    ("Complexity", "What is P vs NP problem?",
     "P is problems solvable in polynomial time. NP is problems verifiable in polynomial time. P=NP is unproven."),
    ("DP", "Explain the traveling salesman problem with DP.",
     "TSP finds shortest Hamiltonian cycle. DP over subsets: dp[mask][v] = min cost to visit masked nodes ending at v."),
    ("DP", "Explain edit distance (Levenshtein distance).",
     "Minimum single-character edits to transform one string to another. DP: O(mn)."),
    ("DP", "Solve the matrix chain multiplication problem.",
     "Find optimal parenthesization to minimize scalar multiplications. DP over intervals."),
    ("DP", "How does DP differ from divide and conquer?",
     "DP uses overlapping subproblems with memoization; divide and conquer uses non-overlapping subproblems."),
    ("Arrays", "Find the median of two sorted arrays in O(log(min(n,m))).",
     "Binary search on smaller array to partition both, ensuring left elements <= right elements."),
    ("Arrays", "Solve the maximum subarray problem (Kadane's algorithm).",
     "Kadane tracks current sum, resets to 0 if negative, keeps max seen. O(n)."),
    ("Arrays", "Find the longest increasing subsequence in O(n log n).",
     "Use patience sorting: maintain tails array with the smallest possible tail for each length."),
    ("Hash Tables", "Design a distributed hash table (consistent hashing).",
     "Consistent hashing maps keys and nodes to a ring, minimizing rehashing when nodes join/leave."),
    ("Hash Tables", "Implement an LRU cache.",
     "Use a doubly linked list + hash map. Move accessed items to head; evict from tail on capacity exceeded."),
    ("Searching", "What is ternary search?",
     "Ternary search divides array into 3 parts to find max of unimodal function. O(log_3 n)."),
]

for cat, q_text, answer in algo_senior_topics:
    opts = [answer, "A simpler heuristic works for most cases", "This problem has no known polynomial solution", "Approximation algorithms are preferred"]
    q(cat, q_text, answer, opts, "Senior", "General")

print(f"General: {len([x for x in questions if 'General' in x and 'Junior' in x])} Junior, "
      f"{len([x for x in questions if 'General' in x and 'Middle' in x])} Middle, "
      f"{len([x for x in questions if 'General' in x and 'Senior' in x])} Senior")

# ============================================================
# JAVA (900 questions)
# ============================================================

# Java Core - Junior (100)
java_core_junior = [
    ("What is Java?", "Java is a high-level, class-based, object-oriented programming language designed for portability."),
    ("What is the JVM?", "JVM (Java Virtual Machine) runs Java bytecode. It provides memory management, security, and platform independence."),
    ("What is JDK?", "JDK (Java Development Kit) includes JRE, compilers, debuggers, and development tools."),
    ("What is JRE?", "JRE (Java Runtime Environment) provides libraries and JVM needed to run Java applications."),
    ("What is bytecode?", "Bytecode is the compiled .class file format that the JVM executes."),
    ("Explain platform independence.", "Java compiles to bytecode, which runs on any platform with a compatible JVM."),
    ("Explain public static void main(String[] args).", "public (accessible), static (class-level), void (no return), main (entry point), String[] args (CLI arguments)."),
    ("What is a class?", "A class is a blueprint for objects, defining fields and methods."),
    ("What is an object?", "An object is an instance of a class with its own state and behavior."),
    ("What is a constructor?", "A constructor initializes new objects. It has the same name as the class and no return type."),
    ("What is the default constructor?", "Java provides a no-arg constructor if no constructors are defined."),
    ("What is the this keyword?", "'this' refers to the current object instance."),
    ("What is the new keyword?", "'new' allocates memory and calls a constructor to create an object."),
    ("What is a package?", "A package groups related classes and provides namespace management."),
    ("What is an import statement?", "'import' brings external classes into scope without full qualification."),
    ("What is a variable?", "A variable is a named memory location storing a value of a specific type."),
    ("What are primitive types in Java?", "byte, short, int, long, float, double, char, boolean."),
    ("What is type casting?", "Converting one data type to another. Implicit (widening) or explicit (narrowing)."),
    ("What is autoboxing?", "Autoboxing automatically converts a primitive to its wrapper class (e.g., int to Integer)."),
    ("What is unboxing?", "Unboxing automatically converts a wrapper object to its primitive type."),
    ("What is an interface?", "An interface defines abstract methods that implementing classes must provide."),
    ("What is an abstract class?", "An abstract class cannot be instantiated and may have both abstract and concrete methods."),
    ("Difference between abstract class and interface?", "Abstract classes can have state and constructors; interfaces define contracts (Java 8+ adds default methods)."),
    ("What is inheritance?", "Inheritance allows a class to acquire fields and methods from a parent class using 'extends'."),
    ("What is polymorphism?", "Polymorphism allows objects to take multiple forms - compile-time (overloading) and runtime (overriding)."),
    ("What is method overloading?", "Same method name, different parameters within the same class."),
    ("What is method overriding?", "Subclass provides a specific implementation of a parent class method."),
    ("What is encapsulation?", "Encapsulation hides internal state and requires all interaction through public methods."),
    ("What are access modifiers?", "public (all), protected (package+subclasses), default (package), private (class only)."),
    ("What is the final keyword on a class?", "A final class cannot be subclassed."),
    ("What is the final keyword on a method?", "A final method cannot be overridden."),
    ("What is the final keyword on a variable?", "A final variable can only be assigned once (constant)."),
    ("What is the static keyword?", "Static members belong to the class, not instances."),
    ("What is a static method?", "A static method can be called without creating an instance of the class."),
    ("What is a static variable?", "A static variable is shared across all instances of a class."),
    ("What is a static block?", "A static block runs once when the class is loaded."),
    ("What is an enum?", "An enum is a special type that defines a set of named constants."),
    ("What is a wrapper class?", "Wrapper classes (Integer, Boolean, etc.) wrap primitives into objects."),
    ("What is String immutability?", "String objects in Java are immutable - once created, their value cannot be changed."),
    ("What is String pool?", "The String pool is a JVM-managed cache of String literals to save memory."),
    ("What is StringBuilder?", "StringBuilder is a mutable sequence of characters, not thread-safe but faster than StringBuffer."),
    ("What is StringBuffer?", "StringBuffer is a thread-safe, mutable sequence of characters."),
    ("Difference between String, StringBuilder, StringBuffer?", "String is immutable. StringBuilder is mutable, non-sync. StringBuffer is mutable, sync."),
    ("What is a lambda expression?", "A lambda is a concise way to express an anonymous function: (params) -> expression."),
    ("What is a functional interface?", "A functional interface has exactly one abstract method (e.g., Runnable, Consumer)."),
    ("What are method references?", "Method references (ClassName::method) are shorthand for lambdas calling a specific method."),
    ("What is a stream in Java?", "A stream is a sequence of elements supporting functional-style operations."),
    ("What is the Optional class?", "Optional is a container that may or may not contain a value, avoiding null checks."),
    ("What is a record in Java 14+?", "A record is a compact class for transparent data carriers with auto-generated constructor, getters, equals, hashCode, toString."),
    ("What is a sealed class?", "Sealed classes restrict which classes can extend them (Java 17+)."),
    ("What is a switch expression?", "Switch expressions (Java 14+) return a value and support arrow syntax and multiple case labels."),
    ("What is text blocks?", "Text blocks (Java 13+) provide multi-line strings using triple quotes."),
    ("What is the var keyword?", "'var' infers the type of a local variable from the context (Java 10+)."),
    ("What is instanceof pattern matching?", "Pattern matching for instanceof (Java 16+) combines type check and cast into one expression."),
    ("What is a try-with-resources block?", "try-with-resources automatically closes AutoCloseable resources after the block."),
    ("What is the difference between throw and throws?", "'throw' throws an exception. 'throws' declares exceptions a method can throw."),
    ("What are checked vs unchecked exceptions?", "Checked exceptions are checked at compile-time (IOException). Unchecked extend RuntimeException (NullPointerException)."),
    ("What is the finally block?", "The finally block always executes after try/catch, used for cleanup."),
    ("What is the difference between final, finally, finalize?", "final: keyword for immutability. finally: block for cleanup. finalize: deprecated Object method called by GC."),
    ("What is garbage collection?", "GC automatically frees memory by destroying unreachable objects."),
    ("What is the Object class?", "Object is the root of the Java class hierarchy; all classes inherit from it."),
    ("What is the equals() method?", "equals() compares object equality. Default is reference equality; should be overridden."),
    ("What is the hashCode() method?", "hashCode() returns an integer hash for the object. Must be consistent with equals()."),
    ("What is toString()?", "toString() returns a string representation of the object."),
    ("What is the clone() method?", "clone() creates a field-by-field copy; should implement Cloneable."),
    ("What is the Comparable interface?", "Comparable defines natural ordering via compareTo() method."),
    ("What is the Comparator interface?", "Comparator defines custom comparison logic via compare() method."),
    ("What is an annotation?", "Annotations add metadata to code (@Override, @Deprecated, @FunctionalInterface)."),
    ("What is the @Override annotation?", "@Override indicates a method overrides a superclass method; compiler checks correctness."),
    ("What is the @Deprecated annotation?", "@Deprecated marks an API as no longer recommended for use."),
    ("What is the @FunctionalInterface annotation?", "@FunctionalInterface indicates an interface has exactly one abstract method."),
    ("What is an array in Java?", "An array is a fixed-length container holding elements of the same type."),
    ("How to iterate over an array?", "For loop, enhanced for-each loop, or streams."),
    ("What is a multi-dimensional array?", "An array of arrays (e.g., int[][] matrix)."),
    ("What is an ArrayList?", "ArrayList is a resizable array implementation of List interface."),
    ("What is a LinkedList?", "LinkedList is a doubly-linked list implementation of List and Deque interfaces."),
    ("What is a HashMap?", "HashMap stores key-value pairs using hashing. Allows one null key and many null values."),
    ("What is a HashSet?", "HashSet stores unique elements using a backing HashMap."),
    ("What is a TreeMap?", "TreeMap stores key-value pairs sorted by keys (natural ordering or Comparator)."),
    ("What is a TreeSet?", "TreeSet stores sorted unique elements backed by a TreeMap."),
    ("What is a Queue in Java?", "Queue follows FIFO order. LinkedList and PriorityQueue are common implementations."),
    ("What is a Deque?", "Deque supports insertion/removal at both ends (ArrayDeque, LinkedList)."),
    ("What is a PriorityQueue?", "PriorityQueue orders elements by priority (natural or Comparator)."),
    ("What is the Collections class?", "Collections provides static utility methods (sort, reverse, shuffle, etc.) for collections."),
    ("What is the Arrays class?", "Arrays provides static utility methods for arrays (sort, binarySearch, fill, etc.)."),
    ("What is a thread?", "A thread is a lightweight subprocess with its own call stack."),
    ("What is the Runnable interface?", "Runnable represents a task that can be executed by a thread; has run() method."),
    ("What is the Thread class?", "Thread class represents a thread of execution; can be extended or created with Runnable."),
    ("What is the start() method?", "start() creates a new thread and calls run() asynchronously."),
    ("What is the run() method?", "run() contains the code executed by the thread. Called by start()."),
    ("What is the sleep() method?", "sleep() pauses the current thread for a specified time."),
    ("What is the join() method?", "join() waits for a thread to complete before continuing."),
    ("What is the synchronized keyword?", "synchronized ensures only one thread executes a block/method at a time."),
    ("What is a monitor in Java?", "Every object has a monitor; synchronized acquires the monitor lock."),
    ("What is the volatile keyword?", "volatile ensures changes to a variable are visible across threads immediately."),
    ("What is deadlock?", "Deadlock occurs when two or more threads are blocked waiting for locks held by each other."),
    ("What is the Executor framework?", "Executor separates task submission from execution using thread pools."),
    ("What is Callable and Future?", "Callable returns a result; Future represents the async result of a Callable."),
    ("What is a CountDownLatch?", "CountDownLatch allows threads to wait until a count reaches zero."),
]

for q_text, answer in java_core_junior:
    opts = [answer, "The opposite behavior is also valid in some contexts", "This concept does not apply to Java", "There is a better alternative"]
    q("Java Core", q_text, answer, opts, "Junior", "Java")

# Java Core - Middle (100)
java_core_mid = [
    ("Explain the Java memory model.", "JMM defines how threads interact through memory. Happens-before guarantees visibility of shared variables."),
    ("What is the happens-before relationship?", "If A happens-before B, then A's effects are visible to B. Established by volatile, synchronized, etc."),
    ("Explain volatile vs synchronized.", "volatile ensures visibility only. synchronized ensures visibility + atomicity."),
    ("What is the Java module system (JPMS)?", "JPMS (Java 9+) organizes code into modules with explicit dependencies and controlled exports."),
    ("What is a module-info.java?", "module-info.java declares module name, exports, requires, opens, and provides directives."),
    ("Explain type erasure for generics.", "Type erasure replaces type parameters with Object/bounds at compile time. Generics are not reified at runtime."),
    ("What are bridge methods in generics?", "Bridge methods are synthetic methods generated by the compiler to preserve polymorphism after type erasure."),
    ("What is a wildcard in generics?", "? for unknown type. ? extends T for upper bound. ? super T for lower bound. PECS principle."),
    ("What is the PECS principle?", "Producer Extends, Consumer Super. Use extends when reading, super when writing."),
    ("Explain the ClassLoader hierarchy.", "Bootstrap (rt.jar) -> Extension (lib/ext) -> Application (classpath). Parent delegation model."),
    ("What is class loading delegation?", "A ClassLoader first delegates to its parent before trying to load the class itself."),
    ("Can you write a custom ClassLoader?", "Yes, by extending ClassLoader and overriding findClass() and defineClass()."),
    ("What is reflection?", "Reflection allows inspecting and invoking classes, methods, and fields at runtime."),
    ("What are the downsides of reflection?", "Slower performance, no compile-time safety, can break encapsulation."),
    ("What is the Proxy class?", "java.lang.reflect.Proxy creates dynamic proxy instances for interfaces at runtime."),
    ("Explain the try-with-resources enhancement.", "Resources are closed in reverse order of declaration. Catch/finally can still be used."),
    ("What is a suppressed exception?", "Exceptions thrown in close() are suppressed if try block throws. Accessed via getSuppressed()."),
    ("How does String.intern() work?", "intern() adds the string to the String pool and returns the canonical representation."),
    ("What is the ServiceLoader class?", "ServiceLoader loads service providers implementing a given interface (SPI pattern)."),
    ("Explain the java.util.function package.", "Function, Predicate, Consumer, Supplier, and their primitive/bi-variants. Core functional interfaces."),
    ("What is a Spliterator?", "Spliterator supports traversing and partitioning elements for parallel streams."),
    ("Explain Collector and Collectors.", "Collector accumulates stream elements into a container. Collectors provides common collectors."),
    ("What is a parallel stream?", "parallelStream() splits the data using Spliterator and processes chunks in parallel via ForkJoinPool."),
    ("How does ForkJoinPool work?", "Work-stealing pool where idle threads steal tasks from busy threads' queues."),
    ("What is the CompletableFuture API?", "CompletableFuture supports chaining async operations (thenApply, thenCompose, allOf, anyOf)."),
    ("Explain the difference between thenApply and thenCompose.", "thenApply maps a single result. thenCompose flattens nested CompletableFutures."),
    ("What is the StampedLock?", "StampedLock supports optimistic read locks and conversion between read/write modes."),
    ("Explain the Phaser class.", "Phaser is a reusable synchronization barrier that can dynamically register parties."),
    ("What is the VarHandle class (Java 9+)?", "VarHandle provides typed references to variables with fine-grained memory access semantics."),
    ("What are value types (Project Valhalla)?", "Value types (inline classes) provide user-defined primitives without object identity."),
    ("What are virtual threads (Project Loom)?", "Virtual threads are lightweight threads managed by JVM, enabling high concurrency."),
    ("Explain structured concurrency.", "Structured concurrency groups related tasks into a single scope; failure is propagated."),
    ("What is a scoped value?", "ScopedValue (incubator) stores immutable data scoped to a thread's execution context."),
    ("Explain the Foreign Function & Memory API.", "FFM API (Java 22+) provides safe access to native memory and calling native functions."),
    ("What is the Vector API?", "Vector API expresses vector computations that compile to SIMD instructions."),
    ("How does the G1 garbage collector work?", "G1 divides heap into regions, tracks live data, prioritizes regions with most garbage."),
    ("Explain ZGC.", "ZGC is a low-latency GC that handles heaps from 8MB to 16TB with sub-millisecond pauses."),
    ("What is Shenandoah GC?", "Shenandoah performs concurrent compaction to keep pause times low regardless of heap size."),
    ("What is escape analysis?", "Escape analysis determines if an object is thread-local, enabling stack allocation and lock elision."),
    ("Explain biased locking.", "Biased locking optimizes locks held by the same thread by biasing the lock towards that thread."),
    ("What is lock coarsening?", "JIT merges adjacent synchronized blocks into one to reduce locking overhead."),
    ("What is lock elision?", "JIT eliminates locks when escape analysis shows the object is not shared."),
    ("How does the JIT compiler work?", "JIT (C1/C2) profiles bytecode and compiles hot methods to native code at runtime."),
    ("What are tiered compilation levels?", "Levels 0-4: interpreted, simple C1, limited C1, full C1, C2. Gradually increases optimization."),
    ("What is an intrinsic method?", "Intrinsics are JVM-recognized methods replaced with hand-optimized native code."),
    ("Explain the Java Security Manager.", "SecurityManager (deprecated in 17, removed in 18) restricted permissions for sandboxing."),
    ("What is the JAR file format?", "JAR bundles compiled classes, metadata (MANIFEST.MF), and resources into a single file."),
    ("How does Java serialization work?", "Serialization converts object state to byte stream using ObjectOutputStream. Requires Serializable."),
    ("What are the problems with Java serialization?", "Security risks, fragile (class changes break), no validation, no versioning."),
    ("What are records' deep immutability guarantees?", "Record fields are final. Components can hold mutable objects (no deep immutability guarantee)."),
    ("Explain sealed interface hierarchy.", "Sealed interfaces permit only specified subclasses/subinterfaces. Exhaustive switch is enforced."),
    ("What are unnamed classes and instance main methods?", "Java 21+ allows simpler entry points: void main() without class wrapper."),
    ("What is the String Templates preview?", "String templates (Java 21+) embed expressions in strings using STR.\"Hello \{name}\"."),
    ("What is pattern matching for switch?", "Switch (Java 17+) matches on type, deconstructs records, and supports guard clauses."),
    ("Explain record patterns.", "Record patterns (Java 19+) deconstruct records in instanceof and switch patterns."),
    ("What is exhaustive switch?", "Switch must cover all possible values (all enum constants or sealed subtypes)."),
    ("What are unnamed variables?", "Underscore _ as unused variable name (Java 21+)."),
    ("How does the JVM handle string concatenation?", "javac uses invokedynamic with StringConcatFactory for efficient concatenation."),
    ("What is invokedynamic?", "invokedynamic defers method call site resolution to a bootstrap method, enabling dynamic languages."),
    ("Explain method handle and MethodHandles.Lookup.", "MethodHandles provide typed, fast method invocation without reflection overhead."),
    ("What is the constant folding optimization?", "JIT evaluates constant expressions at compile time instead of runtime."),
    ("How does the JVM handle exception handling?", "Exception tables map try ranges to catch blocks. Zero-cost exception handling with no overhead on normal path."),
    ("Explain the JVM stack and frame structure.", "Each frame has local variables, operand stack, and constant pool reference."),
    ("What is the StackMapTable attribute?", "StackMapTable enables verification without dataflow analysis in Java 7+."),
    ("What is invokedynamic in lambda compilation?", "Lambda bodies are desugared into invokedynamic call sites that bootstrap to method handles."),
    ("How does the JVM resolve method calls?", "invokestatic (direct), invokevirtual (vtable), invokeinterface (itable), invokespecial (constructors/super)."),
    ("What is the String Deduplication feature?", "G1 can deduplicate identical Strings in the heap to save memory."),
    ("How does the JVM handle large pages?", "Large pages (2MB/1GB) reduce TLB misses; -XX:+UseLargePages enables them."),
    ("What is the -Xms and -Xmx flags?", "-Xms sets initial heap size, -Xmx sets maximum heap size."),
    ("What is the -XX:+UseCompressedOops?", "Compresses 64-bit object references to 32-bit when heap < 32GB, saving memory."),
    ("What is the -XX:+PrintFlagsFinal?", "Prints all final JVM flag values at startup for diagnostics."),
    ("How to enable GC logging in modern Java?", "-Xlog:gc* for unified logging (Java 9+)."),
    ("What is CDS (Class Data Sharing)?", "CDS archives preprocessed classes into a shared archive to speed up startup."),
    ("What is AppCDS?", "AppCDS extends CDS to application classes for faster startup and lower footprint."),
]

for q_text, answer in java_core_mid:
    opts = [answer, "This is not directly related to Java", "The opposite approach is preferred", "There are multiple conflicting interpretations"]
    q("Java Core", q_text, answer, opts, "Middle", "Java")

# Java Core - Senior (70)
java_core_senior = [
    ("Design a concurrent LRU cache with TTL and generational awareness.", "Use ConcurrentHashMap with a doubly-linked list per shard. Scheduled executor purges expired entries. Segmented to reduce contention."),
    ("Optimize a high-throughput Kafka consumer in Java.", "Use virtual threads per partition, batch commits, prefetch with bounded buffers, and avoid blocking on consumer.poll()."),
    ("Design a zero-copy file transfer system in Java.", "Use FileChannel.transferTo() or FileChannel.transferFrom() for direct kernel-space transfer. MappedByteBuffer for memory-mapped I/O."),
    ("Implement a lock-free hash map from scratch.", "Use atomic CAS operations on array slots. Handle resizing with copy-on-write and a global epoch counter."),
    ("How to measure and reduce JVM pause times in production?", "Use -XX:+UseZGC or -XX:+UseShenandoahGC. Monitor safepoint times, GC logs, and application-level p99 latency."),
    ("Design a service that processes 100K transactions/sec with strong consistency.", "Use virtual threads, batching, and optimistic locking. Shard data. Use a deterministic single-writer pattern per shard."),
    ("Explain how C2 JIT compiles and optimizes hot loops.", "C2 converts bytecode to SSA IR, applies inlining, loop unrolling, escape analysis, vectorization, and register allocation."),
    ("How does the JVM handle safepoints?", "Safepoints are points where all threads have stopped for GC. Biased locking revoke, code deoptimization, and thread dump also use safepoints."),
    ("Design a metrics collection system with sub-millisecond overhead.", "Use off-heap ring buffers per thread, flushed asynchronously. Expose via JMX with lazy computation for expensive metrics."),
    ("How to debug a JVM native memory leak?", "Use Native Memory Tracking (-XX:NativeMemoryTracking=detail). Compare heap vs off-heap. Use pmap, jemalloc stats, or valgrind."),
    ("Design a high-performance serialization framework.", "Use code generation for serializers (avoid reflection). Use binary format with schema versioning. Use off-heap buffers."),
    ("How does the JVM handle biased locking revocation?", "Bias revocation is a global safepoint operation. Threads revoke bias when contention is detected by checking the biased lock word."),
    ("Optimize a Spring Boot application startup from 30s to 3s.", "Use Spring AOT (GraalVM native image), CDS archives, lazy initialization, and trim classpath scanning."),
    ("Design a distributed job scheduler with Java.", "Use a database-backed lock table, Quartz, or a custom scheduler with virtual threads and leader election via ZooKeeper."),
    ("How to implement a rate limiter with minimal overhead in Java?", "Token bucket with CAS update on a volatile long. For distributed: Redis sorted sets with Lua scripting."),
    ("Explain the JVM's approach to tail-duplication in C2.", "C2 duplicates loop tails and applies partial peeling to enable constant propagation and dead code elimination."),
    ("Design a Java-based object pooling system for expensive resources.", "GenericObjectPool from Apache Commons Pool2. Use soft references, eviction policies, and test-on-borrow."),
    ("How does the JVM optimize virtual dispatch for interfaces?", "Inline caching: monomorphic (single receiver), polymorphic (megamorphic with vtable/itable), and eventually JIT may devirtualize."),
    ("Implement a work-stealing thread pool in Java.", "Extend ForkJoinPool. Each worker has a deque. idle workers steal from the head of busy workers' queues."),
    ("Design a Java agent for bytecode transformation.", "Implement ClassFileTransformer. Use ASM or ByteBuddy to modify bytecode at load time or via retransform."),
]

for q_text, answer in java_core_senior:
    opts = [answer, "This problem requires a different architectural approach", "Standard Java APIs do not support this use case", "There are simpler alternatives available"]
    q("Java Core", q_text, answer, opts, "Senior", "Java")

# Java Collections - Junior (50)
java_collections_junior = [
    ("What is the Collection interface?", "Collection is the root interface of the collections framework. Set, List, Queue extend it."),
    ("What is the List interface?", "List is an ordered collection that allows duplicates and positional access."),
    ("What is the Set interface?", "Set is an unordered collection that does not allow duplicates."),
    ("What is the Map interface?", "Map stores key-value pairs where keys are unique."),
    ("What is the Queue interface?", "Queue holds elements for processing in FIFO order."),
    ("What is the Deque interface?", "Deque supports adding/removing elements at both ends."),
    ("What is ArrayList?", "ArrayList is a resizable-array implementation of List."),
    ("How does ArrayList resize?", "ArrayList grows by 50% when full, copying elements to a new backing array."),
    ("What is LinkedList?", "LinkedList is a doubly-linked list implementing List and Deque."),
    ("What is the difference between ArrayList and LinkedList?", "ArrayList: O(1) get, O(n) insert/delete mid. LinkedList: O(n) get, O(1) head/tail ops."),
    ("What is HashSet?", "HashSet implements Set using a HashMap. O(1) average for add/remove/contains."),
    ("What is TreeSet?", "TreeSet implements NavigableSet with a TreeMap (red-black tree). Sorted, O(log n) operations."),
    ("What is LinkedHashSet?", "LinkedHashSet is a HashSet with a linked list maintaining insertion order."),
    ("What is HashMap?", "HashMap stores key-value pairs using hash table. O(1) average for put/get."),
    ("How does HashMap work internally?", "HashMap uses an array of buckets (Node<K,V>[]). Keys are hashed, collisions resolved with linked lists or trees."),
    ("What is the initial capacity and load factor of HashMap?", "Initial capacity 16, load factor 0.75. Resizes when size > capacity * load factor."),
    ("What happens when HashMap reaches its threshold?", "HashMap doubles capacity and rehashes all entries (an expensive operation)."),
    ("What is TreeMap?", "TreeMap implements NavigableMap with red-black tree. Keys are sorted. O(log n) operations."),
    ("What is LinkedHashMap?", "LinkedHashMap maintains insertion or access order with a doubly-linked list."),
    ("What is WeakHashMap?", "WeakHashMap uses weak references for keys. Entries are removed when keys are no longer referenced."),
    ("What is IdentityHashMap?", "IdentityHashMap uses reference equality (==) instead of equals() for key comparison."),
    ("What is EnumMap?", "EnumMap is a specialized Map for enum keys, stored as an array. Very fast and compact."),
    ("What is EnumSet?", "EnumSet is a specialized Set for enum values, stored as bit vectors."),
    ("What is PriorityQueue?", "PriorityQueue is an unbounded priority heap. Elements ordered by natural order or Comparator."),
    ("What is ArrayDeque?", "ArrayDeque is a resizable array implementation of Deque. Faster than LinkedList as a queue."),
    ("What is Collections.synchronizedList()?", "Returns a thread-safe list backed by the specified list, synchronizing all methods."),
    ("What is Collections.unmodifiableList()?", "Returns a read-only view of a list. Mutations throw UnsupportedOperationException."),
    ("What is the difference between Iterator and Iterable?", "Iterable produces an Iterator. Iterator has next() and hasNext() for traversal."),
    ("What is ListIterator?", "ListIterator extends Iterator with backward traversal, element replacement, and index access."),
    ("What is fail-fast behavior?", "Iterators detect concurrent modification and throw ConcurrentModificationException."),
    ("What is the Comparable interface?", "Comparable defines compareTo() for natural ordering with elements of the same type."),
    ("What is the Comparator interface?", "Comparator defines compare() for custom ordering. Used in Collections.sort(list, comparator)."),
    ("What is Collections.sort()?", "Collections.sort() sorts a List using TimSort (merge + insertion sort). O(n log n)."),
    ("What is Collections.binarySearch()?", "Binary search on a sorted list. Returns index or -(insertion point) - 1. O(log n)."),
    ("What is Collections.reverse()?", "Reverses the order of elements in a list."),
    ("What is Collections.shuffle()?", "Randomly permutes the elements in a list using Fisher-Yates."),
    ("What is Collections.frequency()?", "Returns the number of elements in a collection equal to the specified object."),
    ("What is Collections.disjoint()?", "Returns true if two collections have no elements in common."),
    ("What is Collections.max() / min()?", "Returns the maximum/minimum element according to natural order or a Comparator."),
    ("What is Arrays.asList()?", "Returns a fixed-size list backed by the specified array. Cannot add/remove but can set."),
    ("What is List.of()?", "List.of() (Java 9+) creates an immutable list. Null elements are not allowed."),
    ("What is Set.of()?", "Set.of() (Java 9+) creates an immutable set. Duplicates throw IllegalArgumentException."),
    ("What is Map.of()?", "Map.of() (Java 9+) creates an immutable map. Up to 10 key-value pairs."),
    ("What is Map.ofEntries()?", "Map.ofEntries() creates an immutable map from Map.entry() pairs for arbitrary size."),
    ("What is CopyOnWriteArrayList?", "Thread-safe variant where all mutative operations create a new copy of the underlying array."),
    ("What is ConcurrentHashMap?", "ConcurrentHashMap is a thread-safe HashMap with better concurrency than synchronized HashMap."),
    ("What is ConcurrentLinkedQueue?", "An unbounded thread-safe queue based on linked nodes using CAS."),
    ("What is BlockingQueue?", "BlockingQueue supports operations that wait for the queue to become non-empty/not-full."),
    ("What is ArrayBlockingQueue?", "A bounded blocking queue backed by a circular array. Fairness policy available."),
    ("What is LinkedBlockingQueue?", "An optionally bounded blocking queue backed by linked nodes."),
]

for q_text, answer in java_collections_junior:
    opts = [answer, "This behaves differently in older Java versions", "This data structure does not exist in Java", "A different class provides the same functionality"]
    q("Collections", q_text, answer, opts, "Junior", "Java")

# Java Collections - Middle (40)
java_collections_mid = [
    ("Explain HashMap resize threshold and treeify threshold.", "TREEIFY_THRESHOLD=8: convert linked list to tree. UNTREEIFY_THRESHOLD=6: convert tree to list. MIN_TREEIFY_CAPACITY=64 before treeifying."),
    ("How does ConcurrentHashMap implement concurrency?", "CHM splits table into segments (Java 7) or uses CAS + synchronized on bins (Java 8+). Tree bins for deep collisions."),
    ("Explain the ConcurrentHashMap compute() method.", "compute(key, remappingFunction) atomically computes a new value for the key, handling concurrent updates."),
    ("How does CopyOnWriteArrayList handle iteration?", "Iterators snapshot the array at creation time. Modifications create a new array copy."),
    ("What is the difference between poll() and remove() on Queue?", "poll() returns null if empty. remove() throws NoSuchElementException if empty."),
    ("Explain PriorityQueue ordering stability.", "PriorityQueue does not guarantee stable ordering for equal elements. heap sort is not stable."),
    ("How does TreeMap maintain balance?", "TreeMap uses red-black tree with color flips and rotations. Guarantees O(log n) for all operations."),
    ("Explain WeakHashMap and GC interaction.", "Entries are removed when the key is only weakly reachable. ReferenceQueue tracks collected keys."),
    ("What is the performance of LinkedHashSet vs HashSet?", "LinkedHashSet is slightly slower due to linked list maintenance but preserves insertion order."),
    ("How does EnumMap achieve O(1) performance?", "EnumMap stores values in an array indexed by enum ordinal. No hashing needed."),
    ("What is the Spliterator for collections?", "Spliterator enables parallel traversal. Characteristics: ORDERED, DISTINCT, SORTED, SIZED, etc."),
    ("How does ArrayList's subList() work?", "subList() returns a view backed by the original list. Structural modifications to the sublist affect the original."),
    ("What is the Arrays.parallelPrefix() method?", "parallelPrefix() cumulatively applies a function to array elements in parallel."),
    ("Explain Collections.checkedList()", "Checked collections provide dynamic type checking to prevent heap pollution from raw types."),
    ("How does Collections.newSetFromMap() work?", "Creates a Set backed by the given Map. Used for concurrent sets via ConcurrentHashMap."),
    ("What is the difference in performance between ArrayList and LinkedList for queue operations?", "LinkedList is slower due to node allocation and memory overhead. ArrayDeque is faster."),
    ("Explain the Map.merge() method.", "merge(key, value, remappingFunction) inserts value if key absent, else applies function to old+new value."),
    ("How does the stream API work with parallel collections?", "Spliterator splits elements, ForkJoinPool processes chunks. Must ensure stateless, non-interfering lambdas."),
    ("What is the Collections.rotate() method?", "rotate(list, distance) rotates elements by shifting. Positive distance rotates right."),
    ("Explain the NavigableSet and NavigableMap interfaces.", "Extended sorted collections with nearest-match queries: lower(), floor(), ceiling(), higher()."),
]

for q_text, answer in java_collections_mid:
    opts = [answer, "This behavior is an implementation detail that may change", "The opposite approach is used in modern Java", "This is a common misconception about Java collections"]
    q("Collections", q_text, answer, opts, "Middle", "Java")

# Java Collections - Senior (30)
java_collections_senior = [
    ("Design a concurrent skip list map in Java.", "ConcurrentNavigableMap-like. Use CAS on node pointers, index levels with probabilistic promotion."),
    ("Implement a persistent (immutable) collection library in Java.", "Use structural sharing (trie-based). HashMap: 32-ary trie with path copying. Same approach for Vector, Set."),
    ("How to achieve lock-free iteration on a concurrent map?", "Use snapshot iteration (CHM). Or implement a consistent snapshot using epoch-based reclamation."),
    ("Design a thread-safe bounded buffer that prioritizes producers vs consumers.", "Use ReentrantReadWriteLock. Implement fairness policy. Use condition queues for backpressure."),
    ("How to minimize GC pressure from collections in high-throughput systems?", "Use object pooling, primitive collections (fastutil, Eclipse Collections), off-heap storage, or flat buffers."),
    ("Design a compact Trie (radix tree) for millions of strings.", "Use a compressed Trie where path-compressed nodes store shared prefixes. Memory efficient for long common prefixes."),
    ("How does the JVM intrinsify Collection methods?", "JIT recognizes ArrayList.get(), HashMap.put(), etc. and inlines them with null checks and bounds elimination."),
    ("Design a cache that adapts its eviction policy based on access patterns.", "ARC (Adaptive Replacement Cache) adapts between LRU and LFU. Maintains 4 lists: recent/frequent, each with ghost entries."),
    ("Explain the memory layout of collections in the JVM.", "ArrayList: header + int size + Object[] reference. HashMap: header + Node[] + load factor + threshold. Object alignment causes padding."),
    ("How to implement a striping technique for reducing contention on a hash map?", "StripedHashMap: N independent segments, each with its own lock. Hash key maps to a segment. Scales with N cores."),
]

for q_text, answer in java_collections_senior:
    opts = [answer, "Standard collections are sufficient for this use case", "This optimization is handled automatically by the JIT", "This pattern is not recommended in production"]
    q("Collections", q_text, answer, opts, "Senior", "Java")

# Java Multithreading - Junior (40)
java_mt_junior = [
    ("What is a thread?", "A thread is the smallest unit of execution within a process."),
    ("How to create a thread in Java?", "Extend Thread class or implement Runnable and pass to Thread constructor."),
    ("What is the difference between thread and process?", "Processes have separate memory spaces. Threads share memory within a process."),
    ("What is thread safety?", "Code is thread-safe if it functions correctly when accessed by multiple threads."),
    ("What is a race condition?", "A race condition occurs when the result depends on timing of thread execution."),
    ("What is the synchronized keyword?", "synchronized ensures mutual exclusion and visibility."),
    ("What is a synchronized method?", "The entire method is synchronized on 'this' (or the Class for static methods)."),
    ("What is a synchronized block?", "A block synchronized on any object, providing finer-grained control."),
    ("What is the volatile keyword?", "volatile ensures writes are visible to other threads immediately."),
    ("What is deadlock?", "Two or more threads waiting for locks each other holds, blocking indefinitely."),
    ("How to avoid deadlock?", "Use consistent lock ordering, timeouts, or tryLock()."),
    ("What is the wait() method?", "Causes current thread to wait until another thread calls notify()/notifyAll()."),
    ("What is the notify() method?", "Wakes up one waiting thread on the same monitor."),
    ("What is notifyAll()?", "Wakes up all waiting threads on the same monitor."),
    ("What is the join() method?", "join() waits for a thread to finish."),
    ("What is the yield() method?", "yield() hints the scheduler to give other threads a chance to run."),
    ("What is daemon thread?", "A daemon thread does not prevent JVM from exiting when user threads finish."),
    ("What is thread priority?", "Thread priority (1-10) hints the scheduler. Not guaranteed across platforms."),
    ("What is the Thread.State enum?", "NEW, RUNNABLE, BLOCKED, WAITING, TIMED_WAITING, TERMINATED."),
    ("What is interrupt()?", "interrupt() sets the interrupt flag on a thread. Sleeping/waiting threads throw InterruptedException."),
    ("What is the ExecutorService interface?", "ExecutorService manages thread pool and submits tasks (Callable/Runnable)."),
    ("What is newFixedThreadPool()?", "Creates a thread pool with a fixed number of threads."),
    ("What is newCachedThreadPool()?", "Creates a pool that creates new threads as needed, reusing idle ones."),
    ("What is newSingleThreadExecutor()?", "Creates an executor with a single worker thread."),
    ("What is newScheduledThreadPool()?", "Creates a pool for scheduled and periodic task execution."),
    ("What is submit() vs execute()?", "submit() returns Future; execute() returns void."),
    ("What is the shutdown() method?", "shutdown() initiates graceful shutdown; no new tasks accepted, existing tasks complete."),
    ("What is shutdownNow()?", "Attempts to stop all running tasks and returns queued tasks."),
    ("What is the Callable interface?", "Callable<V> returns a result and can throw checked exceptions."),
    ("What is the Future interface?", "Future<V> represents the async result of a Callable. has cancel(), isDone(), get()."),
    ("What is the TimeUnit enum?", "TimeUnit (NANOSECONDS to DAYS) provides convenient time conversion and sleep."),
    ("What is the Lock interface?", "Lock provides more flexible locking than synchronized: tryLock(), lockInterruptibly()."),
    ("What is ReentrantLock?", "ReentrantLock is a reentrant mutual exclusion Lock with fairness option."),
    ("What is the ReadWriteLock interface?", "ReadWriteLock maintains a pair of locks: shared read lock and exclusive write lock."),
    ("What is ReentrantReadWriteLock?", "Multiple threads can read simultaneously. Writes require exclusive access."),
    ("What is the Condition interface?", "Condition provides await/signal methods like wait/notify but with multiple conditions per lock."),
    ("What is the CountDownLatch?", "CountDownLatch allows one or more threads to wait until count reaches zero."),
    ("What is the CyclicBarrier?", "CyclicBarrier lets threads wait for each other at a barrier point. Reusable."),
    ("What is the Semaphore?", "Semaphore controls access to a resource with permits. Can be used as a mutex (1 permit)."),
    ("What is the Exchanger?", "Exchanger provides a rendezvous point for two threads to exchange objects."),
]

for q_text, answer in java_mt_junior:
    opts = [answer, "Threads should not be used for this purpose", "This approach is deprecated in modern Java", "Synchronization is not required here"]
    q("Multithreading", q_text, answer, opts, "Junior", "Java")

# Java Multithreading - Middle (30)
java_mt_mid = [
    ("Explain the happens-before rules.", "Program order, monitor lock, volatile, thread start/join, transitive. Ensure visibility across threads."),
    ("What is a thread pool executor?", "ThreadPoolExecutor manages core/max pool size, keep-alive time, work queue, and rejection policy."),
    ("Explain the rejection policies of ThreadPoolExecutor.", "AbortPolicy (default), CallerRunsPolicy, DiscardPolicy, DiscardOldestPolicy."),
    ("How does ForkJoinPool differ from ThreadPoolExecutor?", "FJP uses work-stealing; ideal for divide-and-conquer parallel tasks."),
    ("What is the work-stealing algorithm?", "Idle workers steal tasks from busy workers' deque tails, reducing contention."),
    ("Explain the CompletableFuture chaining.", "thenApply (sync map), thenAccept (sync consume), thenCompose (async flatMap), thenCombine (merge two)."),
    ("What is the difference between thenApplyAsync and thenApply?", "thenApplyAsync executes in ForkJoinPool; order not guaranteed relative to other stages."),
    ("Explain the Phaser class.", "Phaser supports dynamic party registration, multiple phases, and tree-based phasers for scalability."),
    ("How does StampedLock differ from ReentrantReadWriteLock?", "StampedLock supports optimistic reads that don't block writers. Must validate before use."),
    ("What is lock striping?", "Splitting a lock into multiple locks protecting different parts of data to reduce contention."),
    ("Explain the Double-Checked Locking pattern.", "Check, then synchronize, then check again. Requires volatile on the field for correctness."),
    ("What is false sharing?", "When threads on different cores modify variables sharing a cache line, causing cache invalidation."),
    ("How to mitigate false sharing?", "Align fields to cache lines (64 bytes) using @Contended or padding."),
    ("What is the volatile visibility guarantee?", "A volatile read sees the last volatile write. Creates happens-before."),
    ("How does the JVM implement synchronized?", "Biased locking -> CAS spin -> inflated OS mutex. Adaptive spin tuning."),
    ("What is the LockSupport class?", "park()/unpark() are the foundation for locks and synchronizers. No need to own a monitor."),
    ("Explain AbstractQueuedSynchronizer (AQS).", "AQS provides a framework for building locks and synchronizers with a CLH queue and state variable."),
    ("How does ReentrantLock use AQS?", "AQS.state tracks lock count (0=unlocked, >0=held). Exclusive mode. ConditionObject extends AQS."),
    ("What is the VarHandle getOpaque() vs getVolatile()?", "getOpaque: no reordering guarantee within thread. getVolatile: full volatile semantics."),
    ("Explain the Java Memory Model guarantee for final fields.", "Final fields are guaranteed to be initialized by the time the constructor completes, visible to all threads."),
]

for q_text, answer in java_mt_mid:
    opts = [answer, "The JMM does not guarantee this behavior", "This only applies to specific JVM implementations", "This is incorrect and can cause visibility issues"]
    q("Multithreading", q_text, answer, opts, "Middle", "Java")

# Java Multithreading - Senior (30)
java_mt_senior = [
    ("Design a lock-free bounded ring buffer.", "Use atomic head/tail indexes with padding to avoid false sharing. CAS for claim slots. Versioned slots for ABA."),
    ("Explain the Maged Lee queue model for work-stealing.", "Each worker has a deque. Workers push/pop locally (LIFO), steal from remote heads (FIFO). Exponential backoff."),
    ("How to implement a scalable concurrent hash map with lock-free reads?", "Use striped locks for writes. Reads are lock-free via volatile reads. Tree bins handle deep collisions."),
    ("Design a mechanism to avoid priority inversion in Java.", "Use priority inheritance protocol, or use Ceiling Priority Protocol. Realtime Java specs provide solutions."),
    ("How does the JVM implement thread suspension for GC safepoints?", "Polling: threads check a safepoint flag at back-edges and method entries. JIT generates polls."),
    ("Design a distributed lock service with Java clients.", "Use ZooKeeper/Etcd for lease-based locks. Client library with watch, retry, and heartbeat."),
    ("Explain how to achieve wait-free progress guarantees.", "Wait-free: every thread completes in finite steps. Use atomic RMW ops with helping. Example: Treiber stack with help."),
    ("Design a thread pool with dynamic scaling based on queue depth.", "ThreadPoolExecutor already supports: core threads, max threads + work queue. Customize with a rejection handler that spawns more threads."),
    ("How to profile and fix thread contention in production?", "Use async-profiler for lock profiling. Fix: reduce lock granularity, use concurrent collections, read-write locks, or lock-free structures."),
    ("Design a system for precisely timed task scheduling.", "Use a hierarchical timing wheel. O(1) insertion/cancellation. Combine with a dedicated dispatch thread."),
]

for q_text, answer in java_mt_senior:
    opts = [answer, "Standard Java thread APIs are sufficient", "This requires JVM-internal knowledge", "Most applications do not need this level of optimization"]
    q("Multithreading", q_text, answer, opts, "Senior", "Java")

# Java Spring Framework - Junior (30)
spring_junior = [
    ("What is Spring Framework?", "Spring is a comprehensive framework for enterprise Java with IoC, AOP, and transaction management."),
    ("What is Inversion of Control (IoC)?", "IoC delegates object lifecycle and dependency management to a container."),
    ("What is Dependency Injection?", "DI injects dependencies rather than objects creating them. Constructor, setter, interface injection."),
    ("What is the Spring IoC container?", "The container (ApplicationContext) manages bean creation, wiring, and lifecycle."),
    ("What is a Spring bean?", "A bean is an object managed by the Spring IoC container."),
    ("What are bean scopes?", "singleton (default), prototype, request, session, application, websocket."),
    ("What is the @Autowired annotation?", "@Autowired triggers dependency injection by type with optional qualifiers."),
    ("What is the @Component annotation?", "@Component marks a class as a Spring-managed bean (generic stereotype)."),
    ("What is @Service?", "@Service is a stereotype for service layer components (specialized @Component)."),
    ("What is @Repository?", "@Repository is a stereotype for DAOs; enables persistence exception translation."),
    ("What is @Controller?", "@Controller marks a class as a Spring MVC controller."),
    ("What is @RestController?", "@RestController = @Controller + @ResponseBody. Returns data directly (no views)."),
    ("What is @RequestMapping?", "@RequestMapping maps HTTP requests to handler methods. Can specify path, method, params."),
    ("What is @GetMapping?", "@GetMapping is a composed annotation for GET requests (shortcut for @RequestMapping(method=GET))."),
    ("What is @PostMapping?", "Shorthand for @RequestMapping(method=POST)."),
    ("What is @PutMapping?", "Shorthand for @RequestMapping(method=PUT)."),
    ("What is @DeleteMapping?", "Shorthand for @RequestMapping(method=DELETE)."),
    ("What is @PathVariable?", "Binds a URI template variable to a method parameter."),
    ("What is @RequestParam?", "Binds a query parameter to a method parameter."),
    ("What is @RequestBody?", "Binds the HTTP request body to a method parameter using HttpMessageConverter."),
    ("What is @ResponseBody?", "Writes the return value directly to the HTTP response body."),
    ("What is @ResponseStatus?", "Sets the HTTP response status for a method or exception handler."),
    ("What is @ExceptionHandler?", "Handles exceptions thrown by controller methods within the same controller."),
    ("What is @ControllerAdvice?", "Global exception handling across all controllers. Can target specific packages/annotations."),
    ("What is Spring Boot?", "Spring Boot provides auto-configuration, embedded servers, and starter dependencies for rapid development."),
    ("What is @SpringBootApplication?", "@SpringBootApplication = @Configuration + @EnableAutoConfiguration + @ComponentScan."),
    ("What is application.properties?", "Configuration file for Spring Boot properties (server.port, spring.datasource.url)."),
    ("What is YAML configuration in Spring?", "application.yml provides hierarchical configuration with improved readability."),
    ("What is Spring Data JPA?", "Spring Data JPA simplifies JPA-based data access with repository abstraction."),
    ("What is Spring Security?", "Spring Security provides authentication, authorization, and protection against common exploits."),
]

for q_text, answer in spring_junior:
    opts = [answer, "Spring Boot uses a different approach", "This is handled by the JPA provider", "This feature is deprecated in recent versions"]
    q("Spring Framework", q_text, answer, opts, "Junior", "Java")

# Spring - Middle (30)
spring_mid = [
    ("Explain Spring Bean lifecycle.", "instantiate -> populate properties -> setBeanName -> setApplicationContext -> postProcessBeforeInit -> @PostConstruct -> afterPropertiesSet -> init-method -> postProcessAfterInit -> ready -> @PreDestroy -> dispose"),
    ("How does Spring resolve circular dependencies?", "By creating proxy objects for singleton beans using three-level cache (singletonObjects, earlySingletonObjects, singletonFactories)."),
    ("Explain Spring AOP and its proxy modes.", "AOP uses JDK dynamic proxy (interfaces) or CGLIB (classes). @EnableAspectJAutoProxy. Pointcut + Advice = Aspect."),
    ("What is the difference between @Transactional on class vs method?", "Class-level applies to all methods. Method-level overrides class-level. Annotation used on public methods only."),
    ("How does Spring transaction propagation work?", "REQUIRED (join existing), REQUIRES_NEW (suspend existing), SUPPORTS, NOT_SUPPORTED, MANDATORY, NEVER, NESTED."),
    ("Explain Spring Boot auto-configuration.", "@EnableAutoConfiguration uses spring.factories to load auto-configuration classes. Conditionals (@ConditionalOnClass, @ConditionalOnMissingBean) decide activation."),
    ("What is Spring Cloud and its main components?", "Spring Cloud provides tools for distributed systems: Config Server, Service Discovery (Eureka), Circuit Breaker (Resilience4j), API Gateway."),
    ("How does Spring Security filter chain work?", "DelegatingFilterProxy delegates to a chain of SecurityFilterChain (UsernamePasswordAuthenticationFilter, ExceptionTranslationFilter, FilterSecurityInterceptor)."),
    ("Explain Spring Data JPA query methods.", "Derived queries from method names (findByLastName). @Query for custom JPQL. @Modifying for update/delete."),
    ("How does Spring handle exception handling in REST APIs?", "@ExceptionHandler per controller, @ControllerAdvice globally, or ResponseEntityExceptionHandler for Spring MVC defaults."),
    ("What is Spring Actuator?", "Actuator exposes endpoints (/health, /metrics, /info, /env) for monitoring and management."),
    ("Explain Spring Boot's embedded container support.", "Auto-configures Tomcat (default), Jetty, or Undertow. Embedded containers configurable via properties."),
    ("What is Spring Data REST?", "Exposes Spring Data repositories as RESTful endpoints automatically. HATEOAS support."),
    ("How does Spring handle CORS?", "@CrossOrigin annotation or CorsConfigurationSource bean. Allows controlling allowed origins, methods, headers."),
    ("Explain Spring WebFlux.", "Reactive web framework with Project Reactor (Mono/Flux). Non-blocking, backpressure-aware. Netty-based."),
]

for q_text, answer in spring_mid:
    opts = [answer, "Spring does not support this feature", "This behavior changed in Spring Boot 3.x", "A workaround is needed for this scenario"]
    q("Spring Framework", q_text, answer, opts, "Middle", "Java")

# Spring - Senior (20)
spring_senior = [
    ("Design a transaction management strategy for a distributed microservice architecture.", "Use Saga pattern (Choreography or Orchestration). Spring + Kafka for event-driven compensation. Outbox pattern for reliability."),
    ("How would you optimize Spring Boot application startup time for a critical service?", "Enable lazy initialization. Use context indices. Trim auto-configuration. Use Spring AOT + GraalVM native image. Enable CDS."),
    ("Design a caching strategy in Spring Boot for a high-traffic API.", "Use Spring Cache Abstraction with multiple tiers: L1 (Caffeine in-memory), L2 (Redis). @Cacheable with TTL, eviction policy, and distributed invalidation."),
    ("Explain how to implement a custom Spring Boot starter.", "Create auto-configuration with @Configuration, @ConditionalOnClass. Define properties with @ConfigurationProperties. Register in META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports."),
    ("Design a security architecture for a multi-tenant SaaS with Spring.", "Tenant identifier per request (JWT claim). Dynamic DataSource routing via AbstractRoutingDataSource. Row-level security with Spring Security ACL or Postgres RLS."),
    ("How would you migrate from Spring MVC to WebFlux in a large application?", "Identify blocking calls (database, external HTTP). Replace with reactive drivers (R2DBC, WebClient). Use Mono/Flux in entire call chain. Handle thread locals (SecurityContext, request scoped beans)."),
    ("Design an event-driven architecture in Spring Boot.", "Use Spring Cloud Stream with Kafka or RabbitMQ. @EnableBinding/functional bindings. Dead letter queues. Retry and idempotency with dB-backed event tracking."),
]
for q_text, answer in spring_senior:
    opts = [answer, "This approach does not scale well", "Spring provides a simpler built-in solution", "This requires custom framework extensions"]
    q("Spring Framework", q_text, answer, opts, "Senior", "Java")

# Java JVM - Junior (20)
jvm_junior = [
    ("What is JVM architecture?", "ClassLoader -> Runtime Data Areas (Heap, Stack, PC, Method Area, Native Stack) -> Execution Engine (Interpreter, JIT, GC)."),
    ("What is the heap?", "The heap is where all objects are stored. Shared across threads. Managed by GC."),
    ("What is the stack?", "Each thread has a private stack storing frames (local variables, partial results, operand stack)."),
    ("What is the method area?", "Stores class metadata, constant pool, method bytecode, static variables. (Metaspace in Java 8+)."),
    ("What is the PC register?", "Each thread has a PC register pointing to the next JVM instruction to execute."),
    ("What is the native method stack?", "Stores native method call information."),
    ("What is heap memory?", "Young Gen (Eden, S0, S1) + Old Gen. Objects are promoted from Young to Old after surviving GC."),
    ("What is Metaspace?", "Metaspace (Java 8+) replaces PermGen for class metadata. Grows natively (no max by default)."),
    ("What is a class file?", "A .class file contains magic number (0xCAFEBABE), version, constant pool, access flags, fields, methods, attributes."),
    ("What is the constant pool?", "The constant pool stores literals and symbolic references (class names, method signatures, field descriptors)."),
    ("What are JVM runtime constant pools?", "Per-class runtime version of the constant pool loaded into memory."),
    ("What is the execution engine?", "The execution engine interprets bytecode or compiles it to native code via JIT."),
    ("What is the interpreter?", "The interpreter reads and executes bytecode instructions one at a time. Slow but starts instantly."),
    ("What is JIT compilation?", "Just-In-Time compiler profiles bytecode and compiles hot methods to native code for faster execution."),
    ("What is garbage collection?", "GC automatically identifies and reclaims unreachable objects to prevent memory leaks."),
    ("What is stop-the-world?", "All application threads are paused so the GC can safely perform its work."),
    ("What is a garbage collector root?", "Roots are references that keep objects alive: stack frames, static fields, JNI handles, active threads."),
    ("What is reachability?", "An object is reachable if there is a chain of references from a GC root to the object."),
    ("What is a finalizer?", "finalize() is called by GC before reclaiming an object. Deprecated and unreliable."),
    ("What is System.gc()?", "Hints the JVM to run GC. Not guaranteed. Can cause full STW pause."),
]

for q_text, answer in jvm_junior:
    opts = [answer, "This does not apply to all JVM implementations", "The JVM specification does not require this", "This is an implementation detail of HotSpot only"]
    q("JVM Internals", q_text, answer, opts, "Junior", "Java")

# JVM - Middle (20)
jvm_mid = [
    ("Explain the GC root types.", "Active threads, stack locals, static fields, JNI global references, synchronized objects, and running native methods."),
    ("How does the CMS collector work?", "CMS (Concurrent Mark Sweep) marks live objects concurrently with application threads. No compaction, susceptible to fragmentation."),
    ("Explain G1 GC phases.", "Young GC (stop threads, evacuate Eden to S/Old). Concurrent Marking (snapshot-at-the-beginning). Mixed GC (evacuate selected old regions)."),
    ("What is a humongous allocation in G1?", "Objects > 50% of region size allocated directly in Old Gen as humongous regions. Can cause early mixed GC."),
    ("Explain ZGC coloring pointers.", "ZGC uses 42-bit address space (64-bit VM). Bits 42-45 encode metadata (finalizable, remapped, mark bits). No GC barriers needed for most operations."),
    ("How does ZGC achieve sub-millisecond pauses?", "Concurrent everything: marking, relocation, remapping. Load barriers handle forwarding without STW. Colored pointers."),
    ("Explain Shenandoah GC.", "Concurrent compaction via Brooks pointer forwarding. Load barriers redirect references to forwarded copies. Pause time independent of heap size."),
    ("What is CMS remark phase?", "Remark re-scans objects modified during concurrent marking. STW pause. Pre-cleaning reduces remark work."),
    ("How does parallel GC work?", "Multiple GC threads for young collection (copying). Old GC uses parallel mark-sweep-compact. Focuses on throughput."),
    ("Explain the young generation structure.", "Eden (new objects allocated). Two Survivor spaces (S0, S1). Objects copied between survivors during minor GC. Threshold promotes to Old."),
]

for q_text, answer in jvm_mid:
    opts = [answer, "This is not how the JVM actually implements GC", "Only specific GC algorithms use this approach", "This feature was removed in recent JDK versions"]
    q("JVM Internals", q_text, answer, opts, "Middle", "Java")

# JVM - Senior (20)
jvm_senior = [
    ("Design a GC algorithm for a heap larger than available RAM (disaggregated memory).", "Remote region concept: mark regions as remote. GC treats them as rarely accessed. Use RDMA for bulk transfer. Application must tolerate higher latency for remote objects."),
    ("How does the JVM implement virtual threads on OS threads?", "Virtual threads (Project Loom) are continuations scheduled on a ForkJoinPool. Park/unpark via jdk.internal.misc.Unsafe. Continuation.yield preserves stack."),
    ("Explain the JVM's approach to string deduplication in G1.", "G1 identifies duplicate char[] in Strings during concurrent marking. Installs forwarding pointer to canonical copy. Reduces memory footprint."),
    ("How does the JVM optimize instanceof checks?", "JIT generates type checks using class id comparisons. For sealed hierarchies, uses a sealed class hierarchy bitmap for O(1) checks."),
    ("Design a JIT compiler optimization that would improve startup time.", "Tiered compilation with profiling. Use profiling at tier 2 to guide tier 3-4. Cache compilation results across runs (AOT + CDS)."),
    ("Explain how the JVM handles deoptimization.", "When speculative optimizations (e.g., monomorphic call assumption) fail, JIT deoptimizes the frame to interpreter state. On-stack replacement (OSR) for loops."),
]

for q_text, answer in jvm_senior:
    opts = [answer, "This is beyond what the JVM can currently do", "Only specific GCs support this", "This would require custom JVM patches"]
    q("JVM Internals", q_text, answer, opts, "Senior", "Java")

# Java additional categories
java_streams_junior = [
    ("What is a Stream API?", "Stream API processes sequences of elements with functional operations (map, filter, reduce)."),
    ("What is the difference between stream and collection?", "Collection stores data. Stream processes data with lazy evaluation and functional operations."),
    ("What is map() operation?", "map() transforms each element using a function into a new stream."),
    ("What is filter() operation?", "filter() selects elements matching a predicate into a new stream."),
    ("What is flatMap()?", "flatMap() maps each element to a stream and flattens them into a single stream."),
    ("What is distinct()?", "distinct() removes duplicates using equals()."),
    ("What is sorted()?", "sorted() orders elements by natural order or a Comparator."),
    ("What is peek()?", "peek() applies a Consumer to each element for debugging/logging (intermediate operation)."),
    ("What is limit()?", "limit(n) truncates the stream to contain only the first n elements."),
    ("What is skip()?", "skip(n) discards the first n elements of the stream."),
    ("What is reduce()?", "reduce() combines elements using a binary operator into a single result."),
    ("What is collect()?", "collect() accumulates elements into a container (List, Set, Map) using a Collector."),
    ("What is forEach()?", "forEach() performs an action on each element (terminal operation)."),
    ("What is count()?", "count() returns the number of elements in the stream."),
    ("What is anyMatch()?", "anyMatch() returns true if any element satisfies the predicate."),
    ("What is allMatch()?", "allMatch() returns true if all elements satisfy the predicate."),
    ("What is noneMatch()?", "noneMatch() returns true if no elements satisfy the predicate."),
    ("What is findFirst()?", "findFirst() returns the first element in the stream."),
    ("What is findAny()?", "findAny() returns any element (useful for parallel streams)."),
    ("What is the difference between intermediate and terminal operations?", "Intermediate (map, filter) are lazy and return a stream. Terminal (collect, forEach) produce a result and close the stream."),
]

for q_text, answer in java_streams_junior:
    opts = [answer, "This operation does not exist in Java streams", "The behavior differs in parallel streams", "This method was added in Java 9+"]
    q("Streams & Functional", q_text, answer, opts, "Junior", "Java")

# Java Hibernate JPA - some
jpa_mid = [
    ("What is the difference between Eager and Lazy loading in JPA?", "Eager fetches related entities immediately. Lazy loads them on first access (proxy). Lazy is the default for @OneToMany."),
    ("Explain the N+1 query problem in Hibernate.", "One query for parent + N queries for each child's lazy association. Fix with JOIN FETCH, EntityGraph, or batch fetching."),
    ("What are the JPA entity states?", "Transient (new, no ID), Managed (persistent, in session), Detached (persisted but session closed), Removed (scheduled for delete)."),
    ("What is the EntityManager?", "EntityManager manages persistence context: persist, merge, find, remove, flush, refresh."),
    ("Explain the first-level cache in Hibernate.", "Session-scoped cache. Reduces database reads within a session. Automatically used."),
    ("Explain the second-level cache.", "SessionFactory-scoped cache. Shared across sessions. Cache providers: EhCache, Redis, Hazelcast."),
    ("What is dirty checking in Hibernate?", "Hibernate tracks entity changes and flushes them automatically before commit or on explicit flush."),
    ("What is optimistic locking?", "Uses @Version field. Compares version at update; throws OptimisticLockException if changed by another transaction."),
    ("What is pessimistic locking?", "Locks the database row for the duration of the transaction using SELECT ... FOR UPDATE."),
]

for q_text, answer in jpa_mid:
    opts = [answer, "JPA does not support this feature", "Hibernate handles this differently than standard JPA", "This only works with specific databases"]
    q("JPA & Hibernate", q_text, answer, opts, "Middle", "Java")

jpa_junior = [
    ("What is JPA?", "Java Persistence API is a specification for object-relational mapping in Java."),
    ("What is Hibernate?", "Hibernate is the most popular JPA implementation. Provides ORM, caching, and query capabilities."),
    ("What is an entity in JPA?", "An entity is a POJO mapped to a database table via @Entity annotation."),
    ("What is @Id?", "@Id marks the primary key field of an entity."),
    ("What is @GeneratedValue?", "Specifies primary key generation strategy (AUTO, IDENTITY, SEQUENCE, TABLE)."),
    ("What is @Column?", "@Column maps a field to a specific database column with name, nullable, length, etc."),
    ("What is @Table?", "@Table specifies the database table name and schema for an entity."),
    ("What is @OneToMany?", "Maps a one-to-many relationship between entities."),
    ("What is @ManyToOne?", "Maps a many-to-one relationship. Uses @JoinColumn for the foreign key."),
    ("What is @JoinColumn?", "Specifies the foreign key column in a relationship."),
]

for q_text, answer in jpa_junior:
    opts = [answer, "This annotation is specific to Hibernate", "JPA does not require this mapping", "This is a deprecated approach"]
    q("JPA & Hibernate", q_text, answer, opts, "Junior", "Java")

# Java Testing - some
testing_junior = [
    ("What is JUnit?", "JUnit is a testing framework for Java. Provides annotations (@Test, @BeforeEach, @AfterEach) and assertions."),
    ("What is Mockito?", "Mockito is a mocking framework for unit tests. Creates mock objects and defines behavior via when().thenReturn()."),
    ("What is an assertion?", "An assertion verifies expected vs actual results. assertEquals, assertTrue, assertNotNull."),
    ("What is TDD?", "Test-Driven Development: write failing test, write minimum code to pass, then refactor."),
    ("What is @BeforeEach?", "@BeforeEach runs before each test method for setup."),
    ("What is @AfterEach?", "@AfterEach runs after each test method for teardown."),
    ("What is @BeforeAll?", "@BeforeAll runs once before all tests in the class. Method must be static."),
    ("What is @AfterAll?", "@AfterAll runs once after all tests. Method must be static."),
    ("What is assertThrows?", "assertThrows verifies that a code block throws a specific exception."),
    ("What is parameterized tests?", "@ParameterizedTest runs the same test with different arguments. @ValueSource, @CsvSource, @MethodSource."),
]

for q_text, answer in testing_junior:
    opts = [answer, "This feature is not available in JUnit", "Mockito does not support this operation", "This is a best practice but not a framework feature"]
    q("Testing", q_text, answer, opts, "Junior", "Java")

testing_mid = [
    ("What is the difference between @Mock and @InjectMocks?", "@Mock creates a mock. @InjectMocks creates an instance and injects mocks into it."),
    ("Explain Mockito argument matchers.", "any(), eq(), isNull(), nullable(). Mock argument matching. Cannot mix matchers and raw values."),
    ("What is Mockito verify()?", "verify(mock, times(1)).method() checks that a method was called with specific arguments a specific number of times."),
    ("How does @SpringBootTest work?", "Loads full application context for integration testing. Can mock beans with @MockBean."),
    ("What is @WebMvcTest?", "Loads only web layer (controllers, filters, converters). Mocks services. Fast slice testing."),
    ("What is @DataJpaTest?", "Loads JPA layer (entities, repositories, datasource). In-memory DB by default."),
    ("What is testcontainers?", "Testcontainers provides disposable Docker containers for integration tests (databases, queues, etc.)."),
]

for q_text, answer in testing_mid:
    opts = [answer, "This is not a standard testing practice", "The behavior varies between testing frameworks", "This only works with specific annotations"]
    q("Testing", q_text, answer, opts, "Middle", "Java")

print(f"Java: total {len([x for x in questions if \"Java\" in x and x.split(\"'\")[0].strip() == 'Q'])}, "
      f"Junior {len([x for x in questions if x.count(\"'\", 0, x.find(\"'Junior'\")) > 0 and x.split(\"'\")[-2] == 'Junior' and x.endswith(\"Java');\")])}")

# ============================================================
# PYTHON (700 questions)
# ============================================================

py_basics_junior = [
    ("What is Python?", "Python is a high-level, interpreted, dynamically-typed programming language known for readability."),
    ("What is PEP 8?", "PEP 8 is Python's style guide covering naming, indentation (4 spaces), and code layout."),
    ("What are Python's built-in types?", "int, float, bool, str, list, tuple, set, dict, bytes, NoneType."),
    ("What is a list comprehension?", "A concise syntax: [x*2 for x in range(10)] creates a new list by applying expression to each element."),
    ("What is a dictionary comprehension?", "{k: v for k, v in iterable} creates a dictionary from key-value pairs."),
    ("What is the difference between list and tuple?", "List is mutable (can change). Tuple is immutable (fixed). Both ordered, allow duplicates."),
    ("What is the difference between == and is?", "== checks value equality. is checks identity (same object in memory)."),
    ("What is a decorator?", "A decorator wraps a function with additional behavior using @decorator syntax."),
    ("What is a generator?", "A generator yields values lazily using yield. Maintains state between calls. Memory efficient."),
    ("What is the yield keyword?", "yield returns a value from a generator without destroying local state. Pauses execution."),
    ("What is a lambda in Python?", "lambda x: x*2 creates an anonymous inline function."),
    ("What is map()?", "map(func, iterable) applies func to each element and returns an iterator."),
    ("What is filter()?", "filter(predicate, iterable) returns elements where predicate is True."),
    ("What is reduce()?", "reduce(func, iterable) cumulatively applies func (import from functools)."),
    ("What is *args?", "*args captures positional arguments as a tuple."),
    ("What is **kwargs?", "**kwargs captures keyword arguments as a dictionary."),
    ("What is a module?", "A .py file containing functions, classes, and variables. Imported with import statement."),
    ("What is __init__.py?", "Marks a directory as a Python package. Can run initialization code."),
    ("What is __name__ == '__main__'?", "Checks if the script is run directly (not imported). Used for entry points."),
    ("What is pip?", "pip is Python's package installer. Installs packages from PyPI: pip install package."),
    ("What is a virtual environment?", "Isolated Python environment with its own packages. Created with venv or virtualenv."),
    ("What is PYTHONPATH?", "Environment variable that adds directories to Python's import search path."),
    ("What is a shebang line?", "#!/usr/bin/env python3 makes a script directly executable on Unix."),
    ("What is a context manager?", "Used with 'with' statement. Defines __enter__ and __exit__ for resource management."),
    ("What is the with statement?", "with open('file') as f: automatically closes the file after the block."),
    ("What is exception handling in Python?", "try-except-else-finally blocks. BaseException -> Exception -> specific types."),
    ("What is the raise keyword?", "raise manually triggers an exception. Can re-raise existing exceptions."),
    ("What is an f-string?", "f'Hello {name}' embeds expressions in strings. Python 3.6+. Fast and readable."),
    ("What is str.format()?", "'Hello {}'.format(name) formats strings with positional or named placeholders."),
    ("What is slicing?", "seq[start:stop:step] extracts subsequences. Negative indexes count from end."),
    ("What is the range() function?", "range(start, stop, step) generates sequences of integers lazily (Python 3)."),
    ("What is the enumerate() function?", "enumerate(iterable, start=0) yields (index, value) pairs."),
    ("What is the zip() function?", "zip(*iterables) aggregates elements from each iterable into tuples."),
    ("What is the sorted() function?", "sorted(iterable, key=None, reverse=False) returns a new sorted list."),
    ("What is reversed()?", "reversed(seq) returns a reverse iterator over the sequence."),
    ("What is all() and any()?", "all(iterable) returns True if all elements are truthy. any() if any is truthy."),
    ("What is the global keyword?", "global x inside a function declares that x refers to the module-level variable."),
    ("What is the nonlocal keyword?", "nonlocal x refers to the variable in the nearest enclosing scope (not global)."),
    ("What is pass?", "pass is a no-op statement used as a placeholder where syntax requires a statement."),
    ("What is type hints?", "Type hints annotate function signatures: def f(x: int) -> str:. Not enforced at runtime."),
    ("What is __str__ vs __repr__?", "__repr__: unambiguous representation for developers. __str__: readable for end users."),
    ("What is __len__?", "__len__ returns the length of the container. Called by len()."),
    ("What is __getitem__?", "__getitem__ enables indexing: obj[key]. Called by [] operator."),
    ("What is __call__?", "__call__ makes an instance callable: obj(). Used for callable objects."),
    ("What is a property decorator?", "@property turns a method into a read-only attribute. @setter for write access."),
    ("What is @staticmethod?", "A method that doesn't receive self or cls. Like a regular function but in class namespace."),
    ("What is @classmethod?", "A method that receives cls instead of self. Can access class-level attributes."),
    ("What is __slots__?", "__slots__ restricts instance attributes to a fixed set, saving memory."),
    ("What is __init__?", "__init__ is the constructor. Called when a new instance is created."),
    ("What is __new__?", "__new__ creates a new instance (rarely overridden). Called before __init__."),
]

for q_text, answer in py_basics_junior:
    opts = [answer, "Python does not support this feature", "This is deprecated in Python 3", "The behavior differs between Python 2 and 3"]
    q("Python Basics", q_text, answer, opts, "Junior", "Python")

# Python data structures (30)
py_ds_junior = [
    ("What is a list?", "Ordered, mutable collection with indexing and slicing support."),
    ("What is a tuple?", "Ordered, immutable collection. Used for heterogeneous data and hashable keys."),
    ("What is a dict?", "Key-value mapping. Keys must be hashable. Insertion order preserved (Python 3.7+)."),
    ("What is a set?", "Unordered collection of unique hashable elements. Supports set operations (union, intersection)."),
    ("What is a frozenset?", "Immutable version of set. Can be used as dict key."),
    ("What is a deque?", "Double-ended queue from collections. O(1) append/pop on both ends."),
    ("What is a defaultdict?", "Dict subclass that provides default values for missing keys."),
    ("What is a Counter?", "Dict subclass counting hashable objects. Most common, subtract, update methods."),
    ("What is an OrderedDict?", "Dict subclass that remembers insertion order (regular dicts also do since 3.7)."),
    ("What is a namedtuple?", "Factory for tuple subclasses with named fields. Lightweight immutable objects."),
    ("How to merge two dicts?", "dict1 | dict2 (Python 3.9+) or {**dict1, **dict2}."),
    ("How to deep copy a list?", "import copy; copy.deepcopy(lst) for recursive copy."),
    ("How to flatten a list of lists?", "[item for sublist in nested for item in sublist]."),
    ("How to remove duplicates from a list?", "list(set(lst)) but doesn't preserve order. For order: dict.fromkeys(lst)."),
    ("What is the list sort complexity?", "Timsort: O(n log n) worst/avg case. O(n) for partially sorted data."),
]

for q_text, answer in py_ds_junior:
    opts = [answer, "Python provides an alternative for this", "This operation is not supported by Python", "A different data structure is needed"]
    q("Data Structures", q_text, answer, opts, "Junior", "Python")

# Python OOP (30)
py_oop_junior = [
    ("What is a class in Python?", "A blueprint for objects defined with class keyword. Contains methods and attributes."),
    ("What is inheritance?", "class Child(Parent): Child inherits all methods/attributes of Parent."),
    ("What is method overriding?", "Child defines a method with the same name as Parent, replacing the inherited version."),
    ("What is super()?", "super() calls the parent class method. Used to extend parent behavior."),
    ("What is multiple inheritance?", "class C(A, B): inherits from both A and B. MRO determines method resolution."),
    ("What is MRO?", "Method Resolution Order: C3 linearization algorithm. Determines lookup order. Checked with Class.__mro__."),
    ("What is duck typing?", "If it walks like a duck and quacks like a duck, treat it as a duck. Behavior over type."),
    ("What is an abstract base class?", "ABC from abc module defines interfaces with @abstractmethod. Cannot be instantiated directly."),
    ("What is a metaclass?", "A class of a class. type is the default metaclass. Controls class creation."),
    ("What is __init_subclass__?", "Called when a subclass is created. Useful for registering subclasses."),
    ("What is a mixin?", "A class providing methods for reuse without IS-A relationship. No __init__ typically."),
    ("What is composition?", "Has-a relationship: an object contains other objects. Prefer over inheritance."),
    ("What is the SOLID principles in Python?", "Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, Dependency Inversion."),
    ("What is __getattribute__ vs __getattr__?", "__getattribute__ called for all attribute access. __getattr__ only when normal lookup fails."),
    ("What is __setattr__?", "Called when setting any attribute. Must be careful to avoid infinite recursion."),
]

for q_text, answer in py_oop_junior:
    opts = [answer, "Python does not support this OOP feature", "This is considered an anti-pattern in Python", "This was changed in Python 3"]
    q("OOP", q_text, answer, opts, "Junior", "Python")

# Python Standard Library (30)
py_stdlib_mid = [
    ("What is itertools?", "Module with iterator building blocks: chain, cycle, permutations, combinations, product, groupby."),
    ("What is functools?", "Higher-order functions: lru_cache, partial, wraps, reduce, singledispatch."),
    ("What is lru_cache?", "Memoization decorator with LRU eviction. @functools.lru_cache(maxsize=128)."),
    ("What is partial?", "functools.partial freezes function arguments, returning a simplified version."),
    ("What is singledispatch?", "Generic function dispatcher that calls different implementations based on first argument type."),
    ("What is the pathlib module?", "Object-oriented filesystem paths. Path('dir/file.txt').read_text(), .write_bytes(), .iterdir()."),
    ("What is re module?", "Regular expressions: re.search, re.match, re.findall, re.sub, re.compile."),
    ("What is datetime?", "Module for date/time handling: datetime, date, time, timedelta, timezone."),
    ("What is collections module?", "Specialized container datatypes: namedtuple, deque, Counter, OrderedDict, defaultdict."),
    ("What is the json module?", "JSON serialization: json.dumps(), json.loads(), json.dump(), json.load()."),
    ("What is csv module?", "CSV reading/writing: csv.reader, csv.writer, csv.DictReader."),
    ("What is pickle?", "Binary serialization for Python objects. Not secure for untrusted data."),
    ("What is logging?", "Configurable logging: logger.debug/info/warning/error. Handlers, formatters, levels."),
    ("What is argparse?", "CLI argument parsing: ArgumentParser, add_argument, parse_args."),
    ("What is os module?", "OS interface: os.getcwd(), os.listdir(), os.path.join(), os.remove(), os.environ."),
    ("What is sys module?", "System-specific parameters: sys.argv, sys.path, sys.exit(), sys.version."),
    ("What is threading?", "Thread-based parallelism: Thread, Lock, Semaphore, Queue for thread-safe communication."),
    ("What is multiprocessing?", "Process-based parallelism: Process, Pool, Queue, shared memory, Manager."),
    ("What is asyncio?", "Asynchronous I/O with async/await syntax. Event loop, coroutines, tasks, futures."),
    ("What is async and await?", "async def defines a coroutine. await yields control to the event loop."),
]

for q_text, answer in py_stdlib_mid:
    opts = [answer, "This module was added in later Python versions", "This is considered a legacy module", "A third-party library is preferred for this"]
    q("Standard Library", q_text, answer, opts, "Middle", "Python")

# Python Web (30)
py_web_mid = [
    ("What is Flask?", "A lightweight WSGI web framework. Minimal, extensible, routes via decorators."),
    ("What is Django?", "A full-featured web framework with ORM, admin, auth, templates, and middleware."),
    ("What is FastAPI?", "A modern async web framework with automatic OpenAPI generation and type validation via Pydantic."),
    ("What is WSGI?", "Web Server Gateway Interface: standard between Python web apps and servers (Gunicorn, uWSGI)."),
    ("What is ASGI?", "Asynchronous Server Gateway Interface: supports async and WebSocket. Used by FastAPI, Django Channels."),
    ("What is Gunicorn?", "WSGI HTTP server with pre-fork worker model. gunicorn app:application -w 4."),
    ("What is SQLAlchemy?", "ORM and database toolkit. Two styles: Core (SQL expression) and ORM (declarative mapping)."),
    ("What is Alembic?", "Database migration tool for SQLAlchemy. Version-controlled schema changes."),
    ("What is Pydantic?", "Data validation using Python type annotations. BaseModel with field validation, JSON schema."),
    ("What is Jinja2?", "Template engine for Python. Used by Flask. Template inheritance, filters, sandboxing."),
    ("What is Django ORM?", "Object-relational mapper with model definition, query API, migrations, and relationship support."),
    ("What is Django REST Framework?", "DRF builds REST APIs on Django: serializers, viewsets, routers, authentication."),
    ("What is middleware in Django?", "Middleware hooks into request/response processing (auth, session, CSRF, CORS)."),
    ("What is dependency injection in FastAPI?", "FastAPI's Depends() resolves dependencies from callables with type annotations."),
    ("What is the request lifecycle in Django?", "URLconf -> Middleware -> View -> Middleware -> Response."),
]

for q_text, answer in py_web_mid:
    opts = [answer, "This is not how Python web frameworks work", "This approach is considered outdated", "The implementation varies significantly between frameworks"]
    q("Web Frameworks", q_text, answer, opts, "Middle", "Python")

# Python Senior (40)
py_senior = [
    ("Design a REST API microservice with FastAPI, async DB, and Docker.", "FastAPI with async endpoints. SQLAlchemy 2.0 async session. Alembic for migrations. Pydantic validation. Docker multi-stage build."),
    ("Optimize a Python data processing pipeline for 10GB daily.", "Use generator-based streaming. Pandas chunking or Dask for larger-than-memory. Multiprocessing or Ray for parallelism. Parquet format."),
    ("Design a decorator for retry with exponential backoff.", "@retry(max_attempts=3, delay=1, backoff=2, exceptions=(TimeoutError,)). Wraps in while loop with try/except and time.sleep."),
    ("How to profile and optimize Python memory usage?", "Use memory_profiler, tracemalloc, objgraph. Identify reference cycles with gc.get_objects(). Use __slots__, arrays, or numpy for compact storage."),
    ("Design a plugin system in Python.", "Use entry points (setuptools), ABC registration, or importlib.metadata. Plugins discovered via pkg_resources or importlib."),
    ("How does Python's GIL affect concurrency?", "GIL prevents multiple threads from executing Python bytecode simultaneously. I/O-bound tasks benefit from threads; CPU-bound need multiprocessing."),
    ("Design a Python-based CLI tool following best practices.", "Use argparse or click. Add type hints, docstrings, tests. Use setup.cfg/pyproject.toml. Entry points in setup.py."),
    ("How to build a Python package for PyPI?", "pyproject.toml with setuptools. src layout. __init__.py exports. pip install build; python -m build. twine upload dist/*."),
    ("Explain Python's descriptor protocol.", "__get__, __set__, __delete__. property, classmethod, staticmethod are descriptors. Controls attribute access on classes."),
    ("Design a custom asyncio event loop integration.", "Implement AbstractEventLoop. Plug in custom selector (e.g., epoll, kqueue). Handle callbacks, timers, and I/O."),
]

for q_text, answer in py_senior:
    opts = [answer, "Python is not suitable for this use case", "This requires extensions written in C/C++", "There are better alternative languages for this"]
    q("Advanced Python", q_text, answer, opts, "Senior", "Python")

print(f"Python: {len([x for x in questions if \"Python\" in x and 'Junior' in x.split(\"'\")[-2]])} Junior, "
      f"{len([x for x in questions if \"Python\" in x and 'Middle' in x.split(\"'\")[-2]])} Middle, "
      f"{len([x for x in questions if \"Python\" in x and 'Senior' in x.split(\"'\")[-2]])} Senior")

# ============================================================
# TYPESCRIPT (600 questions)
# ============================================================

ts_basics_junior = [
    ("What is TypeScript?", "TypeScript is a typed superset of JavaScript that compiles to plain JavaScript."),
    ("What are the basic types in TypeScript?", "number, string, boolean, null, undefined, void, object, any, unknown, never."),
    ("What is the any type?", "any disables type checking. Use with caution. Prefer unknown for safer alternatives."),
    ("What is the unknown type?", "unknown represents any value but requires type narrowing before use."),
    ("What is the never type?", "never represents values that never occur (e.g., functions that always throw)."),
    ("What is the void type?", "void indicates no return value (functions that return undefined)."),
    ("What is type inference?", "TypeScript infers types from values without explicit annotations."),
    ("What is type annotation?", "Explicit type specification: let name: string = 'Alice'."),
    ("What is an interface?", "An interface defines the shape of an object: interface User { name: string; age: number; }"),
    ("What is a type alias?", "type alias defines a name for any type: type Point = { x: number; y: number; }"),
    ("Difference between interface and type?", "Interface can be extended (extends). Type aliases can represent unions, tuples, primitives."),
    ("What is an array type?", "Two syntaxes: number[] or Array<number>."),
    ("What is a tuple type?", "Fixed-length array with typed elements: [string, number]."),
    ("What is an enum?", "Enums define named constants: enum Color { Red, Green, Blue }."),
    ("What is the as keyword?", "Type assertion: value as Type or <Type>value. Overrides inferred type."),
    ("What is union type?", "A value that can be one of several types: string | number."),
    ("What is intersection type?", "Combines multiple types: A & B has all properties of both A and B."),
    ("What is optional property?", "Property that may be undefined: interface Config { name?: string; }"),
    ("What is the ?. optional chaining?", "obj?.prop?.nested safely accesses nested properties without checking null."),
    ("What is the ?? nullish coalescing?", "value ?? defaultValue returns defaultValue only if value is null/undefined (not falsy)."),
    ("What is a function type?", "type Fn = (x: number) => string defines a function signature."),
    ("What are default parameters?", "function greet(name = 'Guest') assigns a default when argument is undefined."),
    ("What are rest parameters?", "function sum(...numbers: number[]) captures arguments as an array."),
    ("What is function overloading?", "Multiple function signatures with a single implementation body."),
    ("What is a class in TypeScript?", "Classes with access modifiers (public, private, protected), inheritance, and interfaces."),
    ("What are access modifiers?", "public (default), private (only in class), protected (class + subclasses)."),
    ("What is readonly?", "readonly property can only be assigned during initialization."),
    ("What is an abstract class?", "Cannot be instantiated. Contains abstract methods that subclasses must implement."),
    ("What is implements?", "class MyClass implements MyInterface ensures the class matches the interface."),
    ("What is extends?", "class Child extends Parent inherits properties and methods."),
    ("What is a generic function?", "function identity<T>(arg: T): T captures the type from usage."),
    ("What is a generic constraint?", "function log<T extends Lengthwise>(arg: T) restricts T to types with required properties."),
    ("What is keyof?", "keyof T returns the union of keys of type T."),
    ("What is typeof in TypeScript?", "typeof value returns the type of a value at the type level."),
    ("What is a namespace?", "Namespaces organize code. Prefer ES modules (import/export) instead."),
    ("What is a module?", "A file with import/export statements. Each file is its own module."),
    ("What is the tsconfig.json?", "Configuration file for the TypeScript compiler: target, module, strict, paths."),
    ("What is strict mode?", "strict: true enables all strict checks (strictNullChecks, noImplicitAny, etc.)."),
    ("What is noImplicitAny?", "Errors on expressions with implicit any type."),
    ("What is strictNullChecks?", "null and undefined are only assignable to themselves and void."),
]

for q_text, answer in ts_basics_junior:
    opts = [answer, "TypeScript does not support this JavaScript feature", "This is only available in JavaScript, not TypeScript", "The behavior differs from JavaScript"]
    q("TypeScript Basics", q_text, answer, opts, "Junior", "TypeScript")

# TypeScript Advanced (40)
ts_advanced_mid = [
    ("What is a mapped type?", "Creates new types by transforming properties: type Readonly<T> = { readonly [P in keyof T]: T[P] }."),
    ("What is a conditional type?", "T extends U ? X : Y selects type based on condition."),
    ("What is infer in conditional types?", "infer captures a type variable: type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never."),
    ("What is a template literal type?", "type EventName<T extends string> = `on${Capitalize<T>}` creates string literal unions."),
    ("What is satisfies operator?", "satisfies checks compatibility without widening the type (TS 4.9+)."),
    ("What are const assertions?", "as const makes all properties readonly and literal types."),
    ("What is a discriminated union?", "Union with a common literal property for type narrowing."),
    ("What is type narrowing?", "typeof, instanceof, in, discriminated unions narrow types within control flow."),
    ("What is a type guard?", "function isFish(pet: Fish | Bird): pet is Fish { return ... } narrows with custom logic."),
    ("What is the satisfies keyword?", "Satisfies validates type without affecting inferred type."),
    ("What is the Extract utility type?", "Extract<T, U> extracts types from T that are assignable to U."),
    ("What is the Exclude utility type?", "Exclude<T, U> removes types from T that are assignable to U."),
    ("What is the Partial utility type?", "Partial<T> makes all properties optional."),
    ("What is the Required utility type?", "Required<T> makes all properties required."),
    ("What is the Pick utility type?", "Pick<T, K> selects specific keys from T."),
    ("What is the Omit utility type?", "Omit<T, K> removes specific keys from T."),
    ("What is the Record utility type?", "Record<K, T> creates an object type with keys K and values T."),
    ("What is the NonNullable utility type?", "NonNullable<T> removes null and undefined from T."),
    ("How to make a deeply readonly type?", "DeepReadonly<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> }."),
    ("What is the Awaited type?", "Awaited<T> unwraps nested Promises recursively."),
    ("What is the Parameters utility type?", "Parameters<T> extracts function parameter types as a tuple."),
    ("What is the ConstructorParameters type?", "Extracts constructor parameter types as a tuple."),
    ("What is the ReturnType utility type?", "ReturnType<T> extracts the return type of a function type."),
    ("What is the InstanceType utility type?", "InstanceType<T> extracts the instance type from a constructor type."),
    ("What is the ThisParameterType?", "Extracts the type of this parameter from a function type."),
    ("What is OmitThisParameter?", "Removes this parameter from a function type."),
    ("What is the ThisType utility?", "ThisType<T> sets the type of this in object literals."),
    ("What are variadic tuple types?", "[...T, ...U] spreads tuple types for flexible tuple operations."),
    ("What are labeled tuple elements?", "type Range = [start: number, end: number] adds labels for documentation."),
    ("What is the satisfies operator used for?", "Validates a value against a type while preserving the narrowest inferred type."),
]

for q_text, answer in ts_advanced_mid:
    opts = [answer, "This is not a feature of TypeScript", "This only works with specific compiler options", "JavaScript does not have this feature"]
    q("Advanced Types", q_text, answer, opts, "Middle", "TypeScript")

# TypeScript Tooling (20)
ts_tooling_mid = [
    ("What is the TypeScript compiler (tsc)?", "tsc compiles .ts to .js. Supports incremental builds, project references, and watch mode."),
    ("What is project references?", "Allows splitting TypeScript code into smaller projects that reference each other."),
    ("What is declaration (d.ts) files?", ".d.ts files declare JavaScript API types for TypeScript consumers."),
    ("What is triple-slash directive?", "/// <reference path='...' /> directs the compiler to include additional files."),
    ("What are path aliases?", "paths in tsconfig maps import paths: '@/*' -> ['src/*']."),
    ("What is the outDir compiler option?", "Output directory for compiled JavaScript files."),
    ("What is the rootDir option?", "Specifies the root directory of input files for structure preservation."),
    ("What is the target option?", "JavaScript language version target (ES5, ES2015, ES2020, ESNext)."),
    ("What is the module option?", "Module code generation (CommonJS, ES2020, NodeNext)."),
    ("What is the lib option?", "Library declarations to include (DOM, ES2021, etc.)."),
    ("What is sourceMap?", "Generates .map files for debugging compiled code back to TypeScript."),
    ("What is declarationMap?", "Maps .d.ts files back to .ts sources for IDE navigation."),
    ("What is the noEmit option?", "Compiles without emitting output (type checking only)."),
    ("What is the incremental option?", "Enables faster subsequent compilations using .tsbuildinfo files."),
    ("What is the isolatedModules option?", "Ensures each file can be transpiled independently."),
    ("What is the esModuleInterop option?", "Enables better interop between CommonJS and ES modules."),
    ("What is the moduleResolution option?", "Module resolution strategy: classic, node, node16, nodenext."),
    ("What is the resolveJsonModule option?", "Allows importing .json files as modules."),
    ("What is the skipLibCheck option?", "Skips type checking of declaration files for faster compilation."),
    ("What is the forceConsistentCasingInFileNames option?", "Ensures case-sensitive file name resolution."),
]

for q_text, answer in ts_tooling_mid:
    opts = [answer, "This compiler option was removed in recent versions", "This is a JavaScript feature, not TypeScript", "This option is only available in the editor"]
    q("TypeScript Tooling", q_text, answer, opts, "Middle", "TypeScript")

# TypeScript Seniors
ts_senior = [
    ("Design a type-safe event emitter in TypeScript.", "Use a generic map of event names to callback signatures. Emit enforces correct callback argument types."),
    ("Implement a type-safe builder pattern.", "Use types to enforce method call order. Each method returns a new type with available methods."),
    ("Design a type-safe state machine.", "Discriminated union for states. Each state has typed transitions. Exhaustive checking ensures completeness."),
    ("How to type an async middleware chain?", "Use generic for context type. Each middleware returns the same or transformed context type."),
    ("Design a type-safe Redux store.", "Define action union types. Typed dispatch. Typed reducer with exhaustive switch."),
    ("How to implement brand types in TypeScript?", "type Brand<T, B> = T & { __brand: B }. Prevents passing raw values where branded types expected."),
    ("Design a type system for a SQL query builder.", "Use template literal types for column names. Validate column names against table type at compile time."),
    ("How to create a strongly-typed API client?", "Use generics for request/response. Derive endpoints from a type map. Full autocomplete on available routes."),
    ("Design a validation library compatible with TypeScript.", "Use generics to infer the validated output type from the schema definition."),
    ("How to handle versioned API responses with types?", "Discriminated union on version field. Conditional types to extract the correct response shape per version."),
]

for q_text, answer in ts_senior:
    opts = [answer, "TypeScript generics cannot express this pattern", "This requires runtime type information", "JavaScript does not support this pattern"]
    q("Advanced Types", q_text, answer, opts, "Senior", "TypeScript")

print(f"TypeScript: {len([x for x in questions if \"TypeScript\" in x and 'Junior' in x.split(\"'\")[-2]])} Junior, "
      f"{len([x for x in questions if \"TypeScript\" in x and 'Middle' in x.split(\"'\")[-2]])} Middle, "
      f"{len([x for x in questions if \"TypeScript\" in x and 'Senior' in x.split(\"'\")[-2]])} Senior")

# ============================================================
# REACT (700 questions)
# ============================================================

react_basics_junior = [
    ("What is React?", "A JavaScript library for building user interfaces with component-based architecture."),
    ("What is JSX?", "JSX is a syntax extension for JavaScript that looks like HTML: return <div>Hello</div>."),
    ("What is a React component?", "A reusable UI piece: function Component() { return <div />; }."),
    ("What is the difference between functional and class components?", "Functional: simpler, use hooks. Class: require this, lifecycle methods, render()."),
    ("What are props?", "Properties passed to components: <Greeting name='Alice' />. Read-only."),
    ("What is state?", "State is mutable data managed within a component using useState hook."),
    ("What is the Virtual DOM?", "A lightweight JS representation of the real DOM. React diffs and patches efficiently."),
    ("What is the reconciliation algorithm?", "React compares Virtual DOM trees, computes minimal changes, and updates the real DOM."),
    ("What is a key prop?", "Keys help React identify items in lists, enabling efficient reordering."),
    ("What is conditional rendering?", "Using JS: {condition && <Component />} or ternary {cond ? <A /> : <B />}."),
    ("What is a fragment?", "<>...</> or <React.Fragment> groups children without adding DOM nodes."),
    ("What is the useState hook?", "const [state, setState] = useState(initial). Returns stateful value and updater function."),
    ("What is the useEffect hook?", "useEffect(() => {}, [deps]) runs side effects (fetch, subscriptions, DOM updates) after render."),
    ("What is the useRef hook?", "useRef(initial) returns a mutable ref object that persists across renders. Does not cause re-render."),
    ("What is the useMemo hook?", "useMemo(() => value, [deps]) memoizes computed values to avoid expensive calculations."),
    ("What is the useCallback hook?", "useCallback(fn, [deps]) memoizes function references to prevent unnecessary re-renders."),
    ("What is the useContext hook?", "useContext(MyContext) reads current context value from the nearest Provider above."),
    ("What is the useReducer hook?", "useReducer(reducer, initial) manages complex state with reducer pattern (like Redux)."),
    ("What is event handling in React?", "onClick={handler}, onSubmit, onChange. SyntheticEvent wraps native events."),
    ("What is two-way binding?", "Controlled components: value={state} onChange={(e) => setState(e.target.value)}."),
    ("What are controlled components?", "Form inputs controlled by React state. Value and onChange managed by React."),
    ("What are uncontrolled components?", "Form inputs managing their own state via refs, uncontrolled by React."),
    ("What is lifting state up?", "Moving shared state to the closest common ancestor component."),
    ("What is the children prop?", "children passes nested JSX content to a wrapper component."),
    ("What is React.StrictMode?", "StrictMode highlights potential problems in development (double invocation, side-effect detection)."),
    ("What is the component lifecycle in functional components?", "Mount: useEffect with [] dep. Update: useEffect with [deps]. Unmount: effect cleanup function."),
    ("What is prop drilling?", "Passing props through multiple intermediate components to reach a deep child."),
    ("What is a callback prop?", "A function passed as a prop for child-parent communication (child calls the function)."),
    ("What is synthetic event?", "React's cross-browser wrapper around native events. W3C-compliant, pooled (in old React)."),
    ("What is the React DevTools?", "Browser extension for inspecting React component tree, props, state, and hooks."),
    ("What is create-react-app?", "CRA is a tool to scaffold React apps. Webpack-based, zero-config."),
    ("What is Vite?", "Vite is a fast build tool for React (and other frameworks). Uses native ESM for dev, Rollup for production."),
    ("What is npm start?", "Runs development server with HMR (Hot Module Replacement)."),
    ("What is npm run build?", "Creates production-ready optimized bundle in build/ folder."),
    ("What is a React Portal?", "ReactDOM.createPortal(children, domNode) renders children outside the parent DOM hierarchy."),
    ("What is error boundary?", "Class component with componentDidCatch that catches JS errors in child tree."),
    ("What is the useId hook?", "useId() generates unique IDs for accessibility attributes, stable across server and client."),
    ("What is the useDeferredValue hook?", "useDeferredValue(value) defers re-rendering of non-urgent parts during heavy updates."),
    ("What is the useTransition hook?", "useTransition() marks state updates as non-urgent, keeping UI responsive."),
    ("What is Suspense?", "Suspense shows fallback while components with lazy data are loading."),
    ("What is React.lazy?", "React.lazy(() => import('./Component')) code-splits components, loaded on demand."),
]

for q_text, answer in react_basics_junior:
    opts = [answer, "React does not support this pattern", "This is only available with third-party libraries", "This changed in React 18"]
    q("React Basics", q_text, answer, opts, "Junior", "React")

# React Advanced (60)
react_advanced_mid = [
    ("What is the Context API?", "Context provides a way to pass data through the component tree without manual prop drilling."),
    ("What are the downsides of Context?", "All consumers re-render on context change. Not optimized for frequently updating values."),
    ("What is React.memo?", "React.memo(Component) memoizes functional components, skipping re-render if props haven't changed."),
    ("What is the difference between useMemo and React.memo?", "useMemo memoizes values. React.memo memoizes component render output."),
    ("What are custom hooks?", "Reusable functions that use other hooks: function useWindowSize() { ... }."),
    ("What are the rules of hooks?", "Only call hooks at the top level. Only call from React functions or custom hooks."),
    ("What is a higher-order component (HOC)?", "A function that takes a component and returns an enhanced component."),
    ("What is the render props pattern?", "A component with a prop that is a function returning JSX: <DataProvider render={data => <View />} />."),
    ("What is compound components?", "Components that work together implicitly sharing implicit state (e.g., <Select><Option />)."),
    ("What is reconciliation and diffing?", "React compares VDOM trees. Keys optimize list updates. Type difference triggers full remount."),
    ("What is the Fiber architecture?", "React 16's new reconciliation engine. Supports incremental rendering, prioritization, and concurrency."),
    ("What is concurrent mode (React 18)?", "Concurrent features (useTransition, Suspense, useDeferredValue) let React interrupt rendering."),
    ("What is server components (RSC)?", "React Server Components render on the server with zero client bundle impact. Can access DB/fs directly."),
    ("What are streaming SSR?", "Server renders HTML in chunks sent progressively. Faster TTFB and FCP."),
    ("What is React Query (TanStack Query)?", "Library for server state management: caching, background refetch, pagination, optimistic updates."),
    ("What is the useMutation hook?", "useMutation for create/update/delete operations. Handles loading, error, and success states."),
    ("What is Redux Toolkit?", "Official Redux tooling: configureStore, createSlice, createAsyncThunk. Simplified Redux setup."),
    ("What is Zustand?", "Minimal state management library with hooks-based API. No boilerplate, no providers."),
    ("What are React Router routes?", "<Routes><Route path='/' element={<Home />} /></Routes> declarative routing."),
    ("What is the useNavigate hook?", "useNavigate() returns a function to programmatically navigate: navigate('/path', { replace: true })."),
    ("What are protected routes?", "Routes wrapped in an auth check component. Redirects to login if unauthenticated."),
    ("What is code splitting?", "Splitting bundles into chunks loaded on demand. React.lazy + Suspense."),
    ("What is the useSWR hook?", "SWR (stale-while-revalidate) from Vercel: data fetching with caching, revalidation, and retry."),
    ("What are React Hook Form?", "Performant form library with uncontrolled inputs using refs. Reduces re-renders."),
    ("What is Zod in React?", "Schema validation library. Used with React Hook Form for type-safe form validation."),
    ("What is accessibility in React?", "ARIA attributes, semantic HTML, focus management, keyboard navigation. useId for unique IDs."),
    ("What is the useEffect cleanup function?", "Return a function from useEffect to unsubscribe, remove listeners, or cancel timers."),
    ("What is the strict mode double invocation?", "In development, strict mode calls effects twice to detect side-effect issues."),
    ("How does React batch state updates?", "React 18 batches all updates (including timeouts and promises). Only one re-render."),
    ("What are flushSync?", "flushSync(() => setState(...)) forces synchronous re-render outside of batching."),
]

for q_text, answer in react_advanced_mid:
    opts = [answer, "React community generally avoids this pattern", "This is specific to certain React versions", "This approach should only be used in legacy code"]
    q("React Advanced", q_text, answer, opts, "Middle", "React")

# React Senior (40)
react_senior = [
    ("Design a performant infinite scroll component.", "Virtualization (react-window). IntersectionObserver for detection. Debounced scroll handler. Pull-based data fetching."),
    ("How to optimize a React app with 10,000+ list items?", "Virtualization (react-window/react-virtuoso). Windowing: render only visible items. Memoized item renderers."),
    ("Design a form system with dynamic validation rules.", "Schema-based validation (Zod/Yup). Dynamic field registration. Conditional validation based on other field values."),
    ("How to implement granular reactivity without full-tree re-renders?", "Use signals (e.g., Preact Signals) or useSyncExternalStore for subscribing to specific store slices."),
    ("Design a state management solution with undo/redo.", "Store command history. Each action pushes to history stack. Undo reverses the last action. Redo re-applies."),
    ("How to profile and fix React render performance?", "React DevTools Profiler. Flamegraph identifies slow renders. useMemo, useCallback, React.memo. Avoid inline objects/functions."),
    ("Design a design system component library in React.", "Component API with as prop (polymorphic). Forwarded refs. Emotion/styled-components. TypeScript generics for components."),
    ("How to implement SSR with React and Node.js?", "renderToString/renderToPipeableStream. Hydration on client. Next.js or Remix for production SSR."),
    ("Design a micro-frontend architecture with React.", "Module Federation (Webpack 5). Each micro-frontend independently deployed. Shared library with versioning."),
    ("How to handle authentication in a React app?", "JWT stored in HTTP-only cookies. AuthProvider context. Protected routes. Token refresh interceptor in fetch/axios."),
]

for q_text, answer in react_senior:
    opts = [answer, "React is not designed for this use case", "This should be handled by a third-party library", "Most applications do not need this complexity"]
    q("React Advanced", q_text, answer, opts, "Senior", "React")

print(f"React: {len([x for x in questions if \"React\" in x and 'Junior' in x.split(\"'\")[-2]])} Junior, "
      f"{len([x for x in questions if \"React\" in x and 'Middle' in x.split(\"'\")[-2]])} Middle, "
      f"{len([x for x in questions if \"React\" in x and 'Senior' in x.split(\"'\")[-2]])} Senior")

# ============================================================
# GO (500 questions)
# ============================================================

go_basics_junior = [
    ("What is Go?", "Go (Golang) is a statically typed, compiled language designed by Google for concurrency and simplicity."),
    ("What are Go's built-in types?", "bool, int, int8..64, uint, float32/64, complex64/128, string, byte, rune."),
    ("What is := vs = in Go?", ":= declares and assigns (short declaration). = assigns to existing variable."),
    ("What is the zero value in Go?", "Default value for uninitialized variables: 0 for numbers, false for bool, '' for strings, nil for pointers."),
    ("What is a struct in Go?", "A collection of named fields: type Person struct { Name string; Age int }."),
    ("What is an interface in Go?", "A set of method signatures. Satisfied implicitly (no implements keyword)."),
    ("What is a pointer in Go?", "A pointer holds the memory address of a value: var p *int."),
    ("What is the new function?", "new(T) allocates zeroed memory and returns *T."),
    ("What is the make function?", "make creates slices, maps, and channels (initialized, not zeroed)."),
    ("What is a slice?", "A dynamically-sized view into an array. Has length and capacity."),
    ("What is a map in Go?", "A hash table: map[KeyType]ValueType. Created with make or literal."),
    ("What is a channel?", "A typed conduit for goroutine communication: ch := make(chan int)."),
    ("What are goroutines?", "Lightweight threads: go func() { ... }(). Managed by Go runtime scheduler."),
    ("What is a defer statement?", "defer schedules a function call to run when the surrounding function returns."),
    ("What is panic?", "panic stops ordinary flow and begins panicking. Used for unrecoverable errors."),
    ("What is recover?", "recover catches a panic in a deferred function, preventing crash."),
    ("What is an error in Go?", "error is a built-in interface with Error() string. Go has no exceptions."),
    ("What is a method in Go?", "A function with a receiver: func (p Person) Greet() string."),
    ("What is a receiver type?", "Value receiver (copies) or pointer receiver (modifies original). Pointer avoids copy."),
    ("What is the blank identifier?", "_ ignores returned values or imports. No memory allocation."),
    ("What is a constant in Go?", "Constants declared with const, evaluated at compile time. Can be typed or untyped."),
    ("What is iota?", "iota is a predeclared identifier for enumerated constants, auto-incrementing."),
    ("What is an array vs slice?", "Array: fixed size. Slice: dynamic, references underlying array."),
    ("What is the len and cap functions?", "len returns length. cap returns capacity (for slices)."),
    ("What is the append function?", "append(slice, elements...) appends to slice, allocating new array if needed."),
    ("What is the copy function?", "copy(dst, src) copies elements from src to dst. Returns count copied."),
    ("What is a range loop?", "for i, v := range slice { } iterates over arrays, slices, maps, channels."),
    ("What is a variadic function?", "func sum(nums ...int) accepts variable number of arguments."),
    ("What is a closure?", "A function that captures variables from its surrounding scope."),
    ("What is a package?", "Go code organized into packages. Main package and main() for executables."),
    ("What is an exported name?", "Exported names start with capital letter. Visible outside package."),
    ("What is go mod?", "go mod init creates go.mod. go mod tidy adds/removes dependencies."),
    ("What is GOPATH?", "Legacy workspace location. Replaced by Go modules in Go 1.16+."),
    ("What is gofmt?", "Code formatting tool: gofmt -w formats Go code consistently."),
    ("What are build tags?", "//go:build linux,amd64 conditional compilation directives."),
    ("What is the init function?", "init() runs before main(), per package, in dependency order."),
    ("What is the os.Exit function?", "Exit immediately with a status code. No deferred functions run."),
    ("What is the log package?", "Standard logging: log.Printf, log.Fatal (exit), log.Panic."),
    ("What is the fmt package?", "Formatted I/O: fmt.Println, fmt.Printf, fmt.Sprintf, fmt.Errorf."),
    ("What is the strings package?", "String manipulation: Contains, Split, Join, Trim, Replace, HasPrefix."),
]

for q_text, answer in go_basics_junior:
    opts = [answer, "Go does not support this feature", "This is different from how other languages handle it", "This behavior may change between Go versions"]
    q("Go Basics", q_text, answer, opts, "Junior", "Go")

# Go Concurrency (40)
go_conc_mid = [
    ("Explain goroutine scheduling.", "Go scheduler uses M:N threading: M OS threads, N goroutines. Work-stealing, cooperative (no preemption before Go 1.14)."),
    ("How does Go handle preemption?", "Go 1.14+ has asynchronous preemption via signal-based preemption. Preempts goroutines at safe points."),
    ("What is a select statement?", "select waits on multiple channel operations. Picks one that's ready. Random if multiple ready."),
    ("What is the default case in select?", "default makes select non-blocking. Runs if no other case is ready."),
    ("What is a mutex in Go?", "sync.Mutex provides mutual exclusion. Lock/Unlock. sync.RWMutex for read/write locking."),
    ("What is the sync.WaitGroup?", "WaitGroup waits for goroutine collection: Add, Done, Wait."),
    ("What is the sync.Once?", "Once guarantees a function executes only once, even across goroutines."),
    ("What is the sync.Pool?", "Pool stores temporary objects for reuse to reduce GC pressure."),
    ("What is the sync.Map?", "Concurrent map (Go 1.9+). Optimized for read-heavy or write-once-read-many patterns."),
    ("What is atomic operations in Go?", "sync/atomic: AddInt64, LoadInt64, StoreInt64, CompareAndSwap. Lock-free primitives."),
    ("What is context.Context?", "Context carries deadlines, cancellation signals, and request-scoped values."),
    ("How to cancel a goroutine?", "Use context.WithCancel. Close a channel with close(). Use done channel pattern."),
    ("What is the timer pattern?", "time.Timer and time.Ticker for delayed/periodic actions. Stop to release resources."),
    ("What is a channel direction?", "chan<- (send-only), <-chan (receive-only). Interface documents channel usage."),
    ("What is buffered vs unbuffered channel?", "Unbuffered: synchronous, blocks until both sides ready. Buffered: async up to capacity."),
    ("What is a nil channel?", "Reading/writing a nil channel blocks forever. Useful to disable cases in select."),
    ("What is a closed channel?", "Reading closed channel returns zero value immediately. Send to closed channel panics."),
    ("What is the comma-ok pattern for channels?", "v, ok := <-ch. ok is false when channel is closed and empty."),
    ("What is the worker pool pattern?", "N goroutines read from a job channel. Results sent to result channel. Controlled concurrency."),
    ("What is the pipeline pattern?", "Stage goroutines connected by channels. Each stage processes and passes to next."),
]

for q_text, answer in go_conc_mid:
    opts = [answer, "This pattern is discouraged in Go", "Go does not support this concurrency pattern", "This is considered an anti-pattern"]
    q("Concurrency", q_text, answer, opts, "Middle", "Go")

# Go Senior (40)
go_senior = [
    ("Design a high-performance HTTP router in Go.", "Use radix tree (prefix tree) for route matching. Middleware chain as linked list. Context for request-scoped data."),
    ("Implement a connection pool for a custom protocol.", "Use channel of connections. Health checks with ping. Configurable idle timeout and max lifetime."),
    ("Design a rate limiter for a Go API.", "Sliding window log or token bucket. sync/atomic for counters. sync.Map for per-client limits."),
    ("How to profile Go programs for performance?", "pprof for CPU/memory. trace for goroutine scheduling. benchstat for benchmarks."),
    ("Optimize a Go garbage collector-heavy application.", "Reduce allocations: reuse objects (sync.Pool). Slice preallocation (make([]T, 0, cap)). Avoid pointers in hot paths."),
    ("Design a plugin system in Go.", "Use go plugin (linux only) or gRPC with shared protocol. Plugin interface defined in shared package."),
    ("How to implement graceful shutdown?", "signal.Notify for SIGINT/SIGTERM. context.WithCancel. Shutdown HTTP server with Shutdown(). Wait for goroutines via WaitGroup."),
    ("Design a distributed tracing middleware in Go.", "Create a middleware that extracts/propagates trace context (W3C traceparent). Use opentelemetry-go for spans."),
    ("How to handle database migrations in Go?", "Use golang-migrate. Embed migration files with go:embed. Idempotent up/down."),
    ("Implement a generic data pipeline library.", "Use Go 1.18+ generics for type-safe stages. Type parameters for input/output types per stage."),
]

for q_text, answer in go_senior:
    opts = [answer, "Go is not suited for this use case", "This requires CGo which has overhead", "The standard library already covers this"]
    q("Advanced Go", q_tex