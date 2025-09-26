import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function InviteComplete() {
  const [pw, setPw] = useState("");
  const [done, setDone] = useState(false);

  // User is already signed in by the invite link.
  async function handleSetPassword(e) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return alert(error.message);
    setDone(true);
    // (Optional) sign them out and ask to re-login with password:
     await supabase.auth.signOut();
     navigate("/login");
  }

  return done ? (
    <p>Password set! You can now sign in with email + password.</p>
  ) : (
    <form onSubmit={handleSetPassword}>
      <input
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="Create a password"
        required
      />
      <button type="submit">Save password</button>
    </form>
  );
}
