import type { Page } from "@playwright/test";
import {
  createMockUiState,
  MOCK_UI_STATE_CHANGE_EVENT,
  MOCK_UI_STATE_STORAGE_KEY,
  type MockUiState,
  type MockUiStateSeed
} from "../../../lib/mock-ui-state";

interface SerializedMockUiStatePayload {
  eventName: string;
  storageKey: string;
  value: string;
}

async function applyMockUiState(page: Page, state: MockUiState) {
  const payload: SerializedMockUiStatePayload = {
    eventName: MOCK_UI_STATE_CHANGE_EVENT,
    storageKey: MOCK_UI_STATE_STORAGE_KEY,
    value: JSON.stringify(state)
  };

  await page.addInitScript((nextState: SerializedMockUiStatePayload) => {
    window.localStorage.setItem(nextState.storageKey, nextState.value);
    window.dispatchEvent(new CustomEvent(nextState.eventName));
  }, payload);

  if (page.url().startsWith("http")) {
    await page.evaluate((nextState: SerializedMockUiStatePayload) => {
      window.localStorage.setItem(nextState.storageKey, nextState.value);
      window.dispatchEvent(new CustomEvent(nextState.eventName));
    }, payload);
  }

  return state;
}

export function buildMockUiState(seed: MockUiStateSeed = {}) {
  return createMockUiState(seed);
}

export async function resetMockUiState(page: Page) {
  return applyMockUiState(page, createMockUiState());
}

export async function seedMockUiState(page: Page, seed: MockUiStateSeed) {
  return applyMockUiState(page, createMockUiState(seed));
}

export async function clearMockUiState(page: Page) {
  const payload = {
    eventName: MOCK_UI_STATE_CHANGE_EVENT,
    storageKey: MOCK_UI_STATE_STORAGE_KEY
  };

  await page.addInitScript((nextState: Omit<SerializedMockUiStatePayload, "value">) => {
    window.localStorage.removeItem(nextState.storageKey);
    window.dispatchEvent(new CustomEvent(nextState.eventName));
  }, payload);

  if (page.url().startsWith("http")) {
    await page.evaluate((nextState: Omit<SerializedMockUiStatePayload, "value">) => {
      window.localStorage.removeItem(nextState.storageKey);
      window.dispatchEvent(new CustomEvent(nextState.eventName));
    }, payload);
  }
}
