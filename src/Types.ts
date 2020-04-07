import { OptionChain, ContractData, OptionMeta, Expiration } from "yahoo-finance-client-ts";

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

export type Symbol = {
  symbol : string;
  name : string;
  price : EditString<number>;
  meta? : OptionMeta
}

export type State = {
  options: Option[];
  symbol: Symbol;
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

export type AddOption = { type: "add", payload?: Option };

export type RemoveOption = { type: "remove"; payload: { id: number } };

export type ModifyOption = {
  type: "modify-option";
  payload: { id: number; field: keyof Option; value: any };
};

export type ModifyOptionExpirations = {
  type: "modify-expirations";
  payload: { value: string };
};
export type ModifySymbol = {
  type: "modify-symbol";
  payload: { symbol?: string; userPrice?: (string | null); actualPrice?: number, name? : string, lastParsedPrice?: number, meta? : OptionMeta};
};

export type DisplayOption = {
  type: "display";
  payload: { field: keyof DisplayOptions; value: any };
};

export type ClearOptions = {
  type: "clear-options";
  payload?: {};
};

export type EditString<T> = {
  actual? : T;
  user? : string;
  lastParsed? : T;
  error? : string
  toUse : T
}

export type Action =
  | AddOption
  | ModifyOption
  | ModifySymbol
  | RemoveOption
  | DisplayOption
  | ClearOptions
  | SetState
  | ModifyOptionExpirations;

export type Option = {
  id: number;
  strike: EditString<number>;
  price: EditString<number>;
  iv: number;
  quantity: EditString<number>;
  expiry: EditString<Expiration>;
  type: OptionType;
  sale: OptionSale;
  editing: boolean;
  hidden: boolean;
  contract?: ContractData
};

export type OptionCache = {
  (symbol: string, date: number): Promise<OptionChain>;
};
