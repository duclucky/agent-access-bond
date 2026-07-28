import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TransactionActivity } from "./TransactionActivity";

describe("TransactionActivity", () => {
  it("shows a submitted transaction with a real explorer link", () => {
    render(
      <TransactionActivity
        explorerUrl="https://explorer.example"
        state={{
          operation: "adjudicate_case",
          hash: "0xabc",
          status: "submitted",
          error: null
        }}
      />
    );

    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /0xabc/i })).toHaveAttribute(
      "href",
      "https://explorer.example/transactions/0xabc"
    );
  });

  it("shows retry only for a failed operation", () => {
    render(
      <TransactionActivity
        explorerUrl="https://explorer.example"
        state={{
          operation: "open_access_case",
          hash: null,
          status: "failed",
          error: "Signature rejected"
        }}
        onRetry={() => undefined}
      />
    );

    expect(screen.getByText("Signature rejected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry transaction/i })).toBeEnabled();
  });
});
