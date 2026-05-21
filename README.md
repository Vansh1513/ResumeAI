AI Resume Analyzer: The Complete Technical Deep Dive
Note

Welcome to the deep dive! Think of this document as a mentoring session. We’ll break down this project from a bird's-eye view all the way down to specific lines of code, architectural decisions, and how to defend them in an interview.

1. Project Overview
What problem does this project solve?
The modern job hunt is broken. Applicant Tracking Systems (ATS) automatically filter out up to 75% of resumes before a human ever sees them because they lack specific keywords or formatting. Job seekers don't know why they are being rejected.

Why is this project useful?
This project acts as an automated, AI-powered career coach. It simulates how an ATS parses a resume, scores it against a specific job description, and provides actionable feedback.

Real-world use case
A junior developer wants to apply for a "React Frontend Engineer" role. They upload their PDF resume and paste the job description. The platform instantly tells them their ATS score is 45%, highlights that they are missing the keyword "Redux", identifies weak bullet points, and uses OpenAI to generate 5 technical interview questions they will likely be asked based on their exact experience.

2. Complete Architecture
We chose a modern Client-Server Architecture using a RESTful API.

Frontend Architecture
Tech Stack: React (Vite), TypeScript, Tailwind CSS v4, React Router.
Pattern: Component-based architecture with a centralized API service layer (services/).
Why: React allows for dynamic, snappy user interfaces. TypeScript prevents runtime errors by enforcing strict types on API responses. Vite is incredibly fast for development compared to Create React App.
Backend Architecture
Tech Stack: Python, FastAPI, Pydantic.
Pattern: Layered architecture (Routes → Services → Models).
Routes: Handle HTTP requests and validation.
Services: Contain the heavy business logic (AI calls, ATS scoring).
Schemas: Pydantic models for data validation.
Why: FastAPI is currently the fastest, most modern Python web framework. It handles async operations natively (crucial for slow OpenAI API calls) and auto-generates Swagger documentation.
Database Architecture
Tech Stack: PostgreSQL, SQLAlchemy (ORM).
Pattern: Relational tables with foreign key constraints.
users (1) ↔ (N) resumes
resumes (1) ↔ (N) job_analyses
Why: PostgreSQL is the industry standard open-source relational database. We use JSONB columns for dynamic data (like arrays of interview questions).
Request-Response Flow
Client clicks "Analyze".
React makes an Axios POST request with the JWT token.
FastAPI Route intercepts the request and verifies the JWT via a dependency.
Service Layer extracts the resume text from PostgreSQL, sends it + the job description to OpenAI.
OpenAI returns structured JSON.
FastAPI parses this into a Pydantic model and saves it via SQLAlchemy.
React receives the JSON and updates the UI.
3. Frontend Explanation
React Structure
The app is split logically:

components/ui/ - Dumb, reusable building blocks (Buttons, Cards, Inputs).
components/ - Smart components (ResumeHeatmap, ScoreGauge).
pages/ - Full views mapped to routes (Dashboard, Upload).
layouts/ - Shell structures (AppLayout for sidebar navigation, AuthLayout for login).
State Management & Context API
Instead of heavy libraries like Redux, we use React Context (AuthContext.tsx). It wraps the entire app, holding the user object and token. It provides a globally accessible login() and logout() function. Local state (like loading spinners or form inputs) is handled simply with useState.

Protected Routes
In App.tsx, we have a wrapper component (e.g., <ProtectedRoute>). If AuthContext says there is no active token, it intercepts the render and uses React Router's <Navigate> to kick the user back to the /login screen.

API Service Layer
All Axios calls are abstracted into services/ (e.g., resumeService.ts). Why? If the backend URL changes, or if we need to swap Axios for fetch, we only change it in one place, not in 50 different components.

Tailwind Styling
We use Tailwind CSS v4. By using utility classes directly in the TSX (flex items-center bg-surface-raised), we eliminate context-switching between CSS and JS files. We established a strict design token system in index.css (using CSS variables like --color-primary) to maintain a premium SaaS aesthetic.

4. Backend Explanation
FastAPI Structure
routes/ - Controllers. Example: auth.py, resumes.py. They only parse input and return output.
services/ - The Brains. Example: ai_service.py handles OpenAI logic, ats_service.py handles regex and scoring.
models/ - SQLAlchemy Database definitions (creates the SQL tables).
schemas/ - Pydantic models. These define the strict JSON shapes that go in and out of the API.
Dependencies
FastAPI relies heavily on Dependency Injection. For example: def get_current_user(token = Depends(oauth2_scheme)). This function runs before the route logic. It reads the Authorization header, validates the JWT, and returns the User object. If the token is invalid, it throws a 401 error before the route even executes.

Database Connection
database.py creates the SQLAlchemy engine and SessionLocal. We use a dependency get_db() to open a database connection at the start of a request, and close it when the request is done. This prevents connection leaks.

5. Authentication Flow
We use JWT (JSON Web Tokens).

Login: User sends email/password to /api/v1/auth/token.
Verify: Backend hashes the password with passlib/bcrypt and compares it to the DB.
Sign: Backend generates a JWT string containing the user's ID, signed with a secret SECRET_KEY.
Store: React receives the JWT and stores it in localStorage.
Use: For every subsequent request, Axios attaches the token to the header: Authorization: Bearer <token>.
Validate: FastAPI verifies the signature. Since it's stateless, the backend doesn't need to query a session table—the token itself proves who the user is.
6. Resume Upload Flow
Client: User uploads a PDF. React converts it to a FormData object and POSTs it.
Server: FastAPI receives a UploadFile object.
Parse: A Python library (like PyPDF2 or pdfplumber) reads the raw binary and extracts raw text.
Save: SQLAlchemy creates a new Resume row, saving the filename, the raw extracted text, and calculating the word count.
Return: The API returns the parsed resume object to React.
7. ATS Analysis & Heatmap System
This is the core non-AI logic (ats_service.py / heatmap_service.py).

Skill Extraction: Uses Regex and a predefined whitelist of common tech keywords (e.g., Python, AWS, Docker). It scans the resume text and the job description to find matches and missing skills.
ATS Scoring: A programmatic calculation. E.g., Matches = +50 points, Word Count > 300 = +20 points, Missing essential keywords = -10 points.
Heatmap: Scans individual bullet points. If a bullet doesn't start with a strong action verb (Regex: ^[A-Z][a-z]+ed\b) or lacks metrics (Regex: \d+%?), it flags it as a "Weak Bullet".
8. OpenAI Integration
When rule-based logic isn't enough, we use AI (ai_service.py).

Prompt Engineering
We don't just say "Analyze this resume". We pass a strict system prompt: "You are an expert technical recruiter. Analyze this resume against the job description. You MUST return your response in the exact following JSON format..."

Response Handling
LLMs can hallucinate. By forcing OpenAI to return structured JSON (using tools or structured output APIs), we can parse their string output directly into our JobAnalysis Pydantic model.

Fallback System (Graceful Degradation)
Important

If the OpenAI API key is missing, or the API times out, the app does not crash. It automatically falls back to our rule-based ats_service, generating basic match scores and using regex to create interview questions. This is a senior-level architectural decision.

9. Database Explanation
Why PostgreSQL?
We chose Postgres because it is ACID compliant (data integrity) and has excellent support for JSONB. In our job_analyses table, we store the generated interview_questions and improved_bullets as JSONB. This allows us to store complex arrays of data without needing to create 5 separate joined tables just to hold strings.

Relationships
User has relationship("Resume") (One-to-Many).
Resume has relationship("JobAnalysis") (One-to-Many). When a user is deleted, cascading rules delete their resumes, which deletes their analyses.
10. Deployment Architecture (Conceptual)
If we were to deploy this:

Database: Amazon RDS (PostgreSQL) or Supabase.
Backend: Dockerized FastAPI app deployed on AWS App Runner or Render.
Frontend: Built into static HTML/JS/CSS (npm run build) and hosted on Vercel or Netlify.
Environment Variables: Handled securely via .env files locally, and injected via the hosting provider in production (Never committed to GitHub!).
11. Important Interview Questions & Answers
Backend & FastAPI
Q: Why FastAPI over Django or Flask?

A: FastAPI is built on ASGI, making it inherently asynchronous, which is vital when making slow network calls to OpenAI. It also automatically generates OpenAPI (Swagger) documentation based on Pydantic schemas, significantly reducing boilerplate code.

Q: What is Dependency Injection in FastAPI?

A: It's a way to declare things the endpoint requires before it runs. We use Depends(get_db) to automatically inject a database session into our route, and Depends(get_current_user) to secure the route.

Frontend & React
Q: Why use Context API for Auth instead of Redux?

A: Redux is overkill for simple global states like "who is logged in". Context API is built into React and provides a clean way to pass the user token down the component tree without "prop drilling".

Q: Explain the useEffect hook in your Dashboard.

A: The useEffect with an empty dependency array [] runs exactly once when the Dashboard mounts. It calls the backend to fetch stats. It also handles cleanup to avoid memory leaks if the component unmounts before the API call finishes.

AI & Architecture
Q: How do you handle OpenAI rate limits or failures?

A: We implemented a dual-path architecture. If the OpenAI call throws an exception, we catch it and route the request to a deterministic, rule-based fallback engine. This ensures the user always gets a result, ensuring high availability.

Q: Why store Interview Questions as JSONB in PostgreSQL?

A: Relational databases are great for structured data, but interview questions are highly dynamic arrays of strings. By using JSONB, we avoid the overhead of creating a separate interview_questions SQL table and performing expensive JOIN queries, while still maintaining fast read times.

12. Key Files & Folders Explained
server/app/main.py: The entry point for the backend. Starts the server and registers routes.
server/app/database.py: Connects Python to PostgreSQL.
server/app/services/heatmap_service.py: A pure-Python engine that uses Regex to analyze resume quality without relying on AI.
client/src/index.css: The central design system containing all Tailwind CSS variables and global styles.
client/src/components/ui/: Contains primitive, reusable components like <Button> and <Card> that ensure visual consistency across the app.
client/src/services/axios.ts: Configures the HTTP client and automatically attaches the JWT token to every outgoing request.
13. Why these technologies?
TypeScript > JavaScript: Refactoring a large app in JS is dangerous. TS gives us autocomplete and catches type mismatches (like passing a string to a number prop) at compile time.
Tailwind > Standard CSS: Allows us to style components rapidly without leaving the TSX file, and ensures a strictly constrained design system (consistent spacing and colors).
SQLAlchemy > Raw SQL: Provides a layer of abstraction. We can interact with Python objects instead of writing error-prone SQL strings, and it inherently protects against SQL Injection attacks.
14. Scalability & Future Improvements
To take this project to an enterprise level:

Background Tasks (Celery/Redis): Currently, the user waits 10 seconds for OpenAI to respond. In an enterprise app, we would use Celery to process the PDF in the background and use WebSockets to notify the frontend when it's done.
Vector Database (RAG): Instead of simple keyword matching, we could use a Vector DB (like Pinecone) to embed the resume and job description, doing semantic similarity matching (e.g., recognizing that "React" and "Next.js" are highly related).
Database Migrations (Alembic): Implement Alembic so we can update database tables in production without dropping them or writing manual ALTER TABLE SQL commands.
