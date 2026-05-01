"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

import {
  clearClientAuthCache,
  getClientAuthCacheCreatedAt,
  isClientAuthCacheExpired,
  markClientAuthCacheCreatedAt,
} from "@/lib/clientAuthCache";

export function SessionHousekeeper() {
  useEffect(() => {
    let active = true;

    async function validateCacheAge() {
      if (isClientAuthCacheExpired()) {
        await clearClientAuthCache();
        if (active) {
          await signOut({ callbackUrl: "/login?expired=1" });
        }
        return;
      }

      if (getClientAuthCacheCreatedAt() === null) {
        markClientAuthCacheCreatedAt();
      }
    }

    validateCacheAge();

    return () => {
      active = false;
    };
  }, []);

  return null;
}
