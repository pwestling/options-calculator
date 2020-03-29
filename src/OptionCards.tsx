import React, { useCallback} from "react";
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
import Tooltip from "@material-ui/core/Tooltip";
import RadioGroup from "@material-ui/core/RadioGroup";
import Radio from "@material-ui/core/Radio";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormControl from "@material-ui/core/FormControl";
import FormHelperText from "@material-ui/core/FormHelperText";
import { useStyles } from "./Styles";
import { effectivePrice } from "./Helpers";

import { IconButton } from "@material-ui/core";

import {
  Option,
  Dispatch,
  OptionField,
  OptionSale,
  OptionType,
} from "./Types";

export function FixedOptionCard(props: {
  dispatch: Dispatch;
  id: number;
  symbol: string;
  option: Option;
}): React.ReactElement {
  const classes = useStyles();
  const saleClass =
    props.option.sale === OptionSale.Buy ? classes.debit : classes.credit;

  const expireDate = moment.unix(props.option.expiry).format("MM/DD");
  return (
    <Card raised={true}>
      <CardContent style={{ paddingBottom: "1px" }}>
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

export function OptionCard(props: {
  dispatch: Dispatch;
  id: number;
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
