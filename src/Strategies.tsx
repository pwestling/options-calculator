 import React, { useCallback, useState, useEffect } from "react";
// import Grid from "@material-ui/core/Grid";
// import Card from "@material-ui/core/Card";
// import Container from "@material-ui/core/Container";
// import CardActions from "@material-ui/core/CardActions";
// import CardContent from "@material-ui/core/CardContent";
// import Typography from "@material-ui/core/Typography";
// import moment from "moment";
// import TextField from "@material-ui/core/TextField";
// import Fab from "@material-ui/core/Fab";
// import CheckIcon from "@material-ui/icons/Check";
// import EditIcon from "@material-ui/icons/Edit";
// import DeleteIcon from "@material-ui/icons/Delete";
// import VisibleIcon from "@material-ui/icons/Visibility";
// import InvisibleIcon from "@material-ui/icons/VisibilityOff";
// import Tooltip from "@material-ui/core/Tooltip";
// import Autocomplete from "@material-ui/lab/Autocomplete";
// import RadioGroup from "@material-ui/core/RadioGroup";
// import Radio from "@material-ui/core/Radio";
// import FormControlLabel from "@material-ui/core/FormControlLabel";
// import FormControl from "@material-ui/core/FormControl";
// import FormHelperText from "@material-ui/core/FormHelperText";
// import { useStyles } from "./Styles";
// import { effectivePrice } from "./Helpers";
// import { ContractData, OptionMeta, Expiration } from "yahoo-finance-client-ts";
// import { getPrice } from "./Helpers";

// import Slider from "@material-ui/core/Slider";
// import { Option, OptionSale, OptionType, Dispatch, OptionCache } from "./Types";

// function closest(vals: number[], target: number): number {
//   return vals.reduce((a, b) => {
//     if (Math.abs(a - target) < Math.abs(b - target)) {
//       return a;
//     } else {
//       return b;
//     }
//   }, 0);
// }

// interface MiniOpt {
//   strike : number;
//   sale : OptionSale;
//   type : OptionType;
// }

// interface Strategy {
//   init(price: number, strikes: number[]): MiniOpt[];
//   name : string;
// }

// function Center(props: { style?: any, children: React.ReactNode }): React.ReactElement {
//   return (
//     <div style={{ display: "flex", flexDirection: "row", ...props.style }}>
//       <div style={{ flexGrow: 1 }} />
//       {props.children}
//       <div style={{ flexGrow: 1 }} />
//     </div>
//   );
// }

// let parseDate: (val: string) => number = val => {
//   try {
//     let entered = moment(val).utc();
//     let now = moment().utc();
//     if (entered.year() === 2001) {
//       entered.year(now.year());
//     }
//     if (entered.isBefore(now)) {
//       entered.add(1, "year");
//     }
//     return entered.startOf("day").unix();
//   } catch (e) {
//     console.log("Could not parse " + val);
//     return 0;
//   }
// };

// let IronCondor : Strategy = {
//   init(price:number, strikes : number[]) : MiniOpt[] {
//     let closestStrikeToPrice = strikes.reduce((a, b) => {
//       if (Math.abs(a - price) < Math.abs(b - price)) {
//         return a;
//       } else {
//         return b;
//       }
//     }, 0);
    
//     let lessThanTarget = strikes.filter(s => s < closestStrikeToPrice)
//     let greaterThanTarget = strikes.filter(s => s >= closestStrikeToPrice)
//     let highPutStrike = lessThanTarget.slice(-2)[0] || strikes[0]
//     let lowPutStrike = lessThanTarget.slice(-4)[0] || strikes[1]
//     let lowCallStrike = greaterThanTarget[0] || strikes.slice(-2)[0]
//     let highCallStrike = greaterThanTarget[1] || strikes.slice(-1)[0]


//     return [
//       {strike: lowPutStrike, type: OptionType.Put, sale: OptionSale.Buy},
//       {strike: highPutStrike, type: OptionType.Put, sale: OptionSale.Sell},
//       {strike: lowCallStrike, type: OptionType.Call, sale: OptionSale.Sell},
//       {strike: highCallStrike, type: OptionType.Call, sale: OptionSale.Buy},
//     ]

//   },
//   name: "Iron Condor"
// }

// export function StrategyCard(props: {
//   dispatch: Dispatch;
//   symbol: string,
//   optionMeta?: OptionMeta;
//   optionData?: OptionCache;
//   options: Option[],
//   price: number;
// }): React.ReactElement {
//   let strategy : Strategy = IronCondor
//   let [sliderVal, setSliderVal] = useState<number[]>([]);
//   let [expiration, setExpiration] = useState<Expiration | undefined>(undefined);
//   let [expStr, setExpStr] = useState<string | undefined>(undefined);
//   let [marks, setMarks] = useState<{ value: number; label?: string }[]>([]);
//   let [min, setMin] = useState<number>(0);
//   let [max, setMax] = useState<number>(100);

//   let setMinMax = (min: number, max: number): void => {
//     let strikes = props.optionMeta?.strikes?.sort((a, b) => a - b) || [];

//     let minIndex = 0;
//     let maxIndex = strikes.length - 1;

//     for (let i = 0; i < strikes.length; i++) {
//       if (minIndex === 0 && strikes[i] > min) {
//         minIndex = Math.max(0, i-5);
//       }
//       if (
//         maxIndex === strikes.length - 1 &&
//         i < strikes.length &&
//         strikes[i + 1] > max
//       ) {
//         maxIndex = Math.min(strikes.length - 1, i + 5);
//       }
//     }

//     const numToInclude = 10;
//     if (maxIndex - minIndex < numToInclude) {
//       let diff = numToInclude - (maxIndex - minIndex);
//       let toAdd = Math.ceil(diff / 2);
//       minIndex = Math.max(minIndex - toAdd, 0);
//       maxIndex = Math.min(maxIndex + toAdd, strikes.length - 1);
//     }

//     let minStrike = strikes[minIndex];
//     let maxStrike = strikes[maxIndex];

//     let includedStrikes = strikes.filter(s => minStrike && s <= maxStrike);
//     let newMarks = includedStrikes.map(s => {
//       return {
//         value: s,
//         label: s === maxStrike || s === minStrike ? s.toString() : undefined
//       };
//     });
//     setMin(minStrike);
//     setMax(maxStrike);
//     setMarks(newMarks);
//     console.log("MinMax", minStrike, maxStrike);

//     console.log("Num marks", newMarks.length)
//   };

//   useEffect(() => {
//     let strikes = props.optionMeta?.strikes?.sort((a,b) => a-b) || [];
//     let opts = strategy.init(props.price, strikes)
//     let value = opts.map(o => o.strike)
//     setSliderVal(value);
//     let newmin = value.reduce((a, b) => Math.min(a, b), 32000000);
//     let newmax = value.reduce((a, b) => Math.max(a, b), 0);
//     setMinMax(newmin, newmax);

//     props.dispatch({type: "clear-options"})
//     let newExpiry : Expiration = expiration || (props.optionMeta?.expirations || []).reduce((a, b) => a.expirationTimestamp < b.expirationTimestamp ? a : b, {expirationString: "N/A", expirationTimestamp: 32000000000})
//     if(props.optionData){
//       props.optionData(props.symbol, newExpiry.expirationTimestamp).then(res => {
//         opts.forEach(v => {
//           let contract = res[v.type][v.strike]
//           props.dispatch({type: "add", payload: {
//         id: 0,
//         strike: v.strike,
//         iv: contract?.impliedVolatility || 0,
//         sale: v.sale,
//         type:v.type,
//         price: getPrice({strike: v.strike, sale: v.sale}, contract) || 0,
//         quantity: 1,
//         editing: false,
//         hidden: false,
//         expiry: newExpiry.expirationTimestamp
//       }})
//     })
//     })


//   }}, [props.optionMeta]);

//   return (
//     <Card
//       raised
//       style={{ marginBottom: "1em", height: "60vh", width: "min-content" }}
//     >
//       <CardContent style={{ height: "100%" }}>
//         <Center>
//           <Typography align="center" style={{ width: "120px", marginBottom: "1em" }}>
//             Iron Condor
//           </Typography>
//         </Center>
//         <Center>
//         <Autocomplete
//               freeSolo
//               blurOnSelect
//               size="small"
//               id="combo-box-expiry"
//               options={props.optionMeta ? props.optionMeta.expirations : []}
//               inputValue={expStr}
//               getOptionLabel={option => option.expirationString}
//               onInputChange={(event: any, value: any, reason: string) => {
//                 console.log("Reason", reason);
//                 console.log("submitting date", value);
//                 if (reason !== "reset" || value) {
//                   setExpStr(value);
//                   let val = parseDate(value);
//                   if (props.optionMeta) {
//                     let selected = props.optionMeta.expirations.filter(
//                       e => e.expirationString === value
//                     );
//                     if (selected.length === 1) {
//                       console.log("submitting date", selected[0]);

//                       val = selected[0].expirationTimestamp;
//                     }
//                   }
//                   console.log("submitting date val", val);

//                   props.dispatch({
//                     type: "modify-expirations",
//                     payload: {
//                       value: val
//                     }
//                   });
//                 }
//               }}
//               renderInput={params => (
//                 <TextField
//                   {...params}
//                   label="Expiry"
//                   error={expiration === null}
//                   helperText={expiration === null
//                       ? "Invalid expiration for this strike price"
//                       : ""
//                   }
//                   variant="outlined"
//                 />
//               )}
//               />
//         </Center>
//         <div style={{ height: "70%", verticalAlign: "center" }}>
//           <Center style={{height: "100%"}}>
//             <Slider
//               classes={{
//                 valueLabel: "rotated-slider-label",
//                 mark: "invisible-mark",
//                 markActive: "invisible-mark"
//               }}
//               valueLabelDisplay="on"
//               orientation="vertical"
//               onChange={(e: any, value: number | number[]) => {
//                 if (typeof value === "object") {
//                   setSliderVal(value);
//                 }
//               }}
//               onChangeCommitted={(e: any, value: number | number[]) => {
//                 if (typeof value === "object") {
//                   let newmin = value.reduce((a, b) => Math.min(a, b), 32000000);
//                   let newmax = value.reduce((a, b) => Math.max(a, b), 0);
//                   setMinMax(newmin, newmax);
//                 }
//               }}
//               min={min}
//               max={max}
//               step={null}
//               value={sliderVal}
//               marks={marks}
//             />
//           </Center>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }
