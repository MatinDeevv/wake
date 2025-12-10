"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// HARD CODED USERS FOR LOGIN ONLY
const HARDCODED_USERS = [
  { username: "saman", password: "1234" },
  { username: "dan", password: "1233" },
  { username: "matin", password: "9999" },
];

// SUPABASE CLIENT
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON!
);

export default function Page() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [user, setUser] = useState<any>(null);
  const [streaks, setStreaks] = useState<any>({});
  const [msg, setMsg] = useState("");

  // Load session
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("user") || "null");
    if (saved) {
      setUser(saved);
      loadStreaks();
    }
  }, []);

  // LOGIN USING HARDCODED LIST
  function login() {
    const u = username.trim();
    const p = password.trim();

    const found = HARDCODED_USERS.find(
      (usr) => usr.username === u && usr.password === p
    );

    if (!found) {
      setMsg("wrong username or password 💀");
      return;
    }

    setUser(found);
    localStorage.setItem("user", JSON.stringify(found));
    loadStreaks();
  }

  // LOAD STREAKS FROM SUPABASE (FALLBACK TO LOCAL)
  async function loadStreaks() {
    try {
      let { data, error } = await supabase.from("users").select("*");

      if (error || !data) {
        console.log("supabase failed, fallback local");
        const local = JSON.parse(localStorage.getItem("streaks") || "{}");
        setStreaks(local);
        return;
      }

      const mapped: any = {};
      data.forEach((row) => {
        mapped[row.username] = {
          streak: row.streak,
          last: row.last_checkin,
          id: row.id,
        };
      });

      setStreaks(mapped);
      localStorage.setItem("streaks", JSON.stringify(mapped));
    } catch (e) {
      console.log("supabase crash, fallback local");
      const local = JSON.parse(localStorage.getItem("streaks") || "{}");
      setStreaks(local);
    }
  }

  // CHECK-IN LOGIC
  async function checkIn() {
    const now = new Date();
    const hour = now.getHours();
    const today = now.toISOString().slice(0, 10);

    if (hour < 5 || hour >= 6) {
      setMsg("you can only check in 5–6 AM 😭");
      return;
    }

    const current = streaks[user.username] || {
      streak: 0,
      last: "",
      id: null,
    };

    if (current.last === today) {
      setMsg("already checked in today 💀");
      return;
    }

    // Calculate new streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = yesterday.toISOString().slice(0, 10);

    const newStreak = current.last === y ? current.streak + 1 : 1;

    // Update local
    const updated = {
      ...streaks,
      [user.username]: {
        streak: newStreak,
        last: today,
        id: current.id,
      },
    };

    setStreaks(updated);
    localStorage.setItem("streaks", JSON.stringify(updated));

    setMsg("checked in 🔥 streak = " + newStreak);

    // Push to Supabase if user exists in DB
    if (current.id) {
      await supabase
        .from("users")
        .update({ streak: newStreak, last_checkin: today })
        .eq("id", current.id);
    }
  }

  // UI STYLES
  const container = {
    fontFamily: "sans-serif",
    padding: "24px",
    maxWidth: "400px",
    margin: "0 auto",
  };

  const card = {
    border: "1px solid #ddd",
    padding: "16px",
    borderRadius: "8px",
    marginBottom: "20px",
  };

  if (!user) {
    return (
      <div style={container}>
        <h1>Wake-Up Streak</h1>

        <div style={card}>
          <input
            placeholder="username"
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: "100%", padding: 8, marginBottom: 10 }}
          />
          <input
            placeholder="password"
            type="password"
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 8, marginBottom: 10 }}
          />

          <button
            onClick={login}
            style={{
              width: "100%",
              padding: 10,
              background: "#ccc",
              border: "none",
              cursor: "pointer",
            }}
          >
            Login
          </button>

          {msg && <p style={{ color: "red", marginTop: 10 }}>{msg}</p>}
        </div>
      </div>
    );
  }

  const leaderboard = Object.entries(streaks)
    .map(([username, data]: any) => ({
      username,
      streak: data.streak,
    }))
    .sort((a, b) => b.streak - a.streak);

  return (
    <div style={container}>
      <h1>Hi {user.username}</h1>

      <div style={card}>
        <p>Your streak: <b>{streaks[user.username]?.streak || 0}</b></p>
        <button
          onClick={checkIn}
          style={{
            width: "100%",
            padding: 10,
            background: "lightgreen",
            border: "1px solid #333",
          }}
        >
          Check In
        </button>
        {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
      </div>

      <h2>Leaderboard</h2>
      <div style={card}>
        {leaderboard.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 0",
              borderBottom: "1px solid #eee",
            }}
          >
            <span>{i + 1}. {item.username}</span>
            <b>{item.streak}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
