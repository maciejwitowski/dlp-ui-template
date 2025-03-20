"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";
import type { GoogleUserInfo, GoogleDriveInfo } from "@/lib/google/googleApi";

export interface UserDataState {
  userInfo: GoogleUserInfo | null;
  driveInfo: GoogleDriveInfo | null;
  isLoading: boolean;
  error: string | null;
}

export function useUserData(): UserDataState {
  const { data: session } = useSession();
  const [userInfo, setUserInfo] = useState<GoogleUserInfo | null>(null);
  const [driveInfo, setDriveInfo] = useState<GoogleDriveInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserData() {
      if (!session) return;

      try {
        setIsLoading(true);
        setError(null);

        const [userInfoResponse, driveInfoResponse] = await Promise.all([
          fetch("/api/google/user-info"),
          fetch("/api/google/drive-info"),
        ]);

        // Check for auth errors (401)
        if (
          userInfoResponse.status === 401 ||
          driveInfoResponse.status === 401
        ) {
          console.log("Authentication failed, signing out user");
          signOut({ callbackUrl: "/" });
          return;
        }

        if (!userInfoResponse.ok) {
          const errorData = await userInfoResponse
            .json()
            .catch(() => ({ error: "Unknown error" }));
          console.error("User info error:", errorData);
          setError("Failed to fetch user information. Please try again later.");
          toast.error("Failed to fetch user information");
          return;
        }

        if (!driveInfoResponse.ok) {
          const errorData = await driveInfoResponse
            .json()
            .catch(() => ({ error: "Unknown error" }));
          console.error("Drive info error:", errorData);

          setError(
            "Failed to fetch drive information. Please try again later."
          );
          toast.error("Failed to fetch drive information");
          return;
        }

        const userInfoData = await userInfoResponse.json();
        const driveInfoData = await driveInfoResponse.json();

        setUserInfo(userInfoData);
        setDriveInfo(driveInfoData);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("An unexpected error occurred. Please try again later.");
        toast.error("Failed to fetch user information");
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserData();
  }, [session]);

  return {
    userInfo,
    driveInfo,
    isLoading,
    error,
  };
}
