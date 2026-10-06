import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AuthScreen from "./AuthScreen";

vi.mock("./authService", () => ({ signInWithPassword: vi.fn().mockResolvedValue({ error: null }), signUpWithPassword: vi.fn().mockResolvedValue({ error: null }) }));

describe("AuthScreen", () => {
  it("switches between sign in and account creation", () => {
    render(<AuthScreen />);
    expect(screen.getByRole("heading", { name: /bienvenida/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /primera vez/i }));
    expect(screen.getByRole("heading", { name: /creá tu cuenta/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre completo/i)).toBeInTheDocument();
  });

  it("allows revealing the password", () => {
    render(<AuthScreen />);
    const password = screen.getByPlaceholderText(/mínimo 6/i);
    expect(password).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar" }));
    expect(password).toHaveAttribute("type", "text");
  });
});
