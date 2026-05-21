import re
from collections import Counter

# ---------------------------------------------------------------------------
# Stop-words: words that are never useful as skills / keywords
# ---------------------------------------------------------------------------
STOP_WORDS = frozenset({
    # articles, conjunctions, prepositions
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
    "with", "by", "from", "as", "is", "was", "are", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
    "may", "might", "must", "shall", "can", "need", "dare", "ought", "used",
    "this", "that", "these", "those", "i", "you", "he", "she", "it", "we", "they",
    "what", "which", "who", "whom", "whose", "where", "when", "why", "how",
    "all", "each", "every", "both", "few", "more", "most", "other", "some", "such",
    "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "just",
    "our", "your", "their", "my", "his", "her", "its", "about", "into", "through",
    "during", "before", "after", "above", "below", "between", "under", "again",
    "further", "then", "once", "here", "there", "any", "both", "each", "few",
    # generic resume/job-posting filler words
    "work", "working", "experience", "years", "year", "role", "team", "using",
    "strong", "excellent", "good", "great", "new", "well", "able", "ability",
    "including", "also", "etc", "e.g", "i.e", "per", "up", "out", "over",
    "responsibilities", "responsible", "required", "requirement", "requirements",
    "skills", "skill", "knowledge", "understanding", "familiarity",
    "plus", "bonus", "preferred", "must", "min", "minimum", "maximum", "max",
    "job", "candidate", "applicant", "employer", "employee", "position", "apply",
    "company", "business", "organization", "department", "looking", "seeking",
    "like", "us", "one", "two", "three", "four", "five", "six", "seven",
    "written", "verbal", "oral", "communication", "interpersonal", "soft",
    "day", "days", "week", "weeks", "month", "months", "hour", "hours",
    "based", "related", "relevant", "similar", "various", "within", "across",
    "level", "levels", "senior", "junior", "mid", "entry", "high", "low",
    "large", "small", "multiple", "different", "current", "previous",
    "following", "listed", "detail", "details", "please", "ensure", "make",
    "maintain", "support", "provide", "help", "assist", "utilize", "use",
    "understand", "learn", "grow", "create", "build", "solve", "implement",
    "analysis", "analytical", "problem", "solution", "solving", "thinking",
    "management", "manager", "lead", "leading", "cross", "functional", "global",
    "time", "driven", "results", "oriented", "focus", "focused",
    "opportunity", "environment", "culture", "mission", "values", "vision",
    "fast", "paced", "startup", "enterprise", "scale", "growing",
})

# ---------------------------------------------------------------------------
# Generic single-word terms that sound technical but add noise to skill lists
# ---------------------------------------------------------------------------
GENERIC_TECH_NOISE = frozenset({
    "software", "hardware", "system", "systems", "platform", "platforms",
    "application", "applications", "service", "services", "product", "products",
    "data", "database", "code", "coding", "programming", "development",
    "infrastructure", "architecture", "design", "engineering", "implementation",
    "solution", "solutions", "tools", "tool", "technology", "technologies",
    "best", "practices", "methodology", "methodologies", "process", "processes",
    "performance", "quality", "security", "testing", "monitoring", "logging",
    "deployment", "integration", "automation", "workflow", "pipeline",
    "framework", "frameworks", "library", "libraries", "module", "modules",
    "project", "projects", "product", "feature", "features",
    "version", "control", "repository", "package", "packages",
    "configuration", "environment", "setup", "server", "client",
    "backend", "frontend", "fullstack", "stack",
})

# ---------------------------------------------------------------------------
# Curated tech-skills whitelist (single tokens)
# These are always recognised as skills regardless of context
# ---------------------------------------------------------------------------
TECH_SKILL_TOKENS = frozenset({
    # Programming languages
    "python", "javascript", "typescript", "java", "golang", "go", "rust",
    "cpp", "c++", "c#", "csharp", "ruby", "php", "swift", "kotlin", "scala",
    "r", "matlab", "perl", "bash", "shell", "powershell", "groovy", "dart",
    "elixir", "erlang", "haskell", "clojure", "lua", "julia",

    # Web frameworks / libraries
    "react", "reactjs", "angular", "angularjs", "vue", "vuejs", "svelte",
    "nextjs", "nuxtjs", "gatsby", "remix", "express", "expressjs", "nestjs",
    "fastapi", "django", "flask", "fastify", "hapi", "koa", "rails",
    "laravel", "symfony", "codeigniter", "spring", "springboot", "quarkus",
    "micronaut", "struts", "hibernate", "mybatis", "net", "aspnet", "blazor",
    "htmx", "alpinejs",

    # Databases
    "postgresql", "postgres", "mysql", "mariadb", "sqlite", "oracle",
    "mssql", "sqlserver", "mongodb", "cassandra", "dynamodb", "redis",
    "elasticsearch", "opensearch", "neo4j", "couchdb", "influxdb",
    "cockroachdb", "tidb", "planetscale", "supabase", "firestore",
    "bigtable", "hbase", "snowflake", "bigquery", "redshift", "databricks",

    # Cloud & DevOps
    "aws", "azure", "gcp", "googlecloud", "digitalocean", "heroku",
    "cloudflare", "vercel", "netlify", "linode", "vultr",
    "docker", "kubernetes", "k8s", "helm", "istio", "envoy",
    "terraform", "ansible", "puppet", "chef", "pulumi",
    "jenkins", "github", "gitlab", "bitbucket", "circleci", "travisci",
    "argocd", "spinnaker", "fluxcd",
    "nginx", "apache", "haproxy", "caddy",
    "prometheus", "grafana", "datadog", "newrelic", "splunk", "elk",

    # Data / ML / AI
    "tensorflow", "pytorch", "keras", "sklearn", "scikit",
    "pandas", "numpy", "scipy", "matplotlib", "seaborn", "plotly",
    "spark", "hadoop", "kafka", "flink", "airflow", "prefect", "dbt",
    "mlflow", "kubeflow", "bentoml", "ray", "dask",
    "huggingface", "langchain", "llamaindex", "openai",
    "xgboost", "lightgbm", "catboost",
    "powerbi", "tableau", "looker", "metabase", "superset",

    # Mobile
    "android", "ios", "flutter", "reactnative", "xamarin", "cordova", "ionic",

    # Message queues / Streaming
    "rabbitmq", "celery", "sqs", "sns", "pubsub", "nats", "mqtt",

    # Protocols / APIs
    "rest", "restful", "graphql", "grpc", "websocket", "oauth", "jwt",
    "openapi", "swagger", "soap", "xmlrpc",

    # Testing
    "pytest", "jest", "mocha", "jasmine", "cypress", "selenium", "playwright",
    "testng", "junit", "mockito", "vitest", "storybook",

    # Version control / project tools
    "git", "jira", "confluence", "linear", "notion", "figma", "sketch",
    "postman", "insomnia",

    # Security
    "oauth2", "oidc", "saml", "ssl", "tls", "https", "waf", "siem",
    "owasp", "pentesting", "sast", "dast",

    # Other notable
    "linux", "unix", "macos", "windows",
    "agile", "scrum", "kanban", "devops", "mlops", "devsecops",
    "microservices", "monolith", "serverless", "lambda", "faas",
    "cdn", "s3", "ec2", "rds", "ecs", "eks", "gke", "aks",
    "vpc", "iam", "sso", "ldap", "activedirectory",
    "regex", "json", "yaml", "xml", "csv", "parquet", "avro",
    "llm", "rag", "embeddings", "nlp", "cv", "ocr",
    "blockchain", "web3", "solidity", "ethereum",
    "wasm", "webassembly",
})

# ---------------------------------------------------------------------------
# Multi-word tech phrases (higher-value skills, captured before tokenisation)
# ---------------------------------------------------------------------------
_PHRASE_PATTERNS: list[str] = [
    # AI / ML
    r"\bmachine learning\b", r"\bdeep learning\b", r"\bnatural language processing\b",
    r"\bnlp\b", r"\bcomputer vision\b", r"\breinforcement learning\b",
    r"\blarge language model[s]?\b", r"\bllm[s]?\b", r"\bgenerative ai\b",
    r"\bneural network[s]?\b", r"\btransformer[s]?\b",
    r"\bdata science\b", r"\bdata engineering\b", r"\bdata pipeline[s]?\b",
    r"\bfeature engineering\b", r"\bmodel training\b",
    r"\brag\b", r"\bvector database\b",

    # Architecture patterns
    r"\bmicroservice[s]?\b", r"\brest(?:ful)? api[s]?\b", r"\bgraphql api[s]?\b",
    r"\bevent.?driven\b", r"\bserverless\b", r"\bsoa\b",
    r"\bdomain.?driven design\b", r"\bddd\b", r"\bcqrs\b", r"\bevent sourcing\b",

    # Cloud services
    r"\baws lambda\b", r"\bamazon s3\b", r"\bamazon ec2\b", r"\bamazon rds\b",
    r"\baws ecs\b", r"\baws eks\b", r"\bazure functions\b", r"\bazure aks\b",
    r"\bgoogle cloud run\b", r"\bgke\b", r"\bgcp bigquery\b",
    r"\bcloud computing\b", r"\bmulti.?cloud\b", r"\bhybrid cloud\b",

    # DevOps/CI-CD
    r"\bci[/\s]?cd\b", r"\bcontinuous integration\b", r"\bcontinuous deployment\b",
    r"\bcontinuous delivery\b", r"\binfrastructure as code\b", r"\biac\b",
    r"\bgithub actions\b", r"\bargo cd\b", r"\bhelm chart[s]?\b",

    # Databases
    r"\bnosql\b", r"\brelational database\b", r"\btime.?series database\b",
    r"\bvector store\b", r"\bin.?memory (?:cache|database)\b",
    r"\bsql server\b", r"\bpostgres(?:ql)?\b",

    # Web / JS ecosystem
    r"\breact\.?js\b", r"\bnode\.?js\b", r"\bvue\.?js\b", r"\bnext\.?js\b",
    r"\bexpress\.?js\b", r"\bnest\.?js\b", r"\btype?script\b",
    r"\btailwind(?: css)?\b", r"\bmaterial.?ui\b", r"\bchakra.?ui\b",
    r"\bshadcn\b", r"\bwebpack\b", r"\bvite\b", r"\brollup\b",
    r"\bstate management\b", r"\bredux\b", r"\bpinia\b", r"\bzustand\b",

    # Testing
    r"\bunit test(?:ing)?\b", r"\bintegration test(?:ing)?\b",
    r"\bend.?to.?end test(?:ing)?\b", r"\be2e test(?:ing)?\b",
    r"\btest.?driven development\b", r"\btdd\b",
    r"\bbehavior.?driven development\b", r"\bbdd\b",

    # Security
    r"\bpenetration test(?:ing)?\b", r"\bsecurity audit\b",
    r"\bidentity.? (?:and )?access management\b", r"\biam policies\b",
    r"\bzero.?trust\b",

    # Agile/PM
    r"\bscrum master\b", r"\bproduct owner\b",
    r"\bsprint planning\b", r"\bkanban board\b",

    # Specific databases (compound)
    r"\bmicrosoft sql server\b", r"\boracle database\b",
    r"\belastic(?:search)?\b", r"\bopen search\b",

    # Misc
    r"\bfull.?stack\b", r"\bfront.?end\b", r"\bback.?end\b",
    r"\bsolution architect\b", r"\bsystem design\b",
    r"\bhigh availability\b", r"\bload balanc(?:er|ing)\b",
    r"\bauto.?scaling\b", r"\bdisaster recovery\b",
    r"\bapi gateway\b", r"\bservice mesh\b",
    r"\bobject.?oriented programming\b", r"\boop\b",
    r"\bfunctional programming\b", r"\bconcurrent programming\b",
    r"\bdesign pattern[s]?\b",
]

# Pre-compiled regex for performance
_PHRASE_RE = re.compile("|".join(_PHRASE_PATTERNS), re.IGNORECASE)

# ---------------------------------------------------------------------------
# Action verbs
# ---------------------------------------------------------------------------
ACTION_VERBS = frozenset({
    "achieved", "architected", "automated", "built", "created", "debugged",
    "delivered", "deployed", "designed", "developed", "drove", "enhanced",
    "established", "executed", "generated", "implemented", "improved",
    "increased", "launched", "led", "managed", "migrated", "optimized",
    "orchestrated", "produced", "reduced", "refactored", "resolved",
    "scaled", "shipped", "streamlined", "transformed", "upgraded",
})

# ---------------------------------------------------------------------------
# Section detection
# ---------------------------------------------------------------------------
SECTION_KEYWORDS = {
    "contact":    ["email", "phone", "linkedin", "github", "@", "mobile", "tel"],
    "experience": ["experience", "employment", "work history", "professional experience",
                   "career history", "positions held"],
    "education":  ["education", "degree", "university", "college", "bachelor",
                   "master", "phd", "mba", "b.s.", "m.s.", "b.e.", "b.tech"],
    "skills":     ["skills", "technical skills", "technologies", "proficiencies",
                   "competencies", "tech stack", "tools & technologies"],
    "summary":    ["summary", "objective", "profile", "about me", "overview"],
}


# ---------------------------------------------------------------------------
# Core helpers
# ---------------------------------------------------------------------------

def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def tokenize_keywords(text: str, min_length: int = 3) -> set[str]:
    """
    Extract individual tokens, filtering stop-words and generic noise.
    Does NOT filter TECH_SKILL_TOKENS — those are always kept.
    """
    normed = normalize_text(text)
    tokens = re.findall(r"[a-z0-9]+(?:[+#.][a-z0-9]+)*", normed)
    result: set[str] = set()
    for t in tokens:
        if len(t) < min_length or t.isdigit():
            continue
        # Always include whitelisted tech tokens
        if t in TECH_SKILL_TOKENS:
            result.add(t)
            continue
        # Skip stop words and generic noise for everything else
        if t in STOP_WORDS or t in GENERIC_TECH_NOISE:
            continue
        result.add(t)
    return result


def extract_tech_skills(text: str) -> set[str]:
    """
    Extract only meaningful tech skills:
    1. Multi-word tech phrases (highest signal)
    2. Single-token whitelist hits

    Generic words, stop-words, and filler are excluded.
    """
    normed = normalize_text(text)

    skills: set[str] = set()

    # 1. Multi-word tech phrases
    for match in _PHRASE_RE.finditer(normed):
        phrase = re.sub(r"\s+", " ", match.group().strip())
        skills.add(phrase)

    # 2. Whitelisted single tokens
    tokens = re.findall(r"[a-z0-9]+(?:[+#.][a-z0-9]+)*", normed)
    for t in tokens:
        if t in TECH_SKILL_TOKENS:
            skills.add(t)

    return skills


def extract_skill_phrases(text: str) -> set[str]:
    """
    Backward-compatible wrapper used by matching_service / keyword_overlap.
    Now delegates to extract_tech_skills for better precision.
    """
    return extract_tech_skills(text)


def count_action_verbs(text: str) -> int:
    normed = normalize_text(text)
    words = set(normed.split())
    return sum(1 for v in ACTION_VERBS if v in words)


def detect_sections(text: str) -> dict[str, bool]:
    lower = normalize_text(text)
    return {
        section: any(kw in lower for kw in keywords)
        for section, keywords in SECTION_KEYWORDS.items()
    }


def keyword_overlap(
    resume_text: str, job_text: str
) -> tuple[list[str], list[str], float]:
    """
    Compare resume vs job description using tech skill extraction.
    Returns (matched, missing_from_resume, match_score 0-100).

    Scoring: Jaccard-weighted match penalised for very small job keyword sets.
    """
    resume_skills = extract_tech_skills(resume_text)
    job_skills = extract_tech_skills(job_text)

    if not job_skills:
        return [], [], 0.0

    matched = sorted(resume_skills & job_skills)
    missing = sorted(job_skills - resume_skills)

    # Jaccard similarity gives a more honest score than pure recall
    union = resume_skills | job_skills
    jaccard = len(matched) / len(union) if union else 0.0
    recall = len(matched) / len(job_skills)

    # Blend: 60% recall (what the job asks for) + 40% Jaccard (overall overlap)
    raw_score = (0.60 * recall + 0.40 * jaccard) * 100

    # Dampen perfect scores when there are very few job keywords (avoids 100/100 on trivial matches)
    if len(job_skills) < 5:
        raw_score *= 0.75

    score = round(min(raw_score, 100.0), 1)
    return matched, missing, score
