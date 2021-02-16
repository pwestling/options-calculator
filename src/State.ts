import {
  Action,
  Option,
  State,
  Dispatch,
  DisplayOption,
  DisplayOptions,
  ProfitDisplay,
  ModifyOption,
  ModifySymbol,
  OptionMap,
  OptionSale,
  OptionType,
  RemoveOption,
  OptionCache,
  Symbol,
} from "./Types";
import {
  OptionChain,
  OptionMeta,
  ContractData,
  Quote,
  Expiration
} from "yahoo-finance-client-ts";
import YahooFinance from "yahoo-finance-client-ts";
import bs from "black-scholes";
import produce from "immer";
import axios from "axios";
import { Ref, RefObject, MutableRefObject } from "react";
import { getPrice } from "./Helpers";

const yf = window.location.host.includes("localhost")
  ? new YahooFinance("https://query1.finance.yahoo.com/v7/finance")
  : new YahooFinance(
      `${window.location.protocol}//${window.location.host}/finance`
    );

function adjustBSPrice(state: State, option: Option) {
  // let yearsToExpiry =
  //   moment.duration(moment.unix(option.expiry).diff(moment())).asDays() / 360.0;
  // option.blackScholesPrice =
  //   Math.round(
  //     bs.blackScholes(
  //       state.price,
  //       option.strike,
  //       yearsToExpiry,
  //       state.iv,
  //       INTEREST_RATE,
  //       option.type
  //     ) * 100
  //   ) / 100;
}

function quotePrice(quote: Quote | undefined) {
  return quote?.bid || quote?.postMarketPrice || quote?.regularMarketPrice || 0;
}

export function symbolPrice(symbol: Symbol): number {
  return symbol.price.lastParsed || symbol.price.actual || 0;
}

function nameOf(quote: Quote | undefined): string {
  return quote?.shortName || quote?.longName || "";
}

const boxUrl = "https://jsonbox.io/box_5fa832a14b0bc099f9e0";

export function storeState(state: State): Promise<String> {
  return axios.post(boxUrl, state).then(
    (res) => res.data._id,
    (err) => {
      console.log("Error creating permalink", err);
      return "";
    }
  );
}

export function retrieveState(id: string): Promise<State | null> {
  return axios.get(boxUrl + "/" + id).then(
    (res) => res.data as State,
    (err) => {
      console.log("Error retrieving state", err);
      return null;
    }
  );
}

export function initialState(urlParams: URLSearchParams): State {
  return {
    options: [] as Option[],
    symbol: { symbol: "", name: "", price: { actual: 0, toUse: 0 } },
    display: { profit: ProfitDisplay.PercentRisk },
    nextOptId: 0,
    loaded: !urlParams.has("code"),
  };
}

type ChainCache = {
  [date: number]: OptionChain;
  meta: OptionMeta;
  quote?: Quote;
  loadPromise: Promise<void>;
};

const dataCache: ChainCache = {
  meta: { strikes: [], expirations: [] },
  loadPromise: Promise.resolve(),
};

function updateDataCache(symbol: string): Promise<void> {
  try{
    let loadQuote = yf.quote(symbol).then((q) => (dataCache.quote = q));
    let loadDataCache = yf.optionMeta(symbol).then((meta) => {
      dataCache.meta = meta;
      meta.expirations.forEach((exp) => {
        if(exp){
          yf.options(symbol, exp.expirationTimestamp).then((chain) => {
            dataCache[exp.expirationTimestamp] = chain;
          });
        }
      });
    });

    dataCache.loadPromise = Promise.all([
      loadQuote,
      loadDataCache,
    ]).then(() => {});
    return dataCache.loadPromise;
  }catch(e){
    return Promise.resolve()
  }
}

function d(dispatch: MutableRefObject<Dispatch | undefined>, action: Action) {
  let current = dispatch.current;
  if (current) {
    current(action);
  }
}

function updateOption(symbol: Symbol, option: Option) {
  if(option.price.user){
    let parsed = Number(option.strike.user);
    if(parsed && !isNaN(parsed)){
      option.price.lastParsed = parsed
    }
  }
  if (option.expiry.user) {
    let validExpiry = dataCache.meta.expirations.find(
      (e) => e.expirationString === option.expiry.user
    );
    if (validExpiry) {
      option.expiry.lastParsed = validExpiry;
      option.expiry.toUse = option.expiry.lastParsed;
      option.expiry.error = undefined;
    } else {
      option.expiry.toUse = {expirationString: "0-0-0", expirationTimestamp: 0}
      option.expiry.error = "Invalid expiration date for this option";
    }
  }
  if (option.strike) {
    try {
      option.strike.lastParsed = Number(option.strike.user);
      option.strike.toUse = option.strike.lastParsed;
      let validStrike = dataCache.meta.strikes.find(
        (s) => s === option.strike.lastParsed
      );
      if (validStrike) {
        option.strike.error = undefined;
      } else {
        option.strike.error = "Invalid strike price for this option";
      }
    } catch (e) {
      //Ignore
    }
  }
  if (option.strike.lastParsed && option.expiry.lastParsed) {
    let contract =
      dataCache[option.expiry.lastParsed.expirationTimestamp][option.type][
        option.strike.lastParsed
      ];
    option.iv = contract?.impliedVolatility || 0.66;
    option.price.actual = getPrice(
      { strike: option.strike.lastParsed, sale: option.sale },
      contract
    );
    option.price.toUse = option.price.lastParsed || option.price.actual || 0
  }
}

export const reducer = (dispatch: MutableRefObject<Dispatch | undefined>) => (
  state: State,
  action: Action
): State => {
  let newstate = produce(state, (draft) => {
    switch (action.type) {
      case "set-state": {
        console.log("setting state to", action.payload);
        updateDataCache(action.payload.symbol.symbol);
        return action.payload;
      }
      case "clear-options": {
        draft.options = [];
        break;
      }
      case "add": {
        let id = state.nextOptId;
        draft.nextOptId = state.nextOptId + 1;
        let quant = Object.values(state.options).length > 0
              ? Object.values(state.options)[0].quantity.toUse
              : 1
        let exp = Object.values(state.options).length > 0
        ? Object.values(state.options)[0].expiry.toUse
        : null
        let data: Option = {
          id: id,
          strike: {toUse: 0},
          price: {toUse: 0},
          iv: 0,
          quantity: {toUse: quant, user: quant.toString()},
          expiry: {toUse: exp || {expirationString: "", expirationTimestamp: 0}, user: exp?.expirationString || undefined},
          type: OptionType.Put,
          editing: true,
          hidden: false,
          sale: OptionSale.Buy,
        };
        if(action.payload){
          data = ({ ...action.payload } as Option) 
        }
        data.id = id;
        draft.options.push(data);
        break;
      }
      case "remove": {
        draft.options = draft.options.filter(
          (opt) => opt.id !== action.payload.id
        );
        break;
      }
      case "modify-option": {
        let option = draft.options.filter(
          (opt) => opt.id === action.payload.id
        )[0];
        switch (action.payload.field) {
          case "quantity": {
            option.quantity.user = action.payload.value;
            option.quantity.lastParsed = Number(action.payload.value);
            option.quantity.toUse = option.quantity.lastParsed;
            break;
          }
          case "expiry":
          case "price":
          case "strike": {
            if(action.payload.value !== null){
              option[action.payload.field].user = action.payload.value; //Rest is handled in update option
            }else{
              option[action.payload.field].user = undefined
            }
            break;
          }
          default: {
            (option[action.payload.field] as any) = action.payload.value;
          }
        }
        updateOption(draft.symbol, option);
        break;
      }
      case "modify-expirations": {
        draft.options.forEach((o) => {
          o.expiry.user = action.payload.value;
          updateOption(draft.symbol, o);
        });
        break;
      }
      case "modify-symbol": {
        if (action.payload.symbol != null) {
          draft.symbol.symbol = action.payload.symbol;
          draft.symbol.price.actual = 0;
          draft.symbol.name = "";
        }
        if (action.payload.userPrice !== undefined) {
          console.log("Got user price");
          if (action.payload.userPrice !== null) {
            console.log("Got non-null user price");
            draft.symbol.price.user = action.payload.userPrice;

            let parsedPrice = Number(draft.symbol.price.user);
            if (parsedPrice && !isNaN(parsedPrice)) {
              console.log("parsed", parsedPrice);
              draft.symbol.price.error = undefined
              draft.symbol.price.lastParsed = parsedPrice;
            } else {
              console.log(
                `Could not parse ${draft.symbol.price.user} as a number`
              );
              if (!action.payload.userPrice.match("^[0-9]+.?[0-9]*$")) {
                draft.symbol.price.error = "Price must be a number";
              }
            }
          } else {
            draft.symbol.price.user = undefined;
          }
        }
        if (action.payload.actualPrice != null) {
          console.log("Actual price", action.payload.actualPrice);
          draft.symbol.price.actual = action.payload.actualPrice;
        }
        draft.symbol.name =
          action.payload.name != null ? action.payload.name : draft.symbol.name;
        draft.symbol.meta =
          action.payload.meta != null ? action.payload.meta : draft.symbol.meta;

        if (draft.symbol.symbol !== state.symbol.symbol) {
          console.log("Updating data");
          updateDataCache(draft.symbol.symbol).then(() => {
            console.log("Updating quote price", quotePrice(dataCache.quote));
            d(dispatch, {
              type: "modify-symbol",
              payload: {
                actualPrice: quotePrice(dataCache.quote),
                name: nameOf(dataCache.quote),
                meta: dataCache.meta,
              },
            });
          });
        }
        draft.symbol.price.toUse =
          draft.symbol.price.lastParsed || draft.symbol.price.actual || 0;
        break;
      }
      case "display": {
        (draft.display[action.payload.field] as any) = action.payload.value;
        break;
      }
    }
  });
  return newstate;
};
