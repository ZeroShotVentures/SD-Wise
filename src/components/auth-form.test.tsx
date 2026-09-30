import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthForm } from "./auth-form";

type AuthResult = { error: { message?: string } | null };
type Credentials = { email: string; password: string };

const { signIn, router } = vi.hoisted(() => ({
  signIn: {
    email: vi.fn<(input: Credentials) => Promise<AuthResult>>(),
  },
  router: { replace: vi.fn<(href: string) => void>() },
}));

vi.mock("@/lib/auth-client", () => ({ signIn }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const defaultProps = { callbackURL: "/graph" };

describe("AuthForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("signs in with email and password", async () => {
    signIn.email.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<AuthForm {...defaultProps} />);

    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter22");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(signIn.email).toHaveBeenCalledWith({
      email: "jane@example.com",
      password: "hunter22",
    });
    expect(router.replace).toHaveBeenCalledWith("/graph");
  });

  it("shows the error returned by the auth client", async () => {
    signIn.email.mockResolvedValue({ error: { message: "Invalid password" } });
    const user = userEvent.setup();
    render(<AuthForm {...defaultProps} />);

    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Invalid password")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("has no way to sign up", () => {
    render(<AuthForm {...defaultProps} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
