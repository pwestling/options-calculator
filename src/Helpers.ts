
import {Option} from "./Types"

export function effectivePrice(opt: Option): number {
  return (opt.price > 0 ? opt.price : opt.blackScholesPrice) || 0;
}