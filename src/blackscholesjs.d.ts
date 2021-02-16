declare module "blackscholesjs/js/blackscholes" {
  
  
  declare class BSHolder{
    constructor(underlyingPrice: number,
                strike: number,
                interest: number,
                vola: number,
                term: number
    );
  }

  declare namespace BS {
    function cdelta(bs: BSHolder): number;
    function pdelta(bs: BSHolder): number;
  }
}