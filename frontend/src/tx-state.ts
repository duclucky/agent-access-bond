export type TxStatus =
  | "idle"
  | "submitted"
  | "accepted"
  | "finalized"
  | "failed";

export type TxState = {
  operation: string | null;
  hash: string | null;
  status: TxStatus;
  error: string | null;
};

export type TxAction =
  | { type: "submitted"; operation: string | null; hash: string }
  | { type: "accepted" }
  | { type: "finalized" }
  | { type: "failed"; error: string }
  | { type: "reset" };

export const initialTxState: TxState = {
  operation: null,
  hash: null,
  status: "idle",
  error: null
};

export function txReducer(state: TxState, action: TxAction): TxState {
  switch (action.type) {
    case "submitted":
      return {
        operation: action.operation,
        hash: action.hash,
        status: "submitted",
        error: null
      };
    case "accepted":
      return { ...state, status: "accepted", error: null };
    case "finalized":
      return { ...state, status: "finalized", error: null };
    case "failed":
      return { ...state, status: "failed", error: action.error };
    case "reset":
      return initialTxState;
  }
}
