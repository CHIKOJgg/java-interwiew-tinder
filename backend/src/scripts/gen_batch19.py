"""Batch 19: Final ~210 questions to reach ~9000"""
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
    ("Java EE", "What is JTA?", "Java Transaction API for distributed transactions"),
    ("Java EE", "What is UserTransaction?", "Programmatic transaction control interface"),
    ("Java EE", "What is JPA EntityManager?", "Persistence context for entity operations"),
    ("Java EE", "What is JPA cascade types?", "ALL, PERSIST, MERGE, REMOVE, REFRESH, DETACH"),
    ("Java EE", "What is JPA fetch types?", "LAZY (on demand) and EAGER (immediate loading)"),
    ("Java EE", "What is JPA locking?", "Optimistic (@Version) and pessimistic (PESSIMISTIC_READ/WRITE)"),
    ("Java EE", "What is JPA named query?", "Predefined query with @NamedQuery annotation"),
    ("Java EE", "What is JPA criteria API?", "Type-safe dynamic query building"),
    ("Java EE", "What is JPA metamodel?", "Static metamodel classes for criteria queries"),
    ("Java EE", "What is JPA entity graph?", "Defines fetch plan for query optimization"),
    ("Java EE", "What is JPA second-level cache?", "Shared cache across persistence contexts"),
    ("Java EE", "What is JPA flush mode?", "AUTO (before query) or COMMIT (at transaction end)"),
    ("Java EE", "What is JPA sequence generator?", "@SequenceGenerator for database sequence"),
    ("Java EE", "What is JPA table generator?", "@TableGenerator simulating sequence with table"),
    ("Java EE", "What is JPA converter?", "@Converter for custom type mapping"),
], "Senior", "Java")

g([
    ("Python Testing", "What is pytest fixture scope?", "function, class, module, package, session"),
    ("Python Testing", "What is pytest fixture autouse?", "Fixture runs automatically for all tests"),
    ("Python Testing", "What is pytest fixture params?", "Runs fixture with multiple parameter values"),
    ("Python Testing", "What is pytest tmp_path?", "Temporary directory fixture"),
    ("Python Testing", "What is pytest monkeypatch?", "Modify objects and env vars during tests"),
    ("Python Testing", "What is pytest capsys?", "Capture stdout and stderr"),
    ("Python Testing", "What is pytest caplog?", "Capture log output"),
    ("Python Testing", "What is pytest mark parametrize?", "Run test with multiple argument sets"),
    ("Python Testing", "What is pytest mark skip/skipif?", "Skip test unconditionally or conditionally"),
    ("Python Testing", "What is pytest mark xfail?", "Expected failure without failing suite"),
    ("Python Testing", "What is pytest fixture yield?", "Teardown after fixture yield statement"),
    ("Python Testing", "What is pytest conftest hierarchy?", "Scope chain: root, package, test file"),
    ("Python Testing", "What is pytest plugin?", "Extends pytest with hooks and fixtures"),
    ("Python Testing", "What is the unittest.mock.patch()?", "Temporarily replaces object in module scope"),
    ("Python Testing", "What is mock.return_value?", "Fixed return value for mock calls"),
    ("Python Testing", "What is mock.side_effect?", "Dynamic return values or exceptions"),
    ("Python Testing", "What is mock.call_args?", "Captured arguments from last call"),
    ("Python Testing", "What is mock.assert_called_once()?", "Verify mock called exactly once"),
    ("Python Testing", "What is mock.assert_called_with()?", "Verify mock called with specific args"),
    ("Python Testing", "What is MagicMock vs Mock?", "MagicMock has pre-created magic methods"),
], "Middle", "Python")

g([
    ("DevOps", "What is Terraform state locking?", "Prevents concurrent state modifications"),
    ("DevOps", "What is Terraform backend?", "Remote state storage (S3, Azure RM, GCS)"),
    ("DevOps", "What is Terraform HCL?", "HashiCorp Configuration Language syntax"),
    ("DevOps", "What is Terraform data source?", "Reads external resource for configuration"),
    ("DevOps", "What is Terraform output?", "Exposes resource attributes after apply"),
    ("DevOps", "What is Terraform variable?", "Input parameter for modules"),
    ("DevOps", "What is Terraform locals?", "Computed values reused within module"),
    ("DevOps", "What is Terraform module registry?", "Public repository for reusable modules"),
    ("DevOps", "What is Ansible playbook?", "YAML file with plays and tasks"),
    ("DevOps", "What is Ansible inventory?", "Host groups and variables for targets"),
    ("DevOps", "What is Ansible module?", "Idempotent unit of work (copy, apt, service)"),
    ("DevOps", "What is Ansible role?", "Organized directory structure for reuse"),
    ("DevOps", "What is Ansible Vault?", "Encrypts sensitive data in playbooks"),
    ("DevOps", "What is Ansible Galaxy?", "Community role repository"),
    ("DevOps", "What is Jenkins pipeline?", "Declarative or scripted CI/CD pipeline DSL"),
    ("DevOps", "What is Jenkinsfile?", "Pipeline definition stored in SCM"),
    ("DevOps", "What is Jenkins stage?", "Logical phase in pipeline execution"),
    ("DevOps", "What is Jenkins agent?", "Execution node for pipeline steps"),
    ("DevOps", "What is GitHub Actions workflow?", "Automated process with triggers and jobs"),
    ("DevOps", "What is GitHub Actions runner?", "Executes workflow jobs on specified OS"),
    ("DevOps", "What is GitHub Actions matrix?", "Run job across multiple OS/version combos"),
    ("DevOps", "What is GitHub Actions artifacts?", "Persist files between jobs"),
    ("DevOps", "What is GitHub Actions cache?", "Caches dependencies for faster runs"),
    ("DevOps", "What is GitHub Actions secret?", "Encrypted environment variables"),
    ("DevOps", "What is GitLab CI stages?", "Sequential pipeline phases"),
    ("DevOps", "What is GitLab CI job?", "Individual task with script and rules"),
    ("DevOps", "What is GitLab CI runner?", "Executes CI/CD jobs"),
    ("DevOps", "What is GitLab CI cache?", "Reuse files between pipeline runs"),
    ("DevOps", "What is GitLab CI artifact?", "Files produced by job for later use"),
    ("DevOps", "What is GitLab CI environment?", "Target deployment environment for job"),
], "Middle", "General")

g([
    ("Monitoring", "What is Prometheus?", "Open-source monitoring with time series database"),
    ("Monitoring", "What is a Prometheus metric?", "Time series identified by name and labels"),
    ("Monitoring", "What is Prometheus counter?", "Monotonically increasing cumulative metric"),
    ("Monitoring", "What is Prometheus gauge?", "Single numeric value that can go up/down"),
    ("Monitoring", "What is Prometheus histogram?", "Bucketed observations for quantile calculation"),
    ("Monitoring", "What is Prometheus summary?", "Configurable quantiles over sliding time window"),
    ("Monitoring", "What is PromQL rate() function?", "Per-second rate of change for counters"),
    ("Monitoring", "What is PromQL increase() function?", "Absolute increase over time range"),
    ("Monitoring", "What is PromQL histogram_quantile()?", "Computes quantiles from histogram buckets"),
    ("Monitoring", "What is PromQL avg_over_time()?", "Average value over specified time range"),
    ("Monitoring", "What is PromQL irate() function?", "Instant rate based on last two samples"),
    ("Monitoring", "What is Prometheus recording rules?", "Pre-computed expressions stored as new time series"),
    ("Monitoring", "What is Prometheus alerting rules?", "Conditions that trigger alerts to Alertmanager"),
    ("Monitoring", "What is Alertmanager?", "Handle alerts: dedup, group, route, silence"),
    ("Monitoring", "What is Prometheus ServiceMonitor?", "Kubernetes CRD for dynamic scrape config"),
    ("Monitoring", "What is Prometheus Operator?", "Kubernetes operator for managing Prometheus"),
    ("Monitoring", "What is Thanos?", "Global view, long-term storage for Prometheus"),
    ("Monitoring", "What is Thanos Sidecar?", "Uploads local TSDB blocks to object storage"),
    ("Monitoring", "What is Grafana dashboard?", "Visual dashboard with panels and data sources"),
    ("Monitoring", "What is Grafana panel?", "Single visualization (graph, table, stat, gauge)"),
    ("Monitoring", "What is Grafana data source?", "Backend storing metrics (Prometheus, Graphite)"),
    ("Monitoring", "What is Grafana alerting?", "Rule-based alerting with notification channels"),
    ("Monitoring", "What is Grafana Loki?", "Log aggregation system like Prometheus for logs"),
    ("Monitoring", "What is Grafana Tempo?", "High-scale distributed tracing backend"),
    ("Monitoring", "What is OpenTelemetry Collector?", "Vendor-agnostic data collection and export"),
    ("Monitoring", "What is OpenTelemetry tracing?", "Distributed traces with spans and context propagation"),
    ("Monitoring", "What is OpenTelemetry metrics?", "Metrics SDK with instruments and aggregation"),
    ("Monitoring", "What is OpenTelemetry logging?", "Log correlation with traces and metrics"),
    ("Monitoring", "What is OpenTelemetry SDK?", "Language-specific implementation of API"),
    ("Monitoring", "What is OpenTelemetry OTLP?", "Protocol for exporting telemetry data"),
], "Senior", "General")

g([
    ("Agile", "What is Scrum?", "Agile framework with sprints, ceremonies, and roles"),
    ("Agile", "What is Sprint in Scrum?", "Time-boxed iteration of 1-4 weeks"),
    ("Agile", "What is Daily Standup?", "Daily 15-minute sync meeting"),
    ("Agile", "What is Sprint Planning?", "Defines sprint goal and backlog items"),
    ("Agile", "What is Sprint Review?", "Demo completed work to stakeholders"),
    ("Agile", "What is Sprint Retrospective?", "Team reflection on process improvements"),
    ("Agile", "What is Product Backlog?", "Prioritized list of features and tasks"),
    ("Agile", "What is Sprint Backlog?", "Selected items for current sprint"),
    ("Agile", "What is Definition of Done?", "Quality criteria for completing work items"),
    ("Agile", "What is User Story?", "Feature description from user perspective"),
    ("Agile", "What is Story Points?", "Relative effort estimation unit"),
    ("Agile", "What is Velocity in Scrum?", "Story points completed per sprint"),
    ("Agile", "What is Kanban?", "Visual workflow management with WIP limits"),
    ("Agile", "What is Kanban board?", "Columns representing workflow stages"),
    ("Agile", "What is WIP limit?", "Maximum items allowed per workflow stage"),
    ("Agile", "What is Lead Time vs Cycle Time?", "Lead: request to delivery; Cycle: start to finish"),
    ("Agile", "What is SAFe (Scaled Agile)?", "Enterprise-scale agile framework"),
    ("Agile", "What is LeSS?", "Large-Scale Scrum framework"),
    ("Agile", "What is XP (Extreme Programming)?", "Engineering practices: TDD, pair programming, CI"),
    ("Agile", "What is TDD cycle?", "Red (write failing test), Green (make pass), Refactor"),
    ("Agile", "What is BDD?", "Behavior-Driven Development with Given-When-Then"),
    ("Agile", "What is Pair Programming?", "Two developers at one workstation"),
    ("Agile", "What is Code Review?", "Peer review for code quality and knowledge sharing"),
    ("Agile", "What is Continuous Integration?", "Merge and test code changes frequently"),
    ("Agile", "What is Continuous Delivery?", "Automated deployment to staging/production"),
    ("Agile", "What is DevOps?", "Culture merging development and operations"),
    ("Agile", "What is SRE (Site Reliability Engineering)?", "Applying software engineering to operations"),
    ("Agile", "What are SLOs and SLIs?", "Service Level Objectives and Indicators"),
    ("Agile", "What is Error Budget?", "Allowed downtime based on SLO"),
    ("Agile", "What is Incident Management?", "Process for handling production incidents"),
], "Junior", "General")

with open(MJS, 'w', encoding='utf-8') as f:
    f.write(content[:idx] + ''.join(new) + content[idx:])
print(f"Batch 19 added {len(new)} questions.")