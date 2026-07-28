import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Eip1193Provider, InjectedWallet } from "../wallet";
import { WalletDialog } from "./WalletDialog";

const provider = { request: vi.fn() } as Eip1193Provider;
const wallets: InjectedWallet[] = [
  {
    info: {
      uuid: "rabby-uuid",
      name: "Rabby",
      icon: "data:image/png;base64,AA==",
      rdns: "io.rabby"
    },
    provider
  }
];

afterEach(cleanup);

describe("WalletDialog", () => {
  it("connects the installed extension selected by the user", () => {
    const onSelect = vi.fn();

    render(
      <WalletDialog
        wallets={wallets}
        connectingId={null}
        onClose={vi.fn()}
        onSelect={onSelect}
        onMetaMaskConnect={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Rabby" }));

    expect(onSelect).toHaveBeenCalledWith(wallets[0]);
  });

  it("keeps MetaMask mobile as an explicit fallback", () => {
    const onMetaMaskConnect = vi.fn();

    render(
      <WalletDialog
        wallets={[]}
        connectingId={null}
        onClose={vi.fn()}
        onSelect={vi.fn()}
        onMetaMaskConnect={onMetaMaskConnect}
      />
    );

    expect(screen.getByText("No extension wallets detected")).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "MetaMask mobile or QR" })
    );
    expect(onMetaMaskConnect).toHaveBeenCalledOnce();
  });

  it("shows connection failures inside the wallet dialog", () => {
    render(
      <WalletDialog
        wallets={wallets}
        connectingId={null}
        error="Wallet rejected the network request."
        onClose={vi.fn()}
        onSelect={vi.fn()}
        onMetaMaskConnect={vi.fn()}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Wallet rejected the network request."
    );
  });
});
