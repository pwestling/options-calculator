
import {Option} from "./Types"
import React, {useEffect, useRef} from "react"

export function effectivePrice(opt: Option): number {
  return opt.price;
}
