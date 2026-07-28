"""Batch 20: Final ~85 questions to reach ~9000"""
import json
MJS = 'C:/Users/Honor/Desktop/Code/java-interview-tinder/backend/src/scripts/seed-generated.mjs'
with open(MJS, 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.index('\nasync function seedDB()')
new = []

def esc(s):
    return s.replace('\\', '\\\\').replace("'", "\\'")

def Q(cat, q, a, diff, lang):
    opts = [a, 'Common misconception', 'Alternative approach', 'I don\'t know']
    json.dumps({"category": cat, "question": q, "short_answer": a, "options": opts, "difficulty": diff, "language": lang}, ensure_ascii=False)
    new.append(f"  Q('{esc(cat)}', '{esc(q)}', '{esc(a)}', ['{esc(opts[0])}', '{esc(opts[1])}', '{esc(opts[2])}', '{esc(opts[3])}'], '{diff}', '{lang}');\n")

def g(t, d, l):
    for c, q, a in t:
        Q(c, q, a, d, l)

g([
    ("Java Serialization", "What is Serializable interface?", "Marker interface for Java object serialization"),
    ("Java Serialization", "What is serialVersionUID?", "Version identifier for serialization compatibility"),
    ("Java Serialization", "What is the transient keyword?", "Excludes field from default serialization"),
    ("Java Serialization", "What is readObject()/writeObject()?", "Custom serialization methods in class"),
    ("Java Serialization", "What is readResolve()?", "Replaces deserialized object with singleton"),
    ("Java Serialization", "What is writeReplace()?", "Substitutes object before serialization"),
    ("Java Serialization", "What is Externalizable interface?", "Full control over serialization format"),
    ("Java Serialization", "What is ObjectOutputStream?", "Serializes objects to output stream"),
    ("Java Serialization", "What is ObjectInputStream?", "Deserializes objects from input stream"),
    ("Java Serialization", "What is Java serialization vulnerability?", "Arbitrary code execution via malicious stream"),
], "Senior", "Java")

g([
    ("Python Performance", "What is PyPy?", "JIT-compiled Python implementation for speed"),
    ("Python Performance", "What is Cython?", "C-extension compiler for Python-like code"),
    ("Python Performance", "What is Numba?", "JIT compiler for numerical Python functions"),
    ("Python Performance", "What is __slots__ memory benefit?", "Reduces memory by eliminating __dict__"),
    ("Python Performance", "What is string interning?", "Reuses same string object for identical literals"),
    ("Python Performance", "What is the array vs list performance?", "array stores homogeneous types compactly"),
    ("Python Performance", "What is the deque vs list for queue?", "deque has O(1) append/pop at both ends"),
    ("Python Performance", "What is cache locality?", "CPU cache-friendly data access patterns"),
    ("Python Performance", "What is the functools.lru_cache?", "Memoization decorator with LRU eviction"),
    ("Python Performance", "What is profiling with timeit?", "Measures small code snippets execution time"),
], "Senior", "Python")

g([
    ("System Design", "What is write-ahead logging?", "Log changes before applying them"),
    ("System Design", "What is shadow paging?", "Copy-on-write page management for crash recovery"),
    ("System Design", "What is checkpointing?", "Flushing dirty pages to stable storage"),
    ("System Design", "What is the ARIES recovery algorithm?", "Algorithm for transaction rollback and crash recovery"),
    ("System Design", "What is steal/no-steal buffer policy?", "Whether dirty pages can be written before commit"),
    ("System Design", "What is force/no-force policy?", "Whether updates forced to disk at commit"),
    ("System Design", "What is strict two-phase locking?", "Releases locks only after transaction commits"),
    ("System Design", "What is the lock manager?", "Maintains lock table and detects deadlocks"),
    ("System Design", "What is predicate locking?", "Locks based on search conditions"),
    ("System Design", "What is index locking?", "Locks index entries for concurrency control"),
    ("System Design", "What is multigranularity locking?", "Locking at database, table, page, row levels"),
    ("System Design", "What is intention locking?", "IS, IX, SIX locks for hierarchical locking"),
    ("System Design", "What is timestamp-based concurrency?", "Assigns timestamps to order transactions"),
    ("System Design", "What is validation-based concurrency?", "Optimistic concurrency with validation phase"),
    ("System Design", "What is Snapshot Isolation?", "Each transaction sees a consistent database snapshot"),
    ("System Design", "What is write skew anomaly?", "Concurrent writes cause constraint violation"),
    ("System Design", "What is read-only transaction optimization?", "Avoids locking for read-only transactions"),
    ("System Design", "What is hot standby?", "Warm replica ready to take over on failure"),
    ("System Design", "What is synchronous replication?", "Master waits for replica acknowledgment"),
    ("System Design", "What is quorum-based replication?", "Requires majority of replicas for writes"),
], "Senior", "General")

g([
    ("DSA", "What is amortized analysis?", "Average cost per operation over sequence"),
    ("DSA", "What is the Master Theorem?", "Analyzes divide-and-conquer recurrence relations"),
    ("DSA", "What is the P vs NP problem?", "Whether problems verifiable in polynomial time are solvable"),
    ("DSA", "What is dynamic programming?", "Optimal substructure + overlapping subproblems"),
    ("DSA", "What is memoization vs tabulation?", "Memo: top-down; Tabulation: bottom-up"),
    ("DSA", "What is greedy algorithm?", "Makes locally optimal choice at each step"),
    ("DSA", "What is backtracking?", "Explores all candidates, abandons when invalid"),
    ("DSA", "What is the 0/1 Knapsack problem?", "Maximize value with weight constraint, cannot split"),
    ("DSA", "What is the Longest Common Subsequence?", "LCS of two sequences via DP"),
    ("DSA", "What is the Floyd-Warshall algorithm?", "All-pairs shortest paths in weighted graph"),
    ("DSA", "What is the Kruskal algorithm?", "Minimum spanning tree with union-find"),
    ("DSA", "What is the Prim algorithm?", "Minimum spanning tree growing from single node"),
    ("DSA", "What is the A* search algorithm?", "Heuristic pathfinding with f = g + h"),
    ("DSA", "What is the Bellman-Ford algorithm?", "Shortest path with negative edges, detects cycles"),
    ("DSA", "What is the Topological Sort?", "Linear ordering of DAG with Kahn's or DFS"),
], "Senior", "General")

with open(MJS, 'w', encoding='utf-8') as f:
    f.write(content[:idx] + ''.join(new) + content[idx:])
print(f"Batch 20 added {len(new)} questions.")