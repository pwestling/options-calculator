import React, {
  useState,
  useCallback,
  useEffect,
  useReducer,
  useMemo,
  useRef,
} from "react";
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
import TableSortLabel from "@material-ui/core/TableSortLabel";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import Tooltip from "@material-ui/core/Tooltip";
import Autocomplete from "@material-ui/lab/Autocomplete";
import Box from "@material-ui/core/Box";

import msgpack from "notepack";
import FormControl from "@material-ui/core/FormControl";
import base64url from "base64url";
import { useStyles } from "./Styles";
import YahooFinance, { Expiration } from "yahoo-finance-client-ts";
import { OptionChain, OptionMeta, Quote, ContractData, ContractDataByStrike } from "yahoo-finance-client-ts";

import {
  Symbol,
} from "./Types";

type Updater<T> = (arg: T) => void
const emptySymbol : Symbol = { symbol: "", name: "", price: { actual: 0, toUse: 0 } }

const yf = window.location.host.includes("localhost")
  ? new YahooFinance("https://query1.finance.yahoo.com/v7/finance")
  : new YahooFinance(
      `${window.location.protocol}//${window.location.host}/finance`
    );

function quotetoSymbol(s: string, q: Quote): Promise<Symbol> {
  return yf.optionMeta(q.symbol || "").then((om) => {
    return  {
      symbol: q.symbol || s,
      name: q.longName || "",
      price: { actual: q.regularMarketPrice, toUse: 0 },
      meta: om
    }
  })
}

function updateSymbol(symbolStr: string): Promise<Symbol> {
  return yf.quote(symbolStr)
  .then(q => quotetoSymbol(symbolStr, q))
  .catch(r => { return { symbol: symbolStr, name: "", price: { actual: 0, toUse: 0 }}});
}

function SymbolCard(props: {
  setSymbol: Updater<Symbol>;
  setExpiration: Updater<Expiration | null>;
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
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              variant="outlined"
              size="small"
              label="Symbol"
              margin="none"
              helperText={props.symbol?.name}
              onChange={(e: any) => {
                props.setExpiration(null)
                return updateSymbol(e?.target?.value).then(props.setSymbol)
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl>
              <TextField
                variant="outlined"
                size="small"
                label="Stock Price"
                placeholder={props.symbol.price.actual?.toFixed(2)}
                margin="none"
                contentEditable={false}
                error={!!props.symbol.price.error}
                helperText={props.symbol.price.error}
                value={
                  props.symbol.price.user !== undefined
                    ? props.symbol.price.user
                    : props.symbol.price.actual
                }
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
          <Autocomplete
              freeSolo
              blurOnSelect
              size="small"
              id="combo-box-expiry"
              options={props.symbol.meta ? props.symbol.meta.expirations : []}
              // inputValue={props.option.expiry.user}
              getOptionLabel={(option) => {
                if (typeof option === "string") {
                  return option;
                } else {
                  return option.expirationString;
                }
              }}
              onChange={(event: any, value: any, reason: string) => {
                props.setExpiration(value)
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Expiry"
                  variant="outlined"
                />
              )}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

type OptionCache = {
  [symbol: string]: OptionChain;
};

type SortHandler = {
  key: string;
  sortFn(data: ContractData): number;
  direction: "asc" | "desc"
}

function sortBy<T>(keyFn: (e: T) => number, dir: "asc" | "desc"): (e1: T, e2: T) => number {
  let mult = dir === "asc" ? 1 : -1;
  return (e1,e2) => {
    const val1 = keyFn(e1)
    const val2 = keyFn(e2)
    if(val1 > val2){
      return 1 * mult
    }else if(val2 > val1){
      return -1 * mult
    }else{
      return 0
    }
  }
}

export function ThetaPage(props: {}): React.ReactElement {
  const [symbol, setSymbol] = useState(emptySymbol)
  const [expiration, setExpiration] = useState<Expiration | null>(null)
  const [minReturn, setMinReturn] = useState<Number>(0)
  const [maxStrike, setMaxStrike] = useState<Number>(9999999999999999)
  const [maxEffPrice, setMaxEffPrice] = useState<Number>(9999999999999999)

  const [optionCache, setOptionCache] = useState({} as OptionCache)
  const classes = useStyles();

  const optionData = useMemo(async () => {
    if(symbol.meta && expiration != null){
      console.log(symbol.symbol, expiration)
       const chain = await yf.options(symbol.symbol, expiration.expirationTimestamp)
       setOptionCache((oldCache) => {
        const newCache = Object.assign({}, oldCache)
        newCache[symbol.symbol +":"+expiration.expirationTimestamp] = chain
        console.log("Set", newCache)
        return newCache
      })
    }
  }, [symbol, expiration])

  const targetData: ContractDataByStrike = optionCache[symbol.symbol +":"+expiration?.expirationTimestamp] ?
  optionCache[symbol.symbol +":"+expiration?.expirationTimestamp].put : {}
  console.log("Render")
  console.log(Object.keys(targetData))
  var dte = 0
  var compoundingPower = 0
  if(expiration){
    let now = moment();
    let expiry = moment.unix(expiration.expirationTimestamp)
    dte = moment.duration(expiry.diff(now)).asDays();
    compoundingPower = 365/dte
  }

  const strikeSort = (cd: ContractData) => cd.strike || 0
  const effSort = (cd: ContractData) => (cd.strike || 0) - (cd.lastPrice || 0)
  const returnSort = (cd: ContractData) =>  (cd.lastPrice || 0)/(cd.strike || 0)
  const openInterestSort = (cd: ContractData) =>  (cd.openInterest || 0)

  const [sorter, setSorter] = useState<SortHandler>({key: "strike", sortFn: strikeSort, direction: "asc"})
  const contracts: ContractData[] = Object.values(targetData) as ContractData[]
  const sortedTargetData: ContractData[] = contracts.sort(sortBy(sorter.sortFn, sorter.direction))
    .filter(cd => returnSort(cd) > minReturn)
    .filter(cd => strikeSort(cd) < maxStrike)
    .filter(cd => effSort(cd) < maxEffPrice)

  return <>
    <SymbolCard setSymbol={setSymbol} setExpiration={setExpiration} symbol={symbol}/>
    <div className={classes.pageContainer}>
    <Grid container spacing={3}>
    <Grid item xs={6} sm={3} xl={1}>
      <Card >
        <CardContent>
          <FormControl>
              <TextField
                variant="outlined"
                size="small"
                label="Min Return"
                margin="none"
                onChange={(e) => {
                  const returnNum = Number.parseFloat(e?.target?.value)
                  if(isNaN(returnNum)){
                    setMinReturn(-1)
                  }else{
                    setMinReturn(returnNum/100)
                  }
                }}
              />
            </FormControl>
        </CardContent>
      </Card>
      </Grid>
      <Grid item xs={6} sm={3} xl={1}>
      <Card >
        <CardContent>
          <FormControl>
              <TextField
                variant="outlined"
                size="small"
                label="Max Strike"
                margin="none"
                onChange={(e) => {
                  const returnNum = Number.parseFloat(e?.target?.value)
                  if(isNaN(returnNum)){
                    setMaxStrike(9999999999)
                  }else{
                    setMaxStrike(returnNum)
                  }
                }}
              />
            </FormControl>
        </CardContent>
      </Card>
      </Grid>
      <Grid item xs={6} sm={3} xl={1}>
      <Card >
        <CardContent>
          <FormControl>
              <TextField
                variant="outlined"
                size="small"
                label="Max Eff. Price"
                margin="none"
                onChange={(e) => {
                  const returnNum = Number.parseFloat(e?.target?.value)
                  if(isNaN(returnNum)){
                    setMaxEffPrice(9999999999)
                  }else{
                    setMaxEffPrice(returnNum)
                  }
                }}
              />
            </FormControl>
        </CardContent>
      </Card>
      </Grid>
      </Grid>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <TableSortLabel
                active={sorter.key === 'strike'}
                direction={sorter.direction}
                onClick={() => {
                  setSorter({
                    key: "strike",
                    sortFn: strikeSort,
                    direction: sorter.key !== 'strike' ? sorter.direction : (sorter.direction === "asc" ? "desc" : "asc")
                  })
                }}
              >
              Strike
              </TableSortLabel>
            </TableCell>
            <TableCell>
              Price
            </TableCell>
            <TableCell>
            <TableSortLabel
                active={sorter.key === 'effprice'}
                direction={sorter.direction}
                onClick={() => {
                  setSorter({
                    key: "effprice",
                    sortFn: effSort,
                    direction: sorter.key !== 'effprice' ? sorter.direction : (sorter.direction === "asc" ? "desc" : "asc")
                  })
                }}
              >
              Effective Share Price
              </TableSortLabel>
            </TableCell>
            <TableCell>
              Implied Volatility
            </TableCell>
            <TableCell>
            <TableSortLabel
                active={sorter.key === 'openint'}
                direction={sorter.direction}
                onClick={() => {
                  setSorter({
                    key: "openint",
                    sortFn: openInterestSort,
                    direction: sorter.key !== 'openint' ? sorter.direction : (sorter.direction === "asc" ? "desc" : "asc")
                  })
                }}
              >
              Open Interest
              </TableSortLabel>
            </TableCell>
            <TableCell>
            <TableSortLabel
                active={sorter.key === 'return'}
                direction={sorter.direction}
                onClick={() => {
                  setSorter({
                    key: "return",
                    sortFn: returnSort,
                    direction: sorter.key !== 'return' ? sorter.direction : (sorter.direction === "asc" ? "desc" : "asc")
                  })
                }}
              >
              Return
              </TableSortLabel>
            </TableCell>
            <TableCell>
              Annualized Return (Compounding)
            </TableCell>
          </TableRow>
        </TableHead>
    {sortedTargetData.map((opt: ContractData) => 
      {
      console.log("Card", opt.strike)
      const strikePrice =opt.strike || 0;
      if(opt){
        const percentReturn = (opt.lastPrice || opt.bid || 0)/strikePrice
        const compoundReturn = Math.pow((1+percentReturn), compoundingPower)
        return <TableRow>
          <TableCell>${strikePrice}</TableCell>
          <TableCell>${opt.lastPrice}</TableCell>
          <TableCell>${(strikePrice - (opt.lastPrice || 0)).toFixed(2)}</TableCell>
          <TableCell>{((opt.impliedVolatility || 0) * 100).toFixed(0)}%</TableCell>
          <TableCell>{opt.openInterest}</TableCell>

          <TableCell>{(percentReturn * 100).toFixed(2)}%</TableCell>
          <TableCell>{((compoundReturn - 1) * 100).toFixed(2)}%</TableCell>

        </TableRow>
      }else{
        return <></>
      }
      }
    )}
    </Table>
    </div>
    </>
}