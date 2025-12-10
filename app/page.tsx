"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON!
);

export default function Page() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  // load session
  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) {
      const parsed = JSON.parse(u);
      setUser(parsed);
      loadFriends();
    }
  }, []);

  async function login() {
    let { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .maybeSingle();

    if (error || !data) {
      setMsg("wrong username or password 💀");
      return;
    }

    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
    loadFriends();
  }

  async function loadFriends() {
    let { data } = await supabase
      .from("users")
      .select("*")
      .order("streak", { ascending: false });

    if (data) setFriends(data);
  }

  async function checkIn() {
    if (!user) return;

    const now = new Date();
    const hour = now.getHours();

    if (hour < 5 || hour >= 6) {
      setMsg("Only allowed to check in 5–6am 😭");
      return;
    }

    const today = now.toISOString().slice(0, 10);

    let { data: fresh } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    let streak = fresh.streak;

    if (fresh.last_checkin === today) {
      setMsg("Already checked in today 😭");
      return;
    }

    // compute yesterday
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const ystr = y.toISOString().slice(0, 10);

    if (fresh.last_checkin === ystr) {
      streak += 1;
    } else {
      streak = 1;
    }

    await supabase
      .from("users")
      .update({ streak, last_checkin: today })
      .eq("id", user.id);

    setMsg("Checked in! 🔥 Streak: " + streak);

    // update state
    const updatedUser = { ...user, streak, last_checkin: today };
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));

    loadFriends();
  }

  // ---- UI ----

  const containerStyle: any = {
    fontFamily: "sans-serif",
    padding: "30px",
    maxWidth: "400px",
    margin: "0 auto",
  };

  const card: any = {
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    marginBottom: "12px",
  };

  if (!user) {
    // ----- LOGIN SCREEN -----
    return (
      <div style={containerStyle}>
        <h1 style={{ marginBottom: "20px" }}>Wake Up Streak</h1>

        <div style={card}>
          <input
            placeholder="username"
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
          />
          <input
            placeholder="password"
            type="password"
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
          />

          <button
            onClick={login}
            style={{
              width: "100%",
              padding: "10px",
              background: "#ccc",
              border: "none",
              cursor: "pointer",
            }}
          >
            Login
          </button>

          {msg && <p style={{ marginTop: "10px", color: "red" }}>{msg}</p>}
        </div>
      </div>
    );
  }

  // ----- DASHBOARD -----
  return (
    <div style={containerStyle}>
      <h1>Hi {user.username}</h1>

      <div style={{ ...card, background: "#f9fff9" }}>
        <p>Your current streak: <b>{user.streak}</b></p>
        <button
          onClick={checkIn}
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "8px",
            background: "lightgreen",
            border: "1px solid #333",
            cursor: "pointer",
          }}
        >
          Check In
        </button>
        {msg && <p style={{ marginTop: "10px" }}>{msg}</p>}
      </div>

      <h2 style={{ marginTop: "20px" }}>Leaderboard</h2>

      <div style={card}>
        {friends.length === 0 && <p>Loading...</p>}

        {friends.map((f, i) => (
          <div
            key={f.id}
            style={{
              padding: "6px 0",
              borderBottom: "1px solid #eee",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>
              {i + 1}. {f.username}
            </span>
            <b>{f.streak}</b>
          </div>
        ))}
      </div>

      <button
        onClick={loadFriends}
        style={{
          width: "100%",
          padding: "10px",
          marginTop: "10px",
          background: "#eee",
          border: "1px solid #bbb",
        }}
      >
        Refresh Leaderboard
      </button>
    </div>
  );
}
