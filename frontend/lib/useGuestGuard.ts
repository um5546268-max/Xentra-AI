"use client";

import { useState } from "react";
import { useAuth } from "./auth";

export function useGuestGuard() {
  const isGuest = useAuth((state) => state.isGuest);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | undefined>();

  const requireAuth = (action: () => void, customMessage?: string) => {
    if (isGuest) {
      setModalMessage(customMessage);
      setModalOpen(true);
      return;
    }
    action();
  };

  return {
    isGuest,
    requireAuth,
    modalOpen,
    modalMessage,
    closeModal: () => setModalOpen(false),
  };
}