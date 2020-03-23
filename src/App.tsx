import React, { useState, useCallback, useReducer, useMemo } from "react";
import Button from "@material-ui/core/Button";
import Container from "@material-ui/core/Container";
import Grid from "@material-ui/core/Grid";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import { makeStyles, styled } from "@material-ui/core/styles";
import bs from "black-scholes";
import moment, { Moment } from "moment";
import TextField from "@material-ui/core/TextField";
import Fab from "@material-ui/core/Fab";
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
import msgpack from "msgpack-lite";

import { v4 as uuidv4 } from "uuid";
import produce from "immer";
import "bootstrap/dist/css/bootstrap.css";

import "./App.css";

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
    fontSize: 18
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
};

type State = {
  options: OptionMap;
  symbol: string;
  price: number;
  iv: number;
  display: DisplayOptions;
};

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
  quantity: number;
  expiry: number;
  type: OptionType;
  sale: OptionSale;
  editing: boolean;
};

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
      <CardContent>
        <Grid container direction="row">
          <Grid item xs={10}>
            <Typography
              className={classes.title}
              color="textPrimary"
              gutterBottom
            >
              {props.option.sale.toUpperCase()}
              {"  "}
              {props.symbol.toUpperCase()} {expireDate} ${props.option.strike}{" "}
              {props.option.type}
              <br /> {props.option.quantity} @ ${props.option.price.toFixed(2)}
            </Typography>
          </Grid>
          <Grid item xs={2}>
            <Typography className={saleClass} gutterBottom>
              ${(props.option.price * props.option.quantity).toFixed(2)}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
      <CardActions disableSpacing>
        <Button
          onClick={() =>
            props.dispatch({
              type: "modify-option",
              payload: { id: props.id, field: OptionField.Editing, value: true }
            })
          }
        >
          <EditIcon />
        </Button>
        <Button
          onClick={() =>
            props.dispatch({ type: "remove", payload: { id: props.id } })
          }
        >
          <DeleteIcon />
        </Button>
      </CardActions>
    </Card>
  );
}

function OptionCard(props: {
  dispatch: Dispatch;
  id: string;
  symbol: string;
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
      console.log(entered.format("MM/DD/YYYY"));
      return entered.unix();
    } catch (e) {
      console.log("Cloud not parse " + val);
      return 0;
    }
  };
  return (
    <Card raised={true}>
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={6} md={4}>
            <TextField
              size="medium"
              label="Strike"
              value={props.option.strike > 0 ? props.option.strike : null}
              onChange={change(OptionField.Strike, Number)}
            />
          </Grid>
          <Grid item xs={6} md={4}>
            <TextField
              size="small"
              defaultValue={moment.unix(props.option.expiry).format("MM/DD")}
              label="Expiry"
              onChange={change(OptionField.Expiry, parseDate)}
            />
          </Grid>
          <Grid item xs={6} md={4}>
            <TextField
              size="small"
              label="Price"
              defaultValue={
                props.option.price > 0 ? props.option.price.toFixed(2) : null
              }
              onChange={change(OptionField.Price, Number)}
            />
          </Grid>
          <Grid item xs={6} md={4}>
            <TextField
              size="small"
              label="Quantity"
              value={props.option.quantity}
              onChange={change(OptionField.Quantity, Number)}
            />
          </Grid>
          <Grid item xs={6} md={4}>
            <Select
              autoWidth
              value={props.option.type}
              onChange={change(OptionField.Type, x => x)}
            >
              <MenuItem value={OptionType.Put}>Put</MenuItem>
              <MenuItem value={OptionType.Call}>Call</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={6} md={4}>
            <Select
              autoWidth
              value={props.option.sale}
              onChange={change(OptionField.Sale, x => x)}
            >
              <MenuItem value={OptionSale.Buy}>Buy</MenuItem>
              <MenuItem value={OptionSale.Sell}>Sell</MenuItem>
            </Select>
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
  iv: number;
  symbol: string;
  price: number;
}): React.ReactElement {
  return (
    <Card>
      <CardContent>
        <TextField
          size="small"
          label="Symbol"
          value={props.symbol}
          onChange={e =>
            props.dispatch({
              type: "modify-symbol",
              payload: { symbol: e.target.value }
            })
          }
        />
        <TextField
          size="small"
          label="Price"
          value={props.price}
          onChange={e =>
            props.dispatch({
              type: "modify-symbol",
              payload: { price: Number(e.target.value) }
            })
          }
        />
        <TextField
          size="small"
          label="IV"
          defaultValue={props.iv}
          onChange={e =>
            props.dispatch({
              type: "modify-symbol",
              payload: { iv: Number(e.target.value) }
            })
          }
        />
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
  let incr = Math.floor(Math.max(1, (end - start) / buckets));
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

function App(): React.ReactElement {
  const classes = useStyles();

  var urlParams = new URLSearchParams(window.location.search);

  const initialArg: State = useMemo(() => {
    if (urlParams.has("state")) {
      return msgpack.decode(
        new Buffer(urlParams.get("state") as string, "base64")
      );
    } else {
      return {
        options: {
          abc: {
            id: "abc",
            strike: 240,
            expiry: 1584917751,
            quantity: 15,
            price: 3.5,
            type: OptionType.Put,
            sale: OptionSale.Buy,
            editing: true
          }
        },
        symbol: "SPY",
        price: 232.21,
        iv: 0.77,
        display: { profit: ProfitDisplay.PercentRisk }
      };
    }
  }, []);

  const [state, dispatch] = useReducer(
    (state: State, action: Action): State => {
      let newstate = produce(state, draft => {
        switch (action.type) {
          case "add": {
            let id = uuidv4();
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
                  : moment().unix(),
              type: OptionType.Put,
              editing: true,
              sale: OptionSale.Buy
            };
            console.log(state.options);
            break;
          }
          case "remove": {
            delete draft.options[action.payload.id];
            break;
          }
          case "modify-option": {
            console.log("modifying");
            let option = draft.options[action.payload.id];
            (option[action.payload.field] as any) = action.payload.value;
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
            break;
          }
          case "display": {
            (draft.display[action.payload.field] as any) = action.payload.value;
            break;
          }
        }
      });
      let encoded = msgpack.encode(newstate).toString("base64");
      window.history.pushState("", "", `/?state=${encoded}`);

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

  let maxStrike = Math.ceil(
    strikes.reduce((a, b) => {
      return Math.max(a, b);
    }, 0) * 1.3
  );
  let minStrike = Math.floor(
    strikes.reduce((a, b) => {
      return Math.min(a, b);
    }, maxStrike) * 0.7
  );
  let predictedPriceRange = range(minStrike, maxStrike, 20).reverse();

  let now = moment();
  let daysUntilLastExpiry = moment.duration(lastExpiry.diff(now)).asDays() + 1;
  console.log("Days until last exp", daysUntilLastExpiry);
  let dateRange = range(0, daysUntilLastExpiry, 16);
  console.log("date range", dateRange);

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
        console.log(state.iv);
        if (yearsToExpiry > 0) {
          optionProjectedPrice = bs.blackScholes(
            predictedPrice,
            option.strike,
            yearsToExpiry,
            state.iv,
            0.025,
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
          (optionProjectedPrice * modifier + option.price * -modifier) *
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

  return (
    <div className={classes.pageContainer}>
      <Grid container direction="row" justify="space-between">
        <Grid item xs={12} md={3}>
          <Grid
            container
            direction="column"
            justify="center"
            alignItems="stretch"
            spacing={3}
          >
            <GridColumn>
              <SymbolCard
                iv={state.iv}
                symbol={state.symbol}
                price={state.price}
                dispatch={dispatch}
              />
              {Object.entries(state.options).map(([id, option]) => {
                if (option.editing) {
                  return (
                    <OptionCard
                      id={id}
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
              <Fab color="primary" onClick={e => dispatch({ type: "add" })}>
                <AddIcon />
              </Fab>
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
            <Grid item>
              Max Risk: ${maxRisk.toFixed(2)} <br />
              Max Profit: ${maxProfit.toFixed(2)}
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
                          <TableCell className={classes.headerCell}>
                            ${price}
                          </TableCell>
                          {dateRange.map(date => {
                            return (
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
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            <Grid item>
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
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </div>
  );
}

export default App;
