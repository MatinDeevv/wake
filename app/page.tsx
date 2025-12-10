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

  // auto-load saved session
  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) {
      setUser(JSON.parse(u));
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
      setMsg("bro wrong creds 💀");
      return;
    }

    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
    loadFriends();
  }

  async function loadFriends() {
    let { data } = await supabase.from("users").select("*").order("streak", { ascending: false });
    if (data) setFriends(data);
  }

  async function checkIn() {
    if (!user) return;

    const now = new Date();
    const hour = now.getHours();

    if (hour < 5 || hour >= 6) {
      setMsg("not check-in time (5–6am) 🤦‍♂️");
      return;
    }

    const today = now.toISOString().slice(0, 10);

    // pull fresh user row
    let { data: fresh } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    let newStreak = fresh.streak;

    // already checked in today
    if (fresh.last_checkin === today) {
      setMsg("already checked in today 😭");
      return;
    }

    // compute yesterday
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const ystr = y.toISOString().slice(0, 10);

    if (fresh.last_checkin === ystr) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }

    // update
    await supabase
      .from("users")
      .update({ streak: newStreak, last_checkin: today })
      .eq("id", user.id);

    setMsg("checked in 👍 streak: " + newStreak);
    loadFriends();
  }

  if (!user) {
    // login screen — ugly af
    return (
      <div style={{ padding: 40, fontFamily: "sans-serif" }}>
        <h1>wakeup streak thingy</h1>
        <input
          placeholder="username"
          style={{ display: "block", marginBottom: 8, padding: 6, border: "1px solid gray" }}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          placeholder="password"
          type="password"
          style={{ display: "block", marginBottom: 8, padding: 6, border: "1px solid gray" }}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          onClick={login}
          style={{
            padding: 10,
            background: "#ccc",
            border: "none",
            cursor: "pointer",
            marginTop: 4,
          }}
        >
          login
        </button>
        <p>{msg}</p>
      </div>
    );
  }

  // dashboard
  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>hi {user.username}</h1>

      <button
        onClick={checkIn}
        style={{
          padding: 10,
          background: "lightgreen",
          border: "1px solid #333",
          cursor: "pointer",
        }}
      >
        check in
      </button>

      <p>{msg}</p>

      <h2>leaderboard (mid ui)</h2>
      <button
        onClick={loadFriends}
        style={{ padding: 6, background: "#eee", marginBottom: 10 }}
      >
        refresh
      </button>

      {friends.map((f) => (
        <div
          key={f.id}
          style={{
            border: "1px solid #ddd",
            marginBottom: 6,
            padding: 6,
          }}
        >
          {f.username}: {f.streak}
        </div>
      ))}
    </div>
  );
}
