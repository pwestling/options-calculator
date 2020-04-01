import React, { useCallback, useState, useEffect } from "react";
import Grid from "@material-ui/core/Grid";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import moment from "moment";
import TextField from "@material-ui/core/TextField";
import Fab from "@material-ui/core/Fab";
import CheckIcon from "@material-ui/icons/Check";
import EditIcon from "@material-ui/icons/Edit";
import DeleteIcon from "@material-ui/icons/Delete";
import VisibleIcon from "@material-ui/icons/Visibility";
import InvisibleIcon from "@material-ui/icons/VisibilityOff";
import Tooltip from "@material-ui/core/Tooltip";
import RadioGroup from "@material-ui/core/RadioGroup";
import Radio from "@material-ui/core/Radio";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormControl from "@material-ui/core/FormControl";
import FormHelperText from "@material-ui/core/FormHelperText";
import { useStyles } from "./Styles";
import { effectivePrice } from "./Helpers";
import { ContractData } from "yahoo-finance-client-ts";

import { IconButton } from "@material-ui/core";

import { Option, Dispatch, OptionSale, OptionType, OptionCache } from "./Types";

function getPrice(
  option: Option,
  contract: ContractData | null
): number | undefined {
  if (contract) {
    let contractPrice =
      option.sale === OptionSale.Buy ? contract.ask : contract.bid;
    contractPrice =
      contractPrice && contractPrice > 0 ? contractPrice : contract.lastPrice;
    return contractPrice;
  } else {
    return undefined;
  }
}

export function FixedOptionCard(props: {
  dispatch: Dispatch;
  id: number;
  symbol: string;
  option: Option;
}): React.ReactElement {
  const classes = useStyles();
  const saleClass =
    props.option.sale === OptionSale.Buy ? classes.debit : classes.credit;

  let mutedClass = props.option.hidden === true ? " " + classes.muted : "";
  console.log(props.option);
  const expireDate = moment.unix(props.option.expiry).format("MM/DD");
  return (
    <Card raised={true}>
      <CardContent style={{ paddingBottom: "1px" }}>
        <Grid container justify="space-between" direction="row" spacing={0}>
          <Grid item sm={6} md={8}>
            <Typography
              className={classes.title + mutedClass}
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
            <Typography className={saleClass + mutedClass} gutterBottom>
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
              payload: { id: props.id, field: "editing", value: true }
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
        <IconButton
          size="small"
          onClick={() =>
            props.dispatch({
              type: "modify-option",
              payload: {
                id: props.id,
                field: "hidden",
                value: !props.option.hidden
              }
            })
          }
        >
          {props.option.hidden ? <InvisibleIcon /> : <VisibleIcon />}
        </IconButton>
      </CardActions>
    </Card>
  );
}

export function OptionCard(props: {
  dispatch: Dispatch;
  id: number;
  symbol: string;
  currentPrice: number;
  iv: number;
  option: Option;
  optionData: OptionCache;
}): React.ReactElement {
  let { option, optionData, symbol, id, dispatch } = props;
  let { strike, expiry } = option;
  let [contract, setContract] = useState<ContractData | null>(null);
  let [priceStr, setPriceStr] = useState(
    props.option.price > 0 ? props.option.price.toFixed(2) : ""
  );
  let [userSetPrice, setUserSetPrice] = useState(false);

  console.log("render");
  useEffect(() => {
    console.log("effect", strike, expiry, symbol, id, dispatch);
    optionData(symbol, moment.unix(option.expiry).format("YYYY/MM/DD")).then(
      data => {
        console.log(data);
        if (data) {
          let contract = data[option.type][option.strike];
          console.log(option.type, option.strike);
          console.log(contract);
          if (contract) {
            setContract(contract);
            let contractPrice = getPrice(option, contract);
            console.log("Prices", option.price, contractPrice);
            if (option.price !== contractPrice && !userSetPrice) {
              setPriceStr(contractPrice?.toFixed(2) || priceStr);
              dispatch({
                type: "modify-option",
                payload: {
                  id: id,
                  field: "price",
                  value: contractPrice
                }
              });
              dispatch({
                type: "modify-option",
                payload: {
                  id: id,
                  field: "iv",
                  value: contract.impliedVolatility
                }
              });
            }
          } else {
            setContract(null);
            if (option.price !== contractPrice && !userSetPrice) {
              setPriceStr("");
              dispatch({
                type: "modify-option",
                payload: {
                  id: id,
                  field: "price",
                  value: 0
                }
              });
              dispatch({
                type: "modify-option",
                payload: {
                  id: id,
                  field: "iv",
                  value: 0
                }
              });
            }
          }
        }
        return 0;
      }
    );
  }, [strike, expiry, symbol, id, dispatch]);

  let change = useCallback(
    (field: keyof Option, processor: (val: string) => any) => (event: any) => {
      props.dispatch({
        type: "modify-option",
        payload: {
          id: props.id,
          field: field,
          value: processor(event.target.value)
        }
      });
    },
    [props]
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
  console.log("render2");

  let contractPrice = getPrice(option, contract);

  return (
    <Card style={{ marginBottom: "1em" }} raised={true}>
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={6} md={4}>
            <TextField
              variant="outlined"
              size="small"
              label="Strike"
              value={props.option.strike > 0 ? props.option.strike : ""}
              onChange={change("strike", Number)}
            />
          </Grid>
          <Grid item xs={6} md={4}>
            <TextField
              error={props.option.strike > 0 && !contract}
              helperText={
                props.option.strike > 0 && !contract
                  ? "No contracts for this date"
                  : ""
              }
              variant="outlined"
              size="small"
              defaultValue={moment.unix(props.option.expiry).format("MM/DD")}
              label="Expiry"
              onChange={change("expiry", parseDate)}
            />
          </Grid>
          <Grid item xs={6} md={4}>
            <FormControl>
              <TextField
                onChange={e => {
                  setPriceStr(e.target.value);
                  if (e.target.value && e.target.value !== "") {
                    setUserSetPrice(true);
                  } else {
                    setUserSetPrice(false);
                  }
                  change("price", Number)(e);
                }}
                variant="outlined"
                size="small"
                label="Price"
                placeholder={contractPrice?.toFixed(2)}
                value={priceStr}
                onBlur={e => {
                  if (!userSetPrice && contractPrice) {
                    setPriceStr(contractPrice.toFixed(2));
                    props.dispatch({
                      type: "modify-option",
                      payload: {
                        id: props.id,
                        field: "price",
                        value: contractPrice
                      }
                    });
                  }
                }}
              />
              {/* <Tooltip
                title={`The Black-Scholes equation indicates this option should cost $${(
                  props.option.blackScholesPrice || 0
                ).toFixed(2)}  based on the IV and current price`}
              >
                <FormHelperText>{`BS: ${(
                  props.option.blackScholesPrice || 0
                ).toFixed(2)}`}</FormHelperText>
              </Tooltip> */}
            </FormControl>
          </Grid>
          <Grid item xs={6} md={4}>
            <TextField
              variant="outlined"
              size="small"
              label="Quantity"
              value={props.option.quantity}
              onChange={change("quantity", Number)}
            />
          </Grid>
          <Grid item xs={6} md={4}>
            <RadioGroup
              name="putCall"
              value={props.option.type}
              onChange={change("type", x => x)}
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
              onChange={change("sale", x => x)}
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
                    field: "editing",
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
