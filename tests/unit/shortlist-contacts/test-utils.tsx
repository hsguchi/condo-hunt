import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { MockUiStateProvider } from "@/components/providers/mock-ui-state-provider";
import {
  createMockUiState,
  MOCK_UI_STATE_STORAGE_KEY,
  type MockUiStateSeed
} from "@/lib/mock-ui-state";

interface RenderWithMockUiStateOptions {
  route?: string;
  seed?: MockUiStateSeed;
}

export function renderWithMockUiState(
  ui: ReactElement,
  { route = "/", seed = {} }: RenderWithMockUiStateOptions = {}
) {
  window.localStorage.clear();
  window.localStorage.setItem(
    MOCK_UI_STATE_STORAGE_KEY,
    JSON.stringify(createMockUiState(seed))
  );
  window.history.pushState({}, "", route);

  return render(<MockUiStateProvider>{ui}</MockUiStateProvider>);
}

export function mockClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);

  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText
    }
  });

  return { writeText };
}
