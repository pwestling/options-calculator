import React, { useState, useCallback, useReducer, useMemo } from "react";
import Grid from "@material-ui/core/Grid";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import { makeStyles, styled } from "@material-ui/core/styles";
import bs from "black-scholes";
import moment from "moment";
import TextField from "@material-ui/core/TextField";
import Fab from "@material-ui/core/Fab";
import Button from "@material-ui/core/Button";
import AddIcon from "@material-ui/icons/Add";
import CheckIcon from "@material-ui/icons/Check";
import EditIcon from "@material-ui/icons/Edit";
import DeleteIcon from "@material-ui/icons/Delete";
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
import RadioGroup from "@material-ui/core/RadioGroup";
import Radio from "@material-ui/core/Radio";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormGroup from "@material-ui/core/FormGroup";
import FormControl from "@material-ui/core/FormControl";
import FormHelperText from "@material-ui/core/FormHelperText";
import base64url from "base64url";

import { v4 as uuidv4 } from "uuid";
import produce from "immer";
import "bootstrap/dist/css/bootstrap.css";

import "./App.css";
import { IconButton } from "@material-ui/core";

// Initialize Cloud Firestore through Firebase
const INTEREST_RATE = 0.0;

const useStyles = makeStyles({
  root: {
    minWidth: 500
  },
  credit: {
    color: "green"
  },
  debit: {
    color: "red"
  },
  bullet: {
    display: "inline-block",
    margin: "0 2px",
    transform: "scale(0.8)"
  },
  title: {
    fontSize: 14
  },
  pos: {
    marginBottom: 12
  },
  container: {
    paddingTop: "4em"
  },
  inline: {
    display: "flex",
    flexDirection: "row"
  },
  pageContainer: {
    margin: "3em"
  },
  smallCell: {
    padding: "3px"
  },
  headerCell: {
    padding: "3px",
    fontWeight: 800
  },
  marginBot4: {
    marginBottom: "2em"
  }
});

interface OptionMap {
  [key: string]: Option;
}

interface Dispatch {
  (action: Action): void;
}

enum ProfitDisplay {
  Absolute,
  PercentRisk
}

type DisplayOptions = {
  profit: ProfitDisplay;
  maxPrice?: number;
  minPrice?: number;
};

type State = {
  options: OptionMap;
  symbol: string;
  price: number;
  iv: number;
  display: DisplayOptions;
  nextOptId: number;
};

// function serializeState(state : State) : string {
//    const optionSerializedSize
// }

enum OptionField {
  Strike = "strike",
  Price = "price",
  Quantity = "quantity",
  Expiry = "expiry",
  Type = "type",
  Editing = "editing",
  Sale = "sale"
}

enum OptionSale {
  Buy = "buy",
  Sell = "sell"
}

enum OptionType {
  Call = "call",
  Put = "put"
}

type AddOption = { type: "add" };
type RemoveOption = { type: "remove"; payload: { id: string } };

type ModifyOption = {
  type: "modify-option";
  payload: { id: string; field: OptionField; value: any };
};
type ModifySymbol = {
  type: "modify-symbol";
  payload: { symbol?: string; price?: number; iv?: number };
};

type DisplayOption = {
  type: "display";
  payload: { field: keyof DisplayOptions; value: any };
};

type Action =
  | AddOption
  | ModifyOption
  | ModifySymbol
  | RemoveOption
  | DisplayOption;

type Option = {
  id: string;
  strike: number;
  price: number;
  blackScholesPrice?: number;
  quantity: number;
  expiry: number;
  type: OptionType;
  sale: OptionSale;
  editing: boolean;
};

function effectivePrice(opt: Option): number {
  return (opt.price > 0 ? opt.price : opt.blackScholesPrice) || 0;
}

function FixedOptionCard(props: {
  dispatch: Dispatch;
  id: string;
  symbol: string;
  option: Option;
}): React.ReactElement {
  const classes = useStyles();
  const saleClass =
    props.option.sale === OptionSale.Buy ? classes.debit : classes.credit;

  const expireDate = moment.unix(props.option.expiry).format("MM/DD");
  return (
    <Card raised={true}>
      <CardContent style={{paddingBottom: "1px"}}>
        <Grid container justify="space-between" direction="row" spacing={0}>
          <Grid item sm={6} md={8}>
            <Typography
              className={classes.title}
              color="textPrimary"
              gutterBottom
            >
              {props.option.sale.toUpperCase()}
              {"  "}
              {props.symbol.toUpperCase()} {expireDate} ${props.option.strike}{" "}
              {props.option.type}
              <br /> {props.option.quantity} @ $
              {effectivePrice(props.option).toFixed(2)}
            </Typography>
          </Grid>
          <Grid item>
            <Typography className={saleClass} gutterBottom>
              $
              {(
                effectivePrice(props.option) *
                props.option.quantity *
                100
              ).toFixed(2)}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
      <CardActions disableSpacing>
        <IconButton
          size="small"
          onClick={() =>
            props.dispatch({
              type: "modify-option",
              payload: { id: props.id, field: OptionField.Editing, value: true }
            })
          }
        >
          <EditIcon />
        </IconButton>
        <IconButton
          size="small"
          onClick={() =>
            props.dispatch({ type: "remove", payload: { id: props.id } })
          }
        >
          <DeleteIcon />
        </IconButton>
      </CardActions>
    </Card>
  );
}

function OptionCard(props: {
  dispatch: Dispatch;
  id: string;
  symbol: string;
  currentPrice: number;
  iv: number;
  option: Option;
}): React.ReactElement {
  let change = useCallback(
    (field: OptionField, processor: (val: string) => any) => (event: any) => {
      props.dispatch({
        type: "modify-option",
        payload: {
          id: props.id,
          field: field,
          value: processor(event.target.value)
        }
      });
    },
    []
  );

  let parseDate: (val: string) => number = val => {
    try {
      let entered = moment(val);
      let now = moment();
      if (entered.year() === 2001) {
        entered.year(now.year());
      }
      if (entered.isBefore(now)) {
        entered.add(1, "year");
      }
      return entered.unix();
    } catch (e) {
      console.log("Could not parse " + val);
      return 0;
    }
  };

  return (
    <Card style={{ marginBottom: "1em" }} raised={true}>
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={6} md={4}>
            <TextField
              variant="outlined"
              size="small"
              label="Strike"
              value={props.option.strike > 0 ? props.option.strike : null}
              onChange={change(OptionField.Strike, Number)}
            />
          </Grid>
          <Grid item xs={6} md={4}>
            <TextField
              variant="outlined"
              size="small"
              defaultValue={moment.unix(props.option.expiry).format("MM/DD")}
              label="Expiry"
              onChange={change(OptionField.Expiry, parseDate)}
            />
          </Grid>
          <Grid item xs={6} md={4}>
            <FormControl>
              <TextField
                variant="outlined"
                size="small"
                label="Price"
                placeholder={props.option.blackScholesPrice?.toFixed(2)}
                defaultValue={
                  props.option.price > 0 ? props.option.price.toFixed(2) : null
                }
                onChange={change(OptionField.Price, Number)}
              />
              <Tooltip
                title={`The Black-Scholes equation indicates this option should cost $${(
                  props.option.blackScholesPrice || 0
                ).toFixed(2)}  based on the IV and current price`}
              >
                <FormHelperText>{`BS: ${(
                  props.option.blackScholesPrice || 0
                ).toFixed(2)}`}</FormHelperText>
              </Tooltip>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={4}>
            <TextField
              variant="outlined"
              size="small"
              label="Quantity"
              value={props.option.quantity}
              onChange={change(OptionField.Quantity, Number)}
            />
          </Grid>
          <Grid item xs={6} md={4}>
            <RadioGroup
              name="putCall"
              value={props.option.type}
              onChange={change(OptionField.Type, x => x)}
            >
              <FormControlLabel
                value={OptionType.Put}
                control={<Radio />}
                label="Put"
              />
              <FormControlLabel
                value={OptionType.Call}
                control={<Radio />}
                label="Call"
              />
            </RadioGroup>
          </Grid>
          <Grid item xs={6} md={4}>
            <RadioGroup
              name="buySell"
              value={props.option.sale}
              onChange={change(OptionField.Sale, x => x)}
            >
              <FormControlLabel
                value={OptionSale.Buy}
                control={<Radio />}
                label="Buy"
              />
              <FormControlLabel
                value={OptionSale.Sell}
                control={<Radio />}
                label="Sell"
              />
            </RadioGroup>
          </Grid>
          <Grid item xs={6} md={4}>
            <Fab
              size="small"
              color="secondary"
              onClick={e => {
                props.dispatch({
                  type: "modify-option",
                  payload: {
                    id: props.id,
                    field: OptionField.Editing,
                    value: false
                  }
                });
              }}
            >
              <CheckIcon />
            </Fab>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

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
        <Grid container justify="flex-start" alignItems="flex-end" direction="row" spacing={3}>
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
              defaultValue={props.price}
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

              defaultValue={props.iv}
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

function App(): React.ReactElement {
  const classes = useStyles();

  var urlParams = new URLSearchParams(window.location.search);

  const initialArg: State = useMemo(() => {
    if (urlParams.has("state")) {
      try {
        let buf = new Buffer(
          base64url.decode(urlParams.get("state") as string, "hex"),
          "hex"
        );
        return msgpack.decode(buf);
      } catch (e) {
        console.log("State is invalid", e);
      }
    }
    return {
      options: {},
      symbol: "SPY",
      display: { profit: ProfitDisplay.PercentRisk },
      nextOptId: 0
    };
  }, []);

  const [state, dispatch] = useReducer(
    (state: State, action: Action): State => {
      let newstate = produce(state, draft => {
        switch (action.type) {
          case "add": {
            let id = state.nextOptId.toString();
            draft.nextOptId = state.nextOptId + 1;
            draft.options[id] = {
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
            };
            break;
          }
          case "remove": {
            delete draft.options[action.payload.id];
            break;
          }
          case "modify-option": {
            let option = draft.options[action.payload.id];
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
        let buf = msgpack.encode(newstate);
        let encoded = base64url.encode(buf.toString("hex"), "hex");
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
              {Object.entries(state.options).map(([id, option]) => {
                if (option.editing) {
                  return (
                    <OptionCard
                      id={id}
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
                      id={id}
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
                Max Gains:{" "}
                {((maxProfit / -maxRisk) * 100).toFixed(0)}%
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
                        <TableCell className={classes.headerCell}>
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
