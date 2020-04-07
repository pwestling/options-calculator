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
import Autocomplete from "@material-ui/lab/Autocomplete";
import RadioGroup from "@material-ui/core/RadioGroup";
import Radio from "@material-ui/core/Radio";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormControl from "@material-ui/core/FormControl";
import FormHelperText from "@material-ui/core/FormHelperText";
import { useStyles } from "./Styles";
import { ContractData, OptionMeta } from "yahoo-finance-client-ts";

import { IconButton } from "@material-ui/core";

import {
  Option,
  Dispatch,
  OptionSale,
  OptionType,
  OptionCache,
  Symbol,
} from "./Types";

export function FixedOptionCard(props: {
  dispatch: Dispatch;
  symbol: Symbol;
  option: Option;
}): React.ReactElement {
  const classes = useStyles();
  const saleClass =
    props.option.sale === OptionSale.Buy ? classes.debit : classes.credit;

  let mutedClass = props.option.hidden === true ? " " + classes.muted : "";
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
              {props.symbol.symbol.toUpperCase()} {props.option.expiry.toUse.expirationString} $
              {props.option.strike.toUse} {props.option.type}
              <br /> {props.option.quantity.toUse} @ $
              {props.option.price.toUse.toFixed(2)}
            </Typography>
          </Grid>
          <Grid item>
            <Typography className={saleClass + mutedClass} gutterBottom>
              $
              {(
                props.option.price.toUse *
                props.option.quantity.toUse *
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
              payload: { id: props.option.id, field: "editing", value: true },
            })
          }
        >
          <EditIcon />
        </IconButton>
        <IconButton
          size="small"
          onClick={() =>
            props.dispatch({ type: "remove", payload: { id: props.option.id } })
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
                id: props.option.id,
                field: "hidden",
                value: !props.option.hidden,
              },
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
  symbol: Symbol;
  option: Option;
}): React.ReactElement {
  let { option, symbol, dispatch } = props;
  let spreadString = null;
  if (
    props.option.contract &&
    props.option.contract?.bid &&
    props.option.contract?.ask
  ) {
    spreadString = `$${props.option.contract.bid} - $${props.option.contract.ask}`;
  }

  return (
    <Card style={{ marginBottom: "1em" }} raised={true}>
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={6} md={4}>
            <Autocomplete
              freeSolo
              blurOnSelect
              size="small"
              id="combo-box-strike"
              options={props.symbol.meta ? props.symbol.meta.strikes : []}
              getOptionLabel={(option) => option.toString()}
              inputValue={props.option.strike.user || ""}
              onInputChange={(event: any, value: string, reason: string) => {
                if (reason !== "reset" || value) {
                  props.dispatch({
                    type: "modify-option",
                    payload: {
                      id: props.option.id,
                      field: "strike",
                      value: value,
                    },
                  });
                }
              }}
              renderInput={(params) => (
                <TextField {...params} label="Strike" variant="outlined" />
              )}
            />
          </Grid>
          <Grid item xs={6} md={4}>
            <Autocomplete
              freeSolo
              blurOnSelect
              size="small"
              id="combo-box-expiry"
              options={props.symbol.meta ? props.symbol.meta.expirations : []}
              inputValue={props.option.expiry.user}
              getOptionLabel={(option) => {
                if (typeof option === "string") {
                  return option;
                } else {
                  return option.expirationString;
                }
              }}
              onInputChange={(event: any, value: any, reason: string) => {
                console.log("Change", value, reason);

                if (value) {
                  props.dispatch({
                    type: "modify-option",
                    payload: {
                      id: props.option.id,
                      field: "expiry",
                      value: value,
                    },
                  });
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Expiry"
                  error={!!props.option.expiry.error}
                  helperText={props.option.expiry.error}
                  variant="outlined"
                />
              )}
            />
          </Grid>
          <Grid item xs={6} md={4}>
            <FormControl>
              <TextField
                onChange={(e) => {
                  props.dispatch({
                    type: "modify-option",
                    payload: {
                      id: props.option.id,
                      field: "price",
                      value: e.target.value,
                    },
                  });
                }}
                variant="outlined"
                size="small"
                label="Price"
                placeholder={props.option.price.actual?.toFixed(2)}
                value={
                  props.option.price.user !== undefined
                    ? props.option.price.user
                    : props.option.price.actual?.toFixed(2) || 0
                }
                helperText={spreadString ? spreadString : null}
                onBlur={(e) => {
                  if (!e.target.value) {
                    props.dispatch({
                      type: "modify-option",
                      payload: {
                        id: props.option.id,
                        field: "price",
                        value: null,
                      },
                    });
                  }
                }}
              />
            </FormControl>
          </Grid>
          <Grid item xs={6} md={4}>
            <TextField
              variant="outlined"
              size="small"
              label="Quantity"
              value={props.option.quantity.user}
              onChange={(event) => {
                props.dispatch({
                  type: "modify-option",
                  payload: {
                    id: props.option.id,
                    field: "quantity",
                    value: event.target.value,
                  },
                });
              }}
            />
          </Grid>
          <Grid item xs={6} md={4}>
            <RadioGroup
              name="putCall"
              value={props.option.type}
              onChange={(event) => {
                props.dispatch({
                  type: "modify-option",
                  payload: {
                    id: props.option.id,
                    field: "type",
                    value: event.target.value,
                  },
                });
              }}
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
              onChange={(event) => {
                props.dispatch({
                  type: "modify-option",
                  payload: {
                    id: props.option.id,
                    field: "sale",
                    value: event.target.value,
                  },
                });
              }}
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
              onClick={(e) => {
                props.dispatch({
                  type: "modify-option",
                  payload: {
                    id: props.option.id,
                    field: "editing",
                    value: false,
                  },
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
