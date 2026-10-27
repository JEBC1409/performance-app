import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabaseConfigured: true,
  supabase: { auth: { signInWithOtp: vi.fn(), verifyOtp: vi.fn() } },
}));

const { Login } = await import("../Login");

afterEach(() => cleanup());

describe("Login", () => {
  it("tells the truth about where the data lives: the account, and the device for offline use", () => {
    render(<Login />);
    expect(screen.getByText(/se guardan en tu cuenta/i)).toBeInTheDocument();
    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument();
    expect(screen.queryByText(/solo en este dispositivo/i)).toBeNull();
  });

  it("labels the email field and offers the send action", () => {
    render(<Login />);
    expect(screen.getByLabelText(/correo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enviar código/i })).toBeInTheDocument();
  });
});
