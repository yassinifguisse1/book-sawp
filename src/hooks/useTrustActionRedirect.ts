"use client";

export function useTrustActionRedirect() {
  return (error: { message: string }) => {
    alert(error.message);
  };
}
