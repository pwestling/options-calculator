import { Option, OptionSale, OptionType } from "./Types";
import { ContractData } from "yahoo-finance-client-ts";

import React, { useEffect, useRef } from "react";

interface OptionStrikeAndSale {
  strike : number,
  sale : OptionSale
}

export function getPrice(
  option: OptionStrikeAndSale,
  contract: ContractData | null | undefined
): number | undefined {
  if (contract) {
    let contractPrice =
      option.sale === OptionSale.Buy ? contract.ask : contract.bid;
    contractPrice =
      contractPrice && contractPrice > 0
        ? contractPrice
        : contract.lastPrice || 0.01;
    return contractPrice;
  } else {
    return undefined;
  }
}
