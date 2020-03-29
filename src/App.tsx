import React, {
  useState,
  useCallback,
  useEffect,
  useReducer,
  useMemo
} from "react";
import Grid from "@material-ui/core/Grid";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";

import bs from "black-scholes";
import moment from "moment";
import TextField from "@material-ui/core/TextField";
import Fab from "@material-ui/core/Fab";
import AddIcon from "@material-ui/icons/Add";
import Select from "@material-ui/core/Select";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import Tooltip from "@material-ui/core/Tooltip";
import msgpack from "notepack";
import FormControl from "@material-ui/core/FormControl";
import base64url from "base64url";
import { useStyles } from "./Styles";
import ByteBuffer from "byte-buffer";

import { v4 as uuidv4 } from "uuid";
import produce from "immer";
import "bootstrap/dist/css/bootstrap.css";

import "./App.css";
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
  OptionField,
  OptionMap,
  OptionSale,
  OptionType,
  RemoveOption
} from "./Types";
import { OptionCard, FixedOptionCard } from "./OptionCards";
import { effectivePrice } from "./Helpers";

// Initialize Cloud Firestore through Firebase
const INTEREST_RATE = 0.0;

function SymbolCard(props: {
  dispatch: Dispatch;
  className?: any;
  iv: number;
  symbol: string;
  price: number;
}): React.ReactElement {
  return (
    <Card className={props.className} raised>
      <CardContent>
        <Grid
          container
          justify="flex-start"
          alignItems="flex-end"
          direction="row"
          spacing={3}
        >
          <Grid item xs={12} sm={6}>
            <TextField
              variant="outlined"
              size="small"
              label="Symbol"
              margin="none"
              value={props.symbol}
              onChange={e =>
                props.dispatch({
                  type: "modify-symbol",
                  payload: { symbol: e.target.value }
                })
              }
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl>
              <TextField
                variant="outlined"
                size="small"
                label="Stock Price"
                margin="none"
                defaultValue={props.price > 0 ? props.price : null}
                onChange={e =>
                  props.dispatch({
                    type: "modify-symbol",
                    payload: { price: Number(e.target.value) }
                  })
                }
              />
              {/* <FormHelperText>Test</FormHelperText> */}
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              variant="outlined"
              size="small"
              label="IV"
              placeholder="0.66"
              helperText="IV as a decimal"
              margin="none"
              defaultValue={props.iv > 0 ? props.iv : null}
              onChange={e =>
                props.dispatch({
                  type: "modify-symbol",
                  payload: { iv: Number(e.target.value) }
                })
              }
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

function GridColumn(props: { children: React.ReactNode }): React.ReactElement {
  return (
    <>
      {React.Children.map(props.children, child => (
        <Grid item> {child} </Grid>
      ))}
    </>
  );
}

interface NumMap<V> {
  [index: number]: V;
}

function range(start: number, end: number, buckets: number): Array<number> {
  let result = [];
  let incr = Math.ceil(Math.max(1, (end - start) / buckets));
  for (let i = start; i < end; i += incr) {
    result.push(i);
  }
  result.push(end);
  return result;
}

function gradient(maxRisk: number, maxProfit: number, profit: number): string {
  let red = 0;
  let green = 0;
  let alpha = 0;
  if (profit < 0) {
    red = 200;
    alpha = (profit / maxRisk) * 0.7 + 0.1;
  }
  if (profit > 0) {
    green = 200;
    alpha = (profit / maxProfit) * 0.7 + 0.1;
  }
  return `rgba(${red},${green}, 0, ${alpha})`;
}

function adjustBSPrice(state: State, option: Option) {
  let yearsToExpiry =
    moment.duration(moment.unix(option.expiry).diff(moment())).asDays() / 360.0;
  option.blackScholesPrice =
    Math.round(
      bs.blackScholes(
        state.price,
        option.strike,
        yearsToExpiry,
        state.iv,
        INTEREST_RATE,
        option.type
      ) * 100
    ) / 100;
}

// const OptionBlob = new ObjectType({
//   id: types.UInt8,
//   strike: types.UInt32,
//   price: types.UInt32,
//   blackScholesPrice: types.UInt32,
//   quantity: types.UInt32,
//   expiry: types.UInt64,
//   type: types.String,
//   sale: types.String,
//   editing: types.Boolean
// });

// const DisplayOptionBlob = new ObjectType({
//   profit: types.String,
//   maxPrice: types.UInt32,
//   minPrice: types.UInt32
// });

// const StateBlob = new ObjectType({
//   options: new ArrayType(OptionBlob),
//   symbol: types.String,
//   price: types.UInt32,
//   iv: types.UInt16,
//   display: DisplayOptionBlob,
//   nextOptId: types.UInt8
// });

function writeString(buffer: ByteBuffer, data: string) {
  let start = buffer.index;
  buffer.writeByte(0);
  if (data.length > 0) {
    let written = buffer.writeString(data);
    let end = buffer.index;
    buffer.index = start;
    buffer.writeByte(written);
    console.log();
    buffer.index = end;
    console.log("bounds", start, end);
    console.log(buffer.slice(start, end));
  }
}

function readString(buffer: ByteBuffer): string {
  let length = buffer.readByte();
  if (length > 0) {
    return buffer.readString(length);
  } else {
    return "";
  }
}

function writeDecimal(buffer :ByteBuffer, data : number ){
  let rounded = Math.round(data*10000) / 10000
  writeString(buffer, rounded.toString())
}

function readDecimal(buffer :ByteBuffer ) : number{
  return Number(readString(buffer))
}

function stateSer(buffer: ByteBuffer, state: State) {
  buffer.writeByte(state.options.length);
  state.options.forEach(o => optSer(buffer, o));
  writeString(buffer, state.symbol);
  writeDecimal(buffer, state.price);
  writeDecimal(buffer, state.iv);
  dispOptSer(buffer, state.display);
  buffer.writeByte(state.nextOptId);
}

function dispOptSer(buffer: ByteBuffer, state: DisplayOptions) {
  if (state.profit === ProfitDisplay.Absolute) {
    buffer.writeByte(1);
  } else {
    buffer.writeByte(2);
  }
  buffer.writeInt(state.minPrice || -1).writeInt(state.maxPrice || -1);
}

function optSer(buffer: ByteBuffer, option: Option) {
  console.log("Serializing", option)
  buffer.writeByte(option.id)
  writeDecimal(buffer, option.strike);

  writeDecimal(buffer, option.price);
  writeDecimal(buffer, (option.blackScholesPrice || -1));

  writeDecimal(buffer,option.quantity)
  writeDecimal(buffer, option.expiry);

  if (option.type === OptionType.Put) {
    buffer.writeByte(1);
  } else {
    buffer.writeByte(2);
  }

  if (option.sale === OptionSale.Buy) {
    buffer.writeByte(1);
  } else {
    buffer.writeByte(2);
  }
}

function stateDeSer(buffer: ByteBuffer): State {
  let result = {} as State;

  let numOptions = buffer.readByte();
  console.log("Num options", numOptions);
  result.options = [];
  for (let i = 0; i < numOptions; i++) {
    result.options.push(optDeSer(buffer));
  }
  console.log(result)
  result.symbol = readString(buffer);
  result.price = readDecimal(buffer);
  result.iv = readDecimal(buffer)
  console.log(result)
  result.display = dispOptDeSer(buffer);
  result.nextOptId = buffer.readByte();
  return result;
}

function dispOptDeSer(buffer: ByteBuffer): DisplayOptions {
  let result = {} as DisplayOptions;
  let profit = buffer.readByte();

  if (profit === 1) {
    result.profit = ProfitDisplay.Absolute;
  } else {
    result.profit = ProfitDisplay.PercentRisk;
  }
  result.minPrice = buffer.readInt();
  if (result.minPrice < 0) {
    delete result.minPrice;
  }
  result.maxPrice = buffer.readInt();
  if (result.maxPrice < 0) {
    delete result.maxPrice;
  }
  return result;
}

function optDeSer(buffer: ByteBuffer): Option {
  let result = {} as Option;
  result.id = buffer.readByte();
  console.log("Result", result);

  result.strike = readDecimal(buffer);
  console.log("Result", result);

  result.price = readDecimal(buffer);
  console.log("Result", result);

  result.blackScholesPrice = readDecimal(buffer);
  console.log("Result", result);

  result.quantity = readDecimal(buffer)
  console.log("Result", result);

  result.expiry = readDecimal(buffer)
  console.log("Result", result);

  let type = buffer.readByte();
  if (type === 1) {
    result.type = OptionType.Put;
  } else {
    result.type = OptionType.Call;
  }

  let sale = buffer.readByte();
  if (sale === 1) {
    result.sale = OptionSale.Buy;
  } else {
    result.sale = OptionSale.Sell;
  }
  return result;
}

function serializeState(state: State): string {
  let buf = new ByteBuffer();
  buf.implicitGrowth = true;
  stateSer(buf, state);
  return base64url.encode(new Buffer(buf.toArray()));
}

function deserializeState(state: string): State {
  let buf = new ByteBuffer(new Buffer(base64url.decode(state)));
  return stateDeSer(buf);
}

function App(): React.ReactElement {
  const classes = useStyles();

  var urlParams = new URLSearchParams(window.location.search);

  const initialArg: State = useMemo(() => {
    if (urlParams.has("state")) {
      try {
        let state = deserializeState(urlParams.get("state") as string);
        return state;
      } catch (e) {
        console.log("State is invalid", e);
      }
    }
    return {
      options: [] as Option[],
      price: -1,
      iv: -1,
      symbol: "SPY",
      display: { profit: ProfitDisplay.PercentRisk },
      nextOptId: 0
    };
  }, []);

  const [state, dispatch] = useReducer(
    (state: State, action: Action): State => {
      let newstate = produce(state, draft => {
        switch (action.type) {
          case "set-state": {
            return action.payload;
          }
          case "add": {
            let id = state.nextOptId;
            draft.nextOptId = state.nextOptId + 1;
            draft.options.push({
              id: id,
              strike: -1,
              price: 0,
              quantity:
                Object.values(state.options).length > 0
                  ? Object.values(state.options)[0].quantity
                  : 1,
              expiry:
                Object.values(state.options).length > 0
                  ? Object.values(state.options)[0].expiry
                  : moment()
                      .add(1, "day")
                      .unix(),
              type: OptionType.Put,
              editing: true,
              sale: OptionSale.Buy
            });
            break;
          }
          case "remove": {
            draft.options = draft.options.filter(
              opt => opt.id !== action.payload.id
            );
            break;
          }
          case "modify-option": {
            let option = draft.options.filter(
              opt => opt.id === action.payload.id
            )[0];
            (option[action.payload.field] as any) = action.payload.value;
            adjustBSPrice(draft, option);
            break;
          }
          case "modify-symbol": {
            draft.symbol = action.payload.symbol
              ? action.payload.symbol
              : draft.symbol;
            draft.price = action.payload.price
              ? action.payload.price
              : draft.price;
            draft.iv = action.payload.iv ? action.payload.iv : draft.iv;
            Object.values(draft.options).forEach(opt =>
              adjustBSPrice(draft, opt)
            );
            break;
          }
          case "display": {
            (draft.display[action.payload.field] as any) = action.payload.value;
            break;
          }
        }
      });
      try {
        let encoded = serializeState(newstate);
        window.history.pushState("", "", `/?state=${encoded}`);
      } catch (e) {
        console.log("State cannot be serialized");
      }

      return newstate;
    },
    initialArg
  );

  let strikes = Object.values(state.options).map(o => o.strike);
  let lastExpiry = moment.unix(
    Object.values(state.options)
      .map(o => o.expiry)
      .reduce((a, b) => Math.max(a, b), 0)
  );
  console.log(lastExpiry.format("MM/DD/YYYY"));

  let maxStrike =
    state.display.maxPrice ||
    Math.ceil(
      strikes.reduce((a, b) => {
        return Math.max(a, b);
      }, 0) * 1.3
    );
  let minStrike =
    state.display.minPrice ||
    Math.floor(
      strikes.reduce((a, b) => {
        return Math.min(a, b);
      }, maxStrike) * 0.7
    );
  let predictedPriceRange = range(minStrike, maxStrike, 20).reverse();

  let now = moment();
  let daysUntilLastExpiry = moment.duration(lastExpiry.diff(now)).asDays();
  let dateRange = range(0, daysUntilLastExpiry, 16);

  let maxRisk = 0;
  let maxProfit = -99999;
  let calcs: NumMap<NumMap<any>> = {};
  predictedPriceRange.forEach(predictedPrice => {
    calcs[predictedPrice] = {};
    dateRange.forEach(daysFromNow => {
      calcs[predictedPrice][daysFromNow] = { price: 0, profit: 0 };
      Object.values(state.options).forEach(option => {
        let yearsToExpiry =
          moment
            .duration(
              moment.unix(option.expiry).diff(moment().add(daysFromNow, "days"))
            )
            .asDays() / 360.0;
        let modifier = option.sale === OptionSale.Buy ? 1 : -1;
        let optionProjectedPrice = 0;
        console.log("IV", state.iv);
        if (yearsToExpiry > 0) {
          optionProjectedPrice = bs.blackScholes(
            predictedPrice,
            option.strike,
            yearsToExpiry,
            state.iv,
            INTEREST_RATE,
            option.type
          );
        } else if (option.type === OptionType.Call) {
          optionProjectedPrice = Math.max(0, predictedPrice - option.strike);
        } else if (option.type === OptionType.Put) {
          optionProjectedPrice = Math.max(0, option.strike - predictedPrice);
        }
        if (isNaN(optionProjectedPrice)) {
          optionProjectedPrice = 0;
        }
        calcs[predictedPrice][daysFromNow]["profit"] +=
          (optionProjectedPrice * modifier +
            effectivePrice(option) * -modifier) *
          100 *
          option.quantity;
        calcs[predictedPrice][daysFromNow]["price"] +=
          optionProjectedPrice * modifier;
      });
      maxRisk = Math.min(maxRisk, calcs[predictedPrice][daysFromNow]["profit"]);
      maxProfit = Math.max(
        maxProfit,
        calcs[predictedPrice][daysFromNow]["profit"]
      );
    });
  });

  let entryCost = Object.values(state.options)
    .map(o => effectivePrice(o) * 100 * (o.sale === OptionSale.Buy ? -1 : 1))
    .reduce((a, b) => a + b, 0);

  return (
    <div className={classes.pageContainer}>
      <Grid container direction="row" justify="space-between">
        <Grid item xs={12} md={3}>
          <Grid
            container
            direction="column"
            justify="center"
            alignItems="stretch"
            spacing={0}
          >
            <GridColumn>
              <SymbolCard
                iv={state.iv}
                className={classes.marginBot4}
                symbol={state.symbol}
                price={state.price}
                dispatch={dispatch}
              />
              {state.options.map(option => {
                if (option.editing) {
                  return (
                    <OptionCard
                      id={option.id}
                      iv={state.iv}
                      currentPrice={state.price}
                      dispatch={dispatch}
                      option={option}
                      symbol={state.symbol}
                    />
                  );
                } else {
                  return (
                    <FixedOptionCard
                      id={option.id}
                      dispatch={dispatch}
                      option={option}
                      symbol={state.symbol}
                    />
                  );
                }
              })}
              <Tooltip title="Add Option">
                <Fab color="primary" onClick={e => dispatch({ type: "add" })}>
                  <AddIcon />
                </Fab>
              </Tooltip>
            </GridColumn>
          </Grid>
        </Grid>

        <Grid item sm={12} md={8}>
          <Grid
            direction="column"
            container
            justify="center"
            alignItems="center"
            spacing={1}
          >
            <Grid
              direction="row"
              item
              container
              justify="center"
              alignItems="center"
              spacing={1}
            >
              <Grid item>
                Max Risk: ${maxRisk.toFixed(2)} <br />
                Max Profit: ${maxProfit.toFixed(2)}
              </Grid>
              <Grid item>
                Entry {entryCost > 0 ? "Credit" : "Debit"}: $
                {entryCost.toFixed(2)} <br />
                Max Gains: {((maxProfit / -maxRisk) * 100).toFixed(0)}%
              </Grid>
            </Grid>

            <Grid item>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell className={classes.headerCell}>
                        Price
                      </TableCell>
                      {dateRange.map(d => (
                        <TableCell key={d} className={classes.headerCell}>
                          {moment()
                            .add(d, "days")
                            .format("MM/DD")}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {predictedPriceRange.map(price => {
                      return (
                        <TableRow>
                          <Tooltip
                            enterDelay={300}
                            title={`${(
                              ((price - state.price) / state.price) *
                              100
                            ).toFixed(0)}%`}
                          >
                            <TableCell className={classes.headerCell}>
                              ${price}
                            </TableCell>
                          </Tooltip>
                          {dateRange.map(date => {
                            return (
                              // <Tooltip
                              //   enterDelay={3000}
                              //   interactive
                              //   title={<></>
                              // <div>
                              //   <Typography color="inherit">
                              //     Breakdown
                              //   </Typography>
                              //   <Table>
                              //     <TableRow>
                              //       <TableCell style={{ color: "#ffffff" }}>
                              //         SPY 4/20 $420c
                              //       </TableCell>
                              //       <TableCell>15</TableCell>
                              //     </TableRow>
                              //     <TableRow>
                              //       <TableCell>
                              //         SPY 4/20 $420c
                              //       </TableCell>
                              //       <TableCell>15</TableCell>
                              //     </TableRow>
                              //   </Table>
                              // </div>
                              //   }
                              // >
                              <TableCell
                                style={{
                                  backgroundColor: gradient(
                                    maxRisk,
                                    maxProfit,
                                    calcs[price][date]["profit"]
                                  )
                                }}
                                className={classes.smallCell}
                              >
                                {state.display.profit ===
                                ProfitDisplay.PercentRisk
                                  ? (
                                      (calcs[price][date]["profit"] /
                                        (-1 * maxRisk)) *
                                      100
                                    ).toFixed(0)
                                  : calcs[price][date]["profit"].toFixed(2)}
                              </TableCell>
                              // </Tooltip>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            <Grid
              item
              container
              direction="row"
              justify="center"
              alignItems="flex-end"
              spacing={1}
            >
              <Grid item>
                <FormControl>
                  <InputLabel id="display-select-label">Display</InputLabel>
                  <Select
                    autoWidth
                    labelId="display-select-label"
                    value={state.display.profit}
                    onChange={e =>
                      dispatch({
                        type: "display",
                        payload: { field: "profit", value: e.target.value }
                      })
                    }
                  >
                    <MenuItem value={ProfitDisplay.Absolute}>
                      Absolute Profit
                    </MenuItem>
                    <MenuItem value={ProfitDisplay.PercentRisk}>
                      Percent of Max Risk
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item>
                <TextField
                  variant="outlined"
                  size="small"
                  defaultValue={state.display.minPrice}
                  label="Min Price"
                  onChange={e =>
                    dispatch({
                      type: "display",
                      payload: {
                        field: "minPrice",
                        value: Number(e.target.value)
                      }
                    })
                  }
                ></TextField>
              </Grid>
              <Grid item>
                <TextField
                  variant="outlined"
                  size="small"
                  defaultValue={state.display.maxPrice}
                  label="Max Price"
                  onChange={e =>
                    dispatch({
                      type: "display",
                      payload: {
                        field: "maxPrice",
                        value: Number(e.target.value)
                      }
                    })
                  }
                ></TextField>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </div>
  );
}

export default App;
