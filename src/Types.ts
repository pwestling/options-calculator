import { OptionChain } from "yahoo-finance-client-ts";

export interface OptionMap {
  [key: string]: Option;
}

export interface Dispatch {
  (action: Action): void;
}

export enum ProfitDisplay {
  Absolute,
  PercentRisk
}

export type DisplayOptions = {
  profit: ProfitDisplay;
  maxPrice?: number;
  minPrice?: number;
};

export type State = {
  options: Option[];
  symbol: string;
  price: number;
  display: DisplayOptions;
  nextOptId: number;
  loaded: boolean;
};

export enum OptionSale {
  Buy = "buy",
  Sell = "sell"
}

export enum OptionType {
  Call = "call",
  Put = "put"
}
export type SetState = { type: "set-state"; payload: State };

export type AddOption = { type: "add" };

export type RemoveOption = { type: "remove"; payload: { id: number } };

export type ModifyOption = {
  type: "modify-option";
  payload: { id: number; field: keyof Option; value: any };
};
export type ModifySymbol = {
  type: "modify-symbol";
  payload: { symbol?: string; price?: number; iv?: number };
};

export type DisplayOption = {
  type: "display";
  payload: { field: keyof DisplayOptions; value: any };
};

export type ClearOptions = {
  type: "clear-options";
  payload?: {};
};

export type Action =
  | AddOption
  | ModifyOption
  | ModifySymbol
  | RemoveOption
  | DisplayOption
  | ClearOptions
  | SetState;

export type Option = {
  id: number;
  strike: number;
  price: number;
  iv: number;
  quantity: number;
  expiry: number;
  type: OptionType;
  sale: OptionSale;
  editing: boolean;
  hidden: boolean;
};

export type OptionCache = {
  (symbol: string, date: number): Promise<OptionChain>;
};
