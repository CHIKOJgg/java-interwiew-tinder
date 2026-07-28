"""Batch 21: Push over 9000"""
MJS = 'C:/Users/Honor/Desktop/Code/java-interview-tinder/backend/src/scripts/seed-generated.mjs'
with open(MJS, 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.index('\nasync function seedDB()')
n = []

def esc(s):
    return s.replace('\\', '\\\\').replace("'", "\\'")

def Q(cat, q, a, diff, lang):
    n.append(f"  Q('{esc(cat)}', '{esc(q)}', '{esc(a)}', ['{esc(a)}', 'Common misconception', 'Alternative approach', 'I don\\'t know'], '{diff}', '{lang}');\n")

def g(t, d, l):
    for c, q, a in t:
        Q(c, q, a, d, l)

g([
    ("Java Performance", "What is false sharing?", "Cache line invalidation from unrelated data"),
    ("Java Performance", "What is @Contended annotation?", "Pads fields to avoid false sharing"),
    ("Java Performance", "What is biased locking revocation?", "Revoke bias when lock contended by other thread"),
    ("Java Performance", "What is the -XX:+PrintGCDateStamps?", "GC log with human-readable timestamps"),
    ("Java Performance", "What is the -Xlog:gc* (Java 9+)?", "Unified JVM logging for GC"),
    ("Java Performance", "What is the -XX:+UseStringDeduplication?", "Deduplicates identical strings in heap"),
    ("Java Performance", "What is the -XX:+AlwaysPreTouch?", "Pre-touches heap pages at startup"),
    ("Java Performance", "What is the -XX:+UseLargePages?", "Enables large memory pages for performance"),
    ("Java Performance", "What is the -XX:+UseTransparentHugePages?", "Transparent huge pages on Linux"),
    ("Java Performance", "What is the -XX:+FlushFinalizationOnExit?", "Forces finalization on JVM shutdown"),
    ("Python Async", "What is nursery in trio?", "Structured concurrency scope for tasks"),
    ("Python Async", "What is the cancel scope in trio?", "Cancellation boundary for async tasks"),
    ("Python Async", "What is the anyio library?", "Unified async API across asyncio and trio"),
    ("Python Async", "What is anyio.create_task_group()?", "Structured concurrency scope"),
    ("Python Async", "What is anyio.Path?", "Async filesystem path operations"),
    ("Python Async", "What is asyncio.Runner (3.11)?", "Context manager for event loop management"),
    ("Python Async", "What is TaskGroup (3.11+)?", "Structured concurrency for asyncio"),
    ("Python Async", "What is asyncio Barrier?", "Synchronization primitive for async tasks"),
    ("Python Async", "What is context variable propagation?", "Copying context vars across async boundaries"),
    ("Python Async", "What is the sniffio library?", "Detects async library (asyncio/trio/curio) at runtime"),
], "Senior", "Python")

g([
    ("GraphQL", "What is GraphQL schema?", "Defines types, queries, mutations, subscriptions"),
    ("GraphQL", "What is GraphQL resolver?", "Function fetching data for a field"),
    ("GraphQL", "What is the GraphQL executor?", "Resolves queries by calling resolvers"),
    ("GraphQL", "What is GraphQL subscription?", "Real-time updates via WebSocket"),
    ("GraphQL", "What is GraphQL fragment?", "Reusable field selection set"),
    ("GraphQL", "What is GraphQL union?", "Type that can be one of multiple object types"),
    ("GraphQL", "What is GraphQL interface?", "Abstract type with common fields"),
    ("GraphQL", "What is GraphQL input type?", "Complex input for mutations"),
    ("GraphQL", "What is the N+1 problem in GraphQL?", "Extra DB queries per resolver call, solved by DataLoader"),
    ("GraphQL", "What is DataLoader?", "Batching and caching layer for GraphQL resolvers"),
    ("GraphQL", "What is Apollo Server?", "Production-ready GraphQL server"),
    ("GraphQL", "What is Apollo Client?", "Frontend GraphQL client with caching"),
    ("GraphQL", "What is Apollo cache persistence?", "Persists cache to local storage"),
    ("GraphQL", "What is GraphQL Code Generator?", "Generates TypeScript types from schema"),
    ("GraphQL", "What is GraphQL Yoga?", "Cross-platform GraphQL server"),
    ("GraphQL", "What is Hasura?", "Instant GraphQL API on databases"),
    ("GraphQL", "What is Prisma + GraphQL?", "Prisma Client as resolver data source"),
    ("GraphQL", "What is GraphQL federation?", "Distributed GraphQL across multiple services"),
    ("GraphQL", "What is Apollo Federation?", "Federated GraphQL gateway pattern"),
    ("GraphQL", "What is GraphQL directives?", "Schema annotations for behavior modification"),
], "Middle", "General")

with open(MJS, 'w', encoding='utf-8') as f:
    f.write(content[:idx] + ''.join(n) + content[idx:])
print(f"Batch 21 added {len(n)} questions.")