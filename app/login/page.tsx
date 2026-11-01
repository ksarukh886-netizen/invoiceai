"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase-browser";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const supabase = createClient();

      const r = signup
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (r.error) {
        setMsg(r.error.message);
      } else if (signup) {
        setMsg("Account created. Check your email if confirmation is enabled.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      setMsg(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth">
      <div className="authbox">
        <b className="brand">
          Invoice<span>AI</span>
        </b>

        <h1>{signup ? "Create your account" : "Welcome back"}</h1>

        <p className="muted">
          Free plan included. No credit card required.
        </p>

        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button className="btn" type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : signup
              ? "Create account"
              : "Log in"}
          </button>
        </form>

        {msg && <p className="notice">{msg}</p>}

        <button
          className="linkbtn"
          type="button"
          onClick={() => {
            setSignup(!signup);
            setMsg("");
          }}
        >
          {signup
            ? "Already have an account? Log in"
            : "New here? Create an account"}
        </button>
      </div>
    </main>
  );
}
