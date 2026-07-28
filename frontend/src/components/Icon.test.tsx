import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Icon } from "./Icon";

describe("Icon", () => {
  it("renders bundled SVG icons instead of visible ligature text", () => {
    const { container } = render(<Icon name="dashboard" aria-label="Dashboard" />);

    expect(screen.getByLabelText("Dashboard")).toHaveAttribute("aria-hidden", "false");
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container).not.toHaveTextContent("dashboard");
  });

  it("falls back to a stable generic icon for unknown names", () => {
    const { container } = render(<Icon name="unknown_contract_icon" />);

    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container).not.toHaveTextContent("unknown_contract_icon");
  });
});
