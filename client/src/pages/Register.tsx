import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Label from "../components/ui/Label";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../services/axios";
import { ROUTES } from "../utils/constants";

function validateForm(fullName: string, email: string, password: string): string | null {
  const trimmedName = fullName.trim();
  const trimmedEmail = email.trim();

  if (trimmedName.length < 2) return "Full name must be at least 2 characters.";
  if (!trimmedEmail) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return "Enter a valid email address.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  return null;
}

export default function Register() {
  const { registerUser } = useAuth();
  const navigate = useNavigate();
  const isMounted = useRef(true);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationError = validateForm(fullName, email, password);
    if (validationError) {
      setError(validationError);
      return;
    }

    void submitRegistration();
  };

  const submitRegistration = async () => {
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      await registerUser(email, password, fullName);
      if (isMounted.current) {
        navigate(ROUTES.home, { replace: true });
      }
    } catch (err) {
      if (isMounted.current) {
        setError(getApiErrorMessage(err));
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  return (
    <Card>
      <h2 className="text-xl font-semibold text-text">Create account</h2>
      <p className="mt-1 text-sm text-text-muted">Start analyzing resumes with ATS scoring.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {error && <Alert>{error}</Alert>}
        <section>
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            name="fullName"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
          />
        </section>
        <section>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </section>
        <section>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </section>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-text-muted">
        Already have an account?{" "}
        <Link to={ROUTES.login} className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
