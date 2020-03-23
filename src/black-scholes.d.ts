declare module "black-scholes" {
  export enum OptionType {
    Call = "call",
    Put = "put"
  }

  declare function blackScholes(
    current_price: number,
    strike_price: number,
    years_until_expiration: number,
    iv_decimal: number,
    intrest_rate: number,
    type: OptionType
  ): number;
}
