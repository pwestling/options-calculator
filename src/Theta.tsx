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
import CardHeader from "@material-ui/core/CardHeader";

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
import Typography from "@material-ui/core/Typography"

import msgpack from "notepack";
import FormControl from "@material-ui/core/FormControl";
import base64url from "base64url";
import { useStyles } from "./Styles";
import YahooFinance, { Expiration } from "yahoo-finance-client-ts";
import { OptionChain, OptionMeta, Quote, ContractData, ContractDataByStrike } from "yahoo-finance-client-ts";

import {
  Symbol,
  OptionType
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
  setPutOrCall: Updater<OptionType>;
  putOrCall: OptionType
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
                // props.setExpiration(null)
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
          <Select
              id="combo-box-type"
              style={{width: "100%"}}
              value={props.putOrCall}
              autoWidth
              onChange={(event: any) => {
                props.setPutOrCall(event.target.value)
              }}
            >
                <MenuItem value={OptionType.Put}>Put</MenuItem>
                <MenuItem value={OptionType.Call}>Call</MenuItem>
              </Select>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
          <Autocomplete
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
  sortFn: ContractSorter;
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

type ContractSorter = (data: ContractData) => number

function SortableColHeader(props: {name: string, sorter: SortHandler, sortFn: ContractSorter, setSorter: Updater<SortHandler>}):  React.ReactElement {
  return  <TableCell>
            <TableSortLabel
              active={props.sorter.key === props.name}
              direction={props.sorter.direction}
              onClick={() => {
                props.setSorter({
                  key: props.name,
                  sortFn: props.sortFn,
                  direction: props.sorter.key !== props.name ? props.sorter.direction : (props.sorter.direction === "asc" ? "desc" : "asc")
                })
              }}
            >
            {props.name}
            </TableSortLabel>
          </TableCell>
} 

export function ThetaPage(props: {}): React.ReactElement {
  const [symbol, setSymbol] = useState(emptySymbol)
  const [putOrCall, setPutOrCall] = useState<OptionType>(OptionType.Put)
  const [expiration, setExpiration] = useState<Expiration | null>(null)
  const [minReturn, setMinReturn] = useState<Number>(0)
  const [maxStrike, setMaxStrike] = useState<Number>(99999999999999)
  const [maxEffPrice, setMaxEffPrice] = useState<Number>(99999999999999)
  const [minOpenInterest, setMinOpenInterest] = useState<Number>(0)
  const [hypotheticalIV, setHypotheticalIV] = useState<number>(0)
  const [hypotheticalUnderlying, setHypotheticalUnderlying] = useState<number>(0)

  const [optionCache, setOptionCache] = useState({} as OptionCache)
  const classes = useStyles();

  const cacheKey = symbol.symbol + ":" + expiration?.expirationTimestamp;

  useMemo(async () => {
    if(symbol.meta && expiration != null){
      console.log(symbol.symbol, expiration)
      console.log("Fetching", symbol, expiration)
        if(optionCache[cacheKey] === undefined){
          try{
          const chain = await yf.options(symbol.symbol, expiration.expirationTimestamp)
          setOptionCache((oldCache) => {
            const newCache = Object.assign({}, oldCache)
            newCache[cacheKey] = chain
            console.log("Set", newCache)
            return newCache
          })
        } catch(e){
          //pass
        }
      }
    }
  }, [symbol, expiration])

  const targetDataChain: OptionChain | undefined = optionCache[symbol.symbol +":"+expiration?.expirationTimestamp]
  const targetData = (putOrCall === OptionType.Put ? targetDataChain?.put : targetDataChain?.call) || {}
  const putData = targetDataChain?.put || {}
  const callData = targetDataChain?.call || {}

  console.log("Render")
  var dte = 0
  var compoundingPower = 0
  if(expiration){
    let now = moment();
    let expiry = moment.unix(expiration.expirationTimestamp)
    dte = moment.duration(expiry.diff(now)).asDays();
    compoundingPower = 365/dte
  }

  const strikeSort = (cd: ContractData) => cd.strike || 0
  const effSort = (cd: ContractData) => (cd.strike || 0) + ((putOrCall === "put" ? - 1 : 1) * (cd.lastPrice || 0))
  const returnSort = (cd: ContractData) =>  (cd.lastPrice || 0)/((cd.strike || 0) - (cd.lastPrice || 0))
  const openInterestSort = (cd: ContractData) =>  (cd.openInterest || 0)
  const impliedVolSort = (cd: ContractData) =>  (cd.impliedVolatility || 0)
  const whatIfSort = (cd: ContractData) =>  {
    if(cd.priceForIV && hypotheticalIV > 0){
      const ivtoUse = hypotheticalIV > 0? hypotheticalIV : undefined;
      const underlyingtoUse = hypotheticalUnderlying > 0 ? hypotheticalUnderlying : undefined
      return cd.priceForIV(ivtoUse, underlyingtoUse)
    }else{
      return 0;
    }
  }

  const [sorter, setSorter] = useState<SortHandler>({key: "strike", sortFn: strikeSort, direction: "asc"})
  const contracts: ContractData[] = Object.values(targetData) as ContractData[]
  const putContracts: ContractData[] = Object.values(putData) as ContractData[]
  const callContracts: ContractData[] = Object.values(callData) as ContractData[]

  const sortedTargetData: ContractData[] = contracts.sort(sortBy(sorter.sortFn, sorter.direction))
    .filter(cd => returnSort(cd) >= minReturn)
    .filter(cd => strikeSort(cd) <= maxStrike)
    .filter(cd => effSort(cd) <= maxEffPrice)
    .filter(cd => openInterestSort(cd) >= minOpenInterest)


  const callInterest = callContracts.map(cd => cd.openInterest || 0).reduce((a,b) => a+b, 0)
  const itmCalls = callContracts.filter(cd => (cd.strike || 0) < (symbol.price.actual || 0) )
                                .map(cd => cd.openInterest || 0).reduce((a,b) => a+b, 0)
  const callGamma = callContracts.map(cd => (cd.gamma || 0) * (cd.openInterest || 0)).reduce((a,b) => a+b, 0) 
  const callDelta = callContracts.map(cd => (cd.delta || 0) * (cd.openInterest || 0)).reduce((a,b) => a+b, 0) 

  const putInterest = putContracts.map(cd => cd.openInterest || 0).reduce((a,b) => a+b, 0)
  const itmPuts = putContracts.filter(cd => (cd.strike || 0) > (symbol.price.actual || 0) )
                                .map(cd => cd.openInterest || 0).reduce((a,b) => a+b, 0)
  const putGamma = putContracts.map(cd => (cd.gamma || 0) * (cd.openInterest || 0)).reduce((a,b) => a+b, 0) 
  const putDelta = putContracts.map(cd => (cd.delta || 0) * (cd.openInterest || 0)).reduce((a,b) => a+b, 0) 


  return <>
    <SymbolCard setSymbol={setSymbol} setExpiration={setExpiration} symbol={symbol} setPutOrCall={setPutOrCall} putOrCall={putOrCall}/>
    <div className={classes.pageContainer}>
    <Card>
     
    <CardContent>
    <Typography color="textSecondary" gutterBottom>
          Filters
    </Typography>
    <Grid container spacing={1}>
    <Grid item xs={3} sm={2}>
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
      </Grid>
      <Grid item xs={3} sm={2}>
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
      </Grid>
      <Grid item xs={3} sm={2}>
          <FormControl>
              <TextField
                variant="outlined"
                size="small"
                label="Max Exe. Price"
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
      </Grid>
      <Grid item xs={3} sm={2}>
          <FormControl>
              <TextField
                variant="outlined"
                size="small"
                label="Min Open Interest"
                margin="none"
                onChange={(e) => {
                  const returnNum = Number.parseFloat(e?.target?.value)
                  if(isNaN(returnNum)){
                    setMinOpenInterest(0)
                  }else{
                    setMinOpenInterest(returnNum)
                  }
                }}
              />
            </FormControl>
      </Grid>
      <Grid item xs={3} sm={2}>
          <FormControl>
              <TextField
                variant="outlined"
                size="small"
                label="Hypothetical IV"
                margin="none"
                onChange={(e) => {
                  const returnNum = Number.parseFloat(e?.target?.value)
                  if(isNaN(returnNum)){
                    setHypotheticalIV(0)
                  }else{
                    setHypotheticalIV(returnNum/100)
                  }
                }}
              />
            </FormControl>
      </Grid>
      <Grid item xs={3} sm={2}>
          <FormControl>
              <TextField
                variant="outlined"
                size="small"
                label="Hypothetical Price"
                margin="none"
                onChange={(e) => {
                  const returnNum = Number.parseFloat(e?.target?.value)
                  if(isNaN(returnNum)){
                    setHypotheticalUnderlying(0)
                  }else{
                    setHypotheticalUnderlying(returnNum)
                  }
                }}
              />
            </FormControl>
      </Grid>
      </Grid>
      </CardContent>
      </Card>
      <Box marginBottom={2} marginTop={2}>
    
      <Card>
      <CardContent>
      <Typography color="textSecondary" gutterBottom>
          Info
      </Typography>
      <Grid container spacing={2}>
        <Grid item xl={12}>
          <Grid item xl={3}>
          <Typography>Call Open Interest: {callInterest}</Typography>
          </Grid>
          <Grid item xl={3}>
          <Typography>ITM Call Interest: {itmCalls}</Typography>
          </Grid>
          <Grid item xl={3}>
          <Typography>Call Gamma: {callGamma.toFixed(3)}</Typography>
          </Grid>
          <Grid item xl={3}>
          <Typography>Call Delta: {callDelta.toFixed(3)}</Typography>
          </Grid>
        </Grid>
        <Grid item xl={12}>
          <Grid item xl={3}>
          <Typography>Put Open Interest: {putInterest}</Typography>
          </Grid>
          <Grid item xl={3}>
          <Typography>ITM Put Interest: {itmPuts}</Typography>
          </Grid>
          <Grid item xl={3}>
          <Typography>Put Gamma: {putGamma.toFixed(3)}</Typography>
          </Grid>
          <Grid item xl={3}>
          <Typography>Put Delta: {putDelta.toFixed(3)}</Typography>
          </Grid>
        </Grid>
        <Grid item xl={12}>
          <Grid item xl={3}>
          <Typography>Put Call Ratio: {(putInterest/callInterest).toFixed(2)}</Typography>
          </Grid>
          <Grid item xl={3}>
          <Typography>Net Gamma: {(callGamma - putGamma).toFixed(3)}</Typography>
          </Grid>
          <Grid item xl={3}>
          <Typography>Net Delta: {(callDelta + putDelta).toFixed(3)}</Typography>
          </Grid>
        </Grid>
      </Grid>
      </CardContent>
      </Card>
      </Box>
      <Table>
        <TableHead>
          <TableRow>
            <SortableColHeader name={"Strike"} sortFn={strikeSort} sorter={sorter} setSorter={setSorter} />
            <SortableColHeader name={"Price"} sortFn={(cd: ContractData) => cd.lastPrice || 0} sorter={sorter} setSorter={setSorter} />
            <SortableColHeader name={"Execution Share Price"} sortFn={effSort} sorter={sorter} setSorter={setSorter} />
            <SortableColHeader name={"Delta"} sortFn={(cd: ContractData) => cd.delta || 0} sorter={sorter} setSorter={setSorter} />
            <SortableColHeader name={"Gamma"} sortFn={(cd: ContractData) => cd.gamma || 0} sorter={sorter} setSorter={setSorter} />
            <SortableColHeader name={"Leverage"} sortFn={(cd: ContractData) => cd.leverage || 0} sorter={sorter} setSorter={setSorter} />
            <SortableColHeader name={"Implied Volatility"} sortFn={impliedVolSort} sorter={sorter} setSorter={setSorter} />
            <SortableColHeader name={"What-If Price"} sortFn={whatIfSort} sorter={sorter} setSorter={setSorter} />
            <SortableColHeader name={"Open Intrest"} sortFn={openInterestSort} sorter={sorter} setSorter={setSorter} />
            <SortableColHeader name={"DTE"} sortFn={strikeSort} sorter={sorter} setSorter={setSorter} />
            <SortableColHeader name={"Return"} sortFn={returnSort} sorter={sorter} setSorter={setSorter} />
          </TableRow>
        </TableHead>
          <TableBody>
          {sortedTargetData.map((opt: ContractData) => 
            {
            const strikePrice =opt.strike || 0;
            if(opt){
              const percentReturn = returnSort(opt)
              const compoundReturn = Math.pow((1+percentReturn), compoundingPower)
              const delta = opt.delta ?? 0
              const gamma = opt.gamma ?? 0

              return <TableRow>
                <TableCell>${strikePrice}</TableCell>
                <TableCell>${opt.lastPrice}</TableCell>
                <TableCell>${effSort(opt).toFixed(2)}</TableCell>
                <TableCell>{delta.toFixed(3)}</TableCell>
                <TableCell>{gamma.toFixed(3)}</TableCell>
                <TableCell>{(opt.leverage ?? 0).toFixed(2)}</TableCell>

                <TableCell>{((opt.impliedVolatility || 0) * 100).toFixed(0)}%</TableCell>
                <TableCell>${whatIfSort(opt).toFixed(2)}</TableCell>
                <TableCell>{opt.openInterest}</TableCell>
                <TableCell>{dte.toFixed(0)}</TableCell>
                <TableCell>{(percentReturn * 100).toFixed(2)}%</TableCell>

              </TableRow>
            }else{
              return <></>
            }
            }
          )}
      </TableBody>
    </Table>
    </div>
    </>
}