"use client";

import { useEffect, useState } from "react";

export const AVATAR_KEY = "filumire.learnerAvatar";

export const LEARNER_AVATARS = [
  { id: "1", name: "Kofi", src: "/images/avatars/avatar-kofi.png" },
  { id: "2", name: "Girl", src: "/images/avatars/avatar-girl.png" },
  { id: "3", name: "Glasses", src: "/images/avatars/avatar-glasses.png" },
  { id: "4", name: "Hijab", src: "/images/avatars/avatar-hijab.png" },
];

export function useLearnerAvatar(): string {
  const [src, setSrc] = useState(LEARNER_AVATARS[0].src);

  useEffect(() => {
    function read() {
      try {
        const id = window.localStorage.getItem(AVATAR_KEY);
        const found = LEARNER_AVATARS.find((a) => a.id === id);
        if (found) setSrc(found.src);
      } catch {}
    }

    read();
    window.addEventListener("filumire-avatar", read);
    return () => window.removeEventListener("filumire-avatar", read);
  }, []);

  return src;
}