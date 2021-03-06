import React, {
  useState,
  useCallback,
  useEffect,
  useReducer,
  useMemo,
  useRef,
} from "react";
import { useDebounce } from "react-use";
import { Link, Switch, Route, BrowserRouter } from "react-router-dom";
import Grid from "@material-ui/core/Grid";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";

import bs from "black-scholes";
import moment from "moment";
import TextField from "@material-ui/core/TextField";
import Fab from "@material-ui/core/Fab";
import Button from "@material-ui/core/Button";
import AddIcon from "@material-ui/icons/Add";
import LinkIcon from "@material-ui/icons/Link";
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
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Box from '@material-ui/core/Box'
import ThemeProvider from "@material-ui/styles/ThemeProvider"
import { createMuiTheme } from '@material-ui/core/styles';
import CssBaseline from "@material-ui/core/CssBaseline";

import msgpack from "notepack";
import FormControl from "@material-ui/core/FormControl";
import base64url from "base64url";
import { useStyles } from "./Styles";
import YahooFinance from "yahoo-finance-client-ts";
import { OptionChain, OptionMeta } from "yahoo-finance-client-ts";

import {
  reducer,
  initialState,
  storeState,
  retrieveState,
  symbolPrice,
} from "./State";
import { v4 as uuidv4 } from "uuid";
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
  OptionMap,
  OptionSale,
  OptionType,
  RemoveOption,
  OptionCache,
  Symbol,
} from "./Types";
import { OptionCard, FixedOptionCard } from "./OptionCards";
import { ThetaPage } from "./Theta";

// import { StrategyCard } from "./Strategies";

const INTEREST_RATE = 0.0;

function SymbolCard(props: {
  dispatch: Dispatch;
  className?: any;
  symbol: Symbol;
}): React.ReactElement {
  return (
    <Card className={props.className} raised>
      <CardContent>
        <Grid
          container
          justify="flex-start"
          alignItems="flex-start"
          direction="row"
          spacing={3}
        >
          <Grid item xs={12} sm={6}>
            <TextField
              variant="outlined"
              size="small"
              label="Symbol"
              margin="none"
              helperText={props.symbol.name}
              value={props.symbol.symbol}
              onChange={(e: any) =>
                props.dispatch({
                  type: "modify-symbol",
                  payload: { symbol: e?.target?.value || "" },
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
                placeholder={props.symbol.price.actual?.toFixed(2)}
                margin="none"
                error={!!props.symbol.price.error}
                helperText={props.symbol.price.error}
                value={
                  props.symbol.price.user !== undefined
                    ? props.symbol.price.user
                    : props.symbol.price.actual
                }
                onChange={(e) => {
                  props.dispatch({
                    type: "modify-symbol",
                    payload: { userPrice: e.target.value },
                  });
                }}
                onBlur={(e: any) => {
                  if (!e.target.value) {
                    props.dispatch({
                      type: "modify-symbol",
                      payload: { userPrice: null },
                    });
                  }
                }}
              />
            </FormControl>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

function GridColumn(props: { children: React.ReactNode }): React.ReactElement {
  return (
    <>
      {React.Children.map(props.children, (child) => (
        <Grid item> {child} </Grid>
      ))}
    </>
  );
}

function TabPanel(props: any) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      id={`wrapped-tabpanel-${index}`}
      aria-labelledby={`wrapped-tab-${index}`}
      {...other}
    >
      {(
        <Box>
          {children}
        </Box>
      )}
    </div>
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

const cache = {} as any;

const darkTheme = createMuiTheme({
  palette: {
    type: 'dark',
    background: {
      paper: "rgba(20,20,20,1)",
      default: "rgba(0,0,0,1)"
    }
  },
});

function App(): React.ReactElement {
  const classes = useStyles();

  var urlParams = new URLSearchParams(window.location.search);

  useEffect(() => {
    if (urlParams.has("code")) {
      try {
        retrieveState(urlParams.get("code") as string).then((result) => {
          if (result !== null) {
            dispatch({ type: "set-state", payload: result });
          }
        });
      } catch (e) {
        console.log("State is invalid", e);
      }
    }
  }, []);

  let [permalink, setPermalink] = useState("");

  const [selectedTab, setSelectedTab] = React.useState('thetacalc');

  const handleChange = (event: any, newValue: string) => {
    setSelectedTab(newValue);
  };

  const initialArg: State = useMemo(() => {
    return initialState(urlParams);
  }, []);

  let dispatchRef = useRef<Dispatch>();

  const [state, dispatch] = useReducer(reducer(dispatchRef), initialArg);
  dispatchRef.current = dispatch;

  let strikes = Object.values(state.options).map((o) => o.strike.toUse).concat([state.symbol.price.toUse]);
  let lastExpiry = moment.unix(
    Object.values(state.options)
      .filter((o) => o.expiry.toUse !== undefined)
      .map((o) => o.expiry.toUse.expirationTimestamp)
      .reduce((a, b) => Math.max(a, b), 0)
  );

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
  predictedPriceRange.forEach((predictedPrice) => {
    calcs[predictedPrice] = {};
    dateRange.forEach((daysFromNow) => {
      calcs[predictedPrice][daysFromNow] = { price: 0, profit: 0 };
      Object.values(state.options)
        .filter((o) => !o.hidden)
        .forEach((option) => {
          let yearsToExpiry =
            moment
              .duration(
                moment
                  .unix(option.expiry.toUse.expirationTimestamp)
                  .diff(moment().add(daysFromNow, "days"))
              )
              .asDays() / 360.0;
          let modifier = option.sale === OptionSale.Buy ? 1 : -1;
          let optionProjectedPrice = 0;
          if (yearsToExpiry > 0) {
            optionProjectedPrice = bs.blackScholes(
              predictedPrice,
              option.strike.toUse,
              yearsToExpiry,
              option.iv,
              INTEREST_RATE,
              option.type
            );
          } else if (option.type === OptionType.Call) {
            optionProjectedPrice = Math.max(
              0,
              predictedPrice - option.strike.toUse
            );
          } else if (option.type === OptionType.Put) {
            optionProjectedPrice = Math.max(
              0,
              option.strike.toUse - predictedPrice
            );
          }
          if (isNaN(optionProjectedPrice)) {
            optionProjectedPrice = 0;
          }
          calcs[predictedPrice][daysFromNow]["profit"] +=
            (optionProjectedPrice * modifier + option.price.toUse * -modifier) *
            100 *
            option.quantity.toUse;
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
    .filter((o) => !o.hidden)
    .map(
      (o) =>
        o.price.toUse *
        o.quantity.toUse *
        100 *
        (o.sale === OptionSale.Buy ? -1 : 1)
    )
    .reduce((a, b) => a + b, 0);
  if (state.loaded) {
    return (
      <ThemeProvider theme={darkTheme}>
         <CssBaseline />
        <Box>
      <BrowserRouter>
      <Route
          path="/"
          render={({ location } : any) => (<>
        <AppBar position="static">
          <Tabs value={location.pathname} onChange={handleChange} aria-label="simple tabs example">
            <Tab className={classes.tabLink} value="/optcalc" label="Options Calculator" component={Link} to={"/optcalc"}/>
            <Tab className={classes.tabLink} value="/thetacalc" label="Options Data"  component={Link} to={"/thetacalc"}/>
          </Tabs>
        </AppBar>
        <Switch>
        <Route path={"/thetacalc"} render={() => 
          <TabPanel value={location.pathname} index="thetacalc">
            <ThetaPage/>
          </TabPanel>
       } />
        <Route path={"/optcalc"}>
        <TabPanel value={location.pathname} index="optcalc">
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
                    className={classes.marginBot4}
                    symbol={state.symbol}
                    dispatch={dispatch}
                  />
                  {state.options.map((option) => {
                    if (option.editing) {
                      return (
                        <OptionCard
                          dispatch={dispatch}
                          option={option}
                          symbol={state.symbol}
                        />
                      );
                    } else {
                      return (
                        <FixedOptionCard
                          dispatch={dispatch}
                          option={option}
                          symbol={state.symbol}
                        />
                      );
                    }
                  })}
                  {/* <StrategyCard
                    dispatch={dispatch}
                    symbol={state.symbol}
                    optionData={optionData}
                    options={state.options}
                    price={state.price}
                    optionMeta={optionMeta || undefined}
                  /> */}
                  <Tooltip title="Add Option">
                    <Fab
                      color="primary"
                      onClick={(e) => dispatch({ type: "add" })}
                    >
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
                          {dateRange.map((d) => (
                            <TableCell key={d} className={classes.headerCell}>
                              {moment().add(d, "days").format("MM/DD")}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {predictedPriceRange.map((price) => {
                          return (
                            <TableRow>
                              <Tooltip
                                enterDelay={300}
                                title={`${(
                                  ((price - symbolPrice(state.symbol)) /
                                    symbolPrice(state.symbol)) *
                                  100
                                ).toFixed(0)}%`}
                              >
                                <TableCell className={classes.headerCell}>
                                  ${price}
                                </TableCell>
                              </Tooltip>
                              {dateRange.map((date) => {
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
                                      ),
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
                  alignItems="center"
                  spacing={1}
                  style={{ marginTop: "0.5em" }}
                >
                  <Grid item>
                    <TextField
                      select
                      variant="outlined"
                      size="small"
                      label="Display"
                      value={state.display.profit}
                      onChange={(e) =>
                        dispatch({
                          type: "display",
                          payload: { field: "profit", value: e.target.value },
                        })
                      }
                    >
                      <MenuItem value={ProfitDisplay.Absolute}>
                        Absolute Profit
                      </MenuItem>
                      <MenuItem value={ProfitDisplay.PercentRisk}>
                        Percent of Max Risk
                      </MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item>
                    <TextField
                      variant="outlined"
                      size="small"
                      defaultValue={state.display.minPrice}
                      label="Min Price"
                      onChange={(e) =>
                        dispatch({
                          type: "display",
                          payload: {
                            field: "minPrice",
                            value: Number(e.target.value),
                          },
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
                      onChange={(e) =>
                        dispatch({
                          type: "display",
                          payload: {
                            field: "maxPrice",
                            value: Number(e.target.value),
                          },
                        })
                      }
                    ></TextField>
                  </Grid>
                  <Grid item>
                    <Tooltip title="Create Permalink">
                      <Button
                        variant="outlined"
                        onClick={() => {
                          storeState(state).then((result) => {
                            setPermalink(
                              `${window.location.protocol}/${window.location.host}?code=${result}`
                            );
                            window.history.pushState("", "", `?code=${result}`);
                          });
                        }}
                      >
                        <LinkIcon />
                      </Button>
                    </Tooltip>
                  </Grid>
                </Grid>
                {permalink.length > 0 ? (
                  <Grid
                    item
                    container
                    justify="flex-start"
                    alignContent="flex-start"
                    xs={6}
                  >
                    <TextField
                      fullWidth
                      value={permalink}
                      label="Permalink"
                      variant="outlined"
                      contentEditable={false}
                    />
                  </Grid>
                ) : (
                  <></>
                )}
              </Grid>
            </Grid>
          </Grid>
          </div>
        </TabPanel></Route></Switch></>)}
        />
        </BrowserRouter>
        </Box>
        </ThemeProvider>
    );
  } else {
    return <></>;
  }
}

export default App;
