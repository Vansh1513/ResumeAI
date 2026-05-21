import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Label from "../components/ui/Label";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../services/axios";
import { ROUTES } from "../utils/constants";

interface LocationState {
  from?: { pathname: string };
}

export default function Login() {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMounted = useRef(true);
  const from = (location.state as LocationState | null)?.from?.pathname ?? ROUTES.home;

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

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    void submitLogin();
  };

  const submitLogin = async () => {
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      await loginUser(email, password);
      if (isMounted.current) {
        navigate(from, { replace: true });
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
      <h2 className="text-xl font-semibold text-text">Welcome back</h2>
      <p className="mt-1 text-sm text-text-muted">Sign in to analyze resumes and match jobs.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {error && <Alert>{error}</Alert>}
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </section>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-text-muted">
        No account?{" "}
        <Link to={ROUTES.register} className="text-primary hover:underline">
          Register
        </Link>
      </p>
    </Card>
  );
}
