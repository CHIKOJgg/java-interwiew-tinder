# Demystifying Perpetual Funding Rate Arbitrage: Math, Real Cross-Exchange Spreads, and Liquidation Risk Frameworks

**Target Subreddit:** r/algotrading

Hey r/algotrading,

With the ongoing market volatility, here is an in-depth breakdown of perpetual funding rate arbitrage across 31 crypto exchanges:

### Concept:
Perpetual contracts have no expiration. To anchor perp prices to spot index, exchanges levy a funding rate:
- If positive: Longs pay Shorts.
- If negative: Shorts pay Longs.

Because liquidity varies between exchanges, identical pairs frequently exhibit significant spreads:
- Exchange A (Short): receives +0.25%/day
- Exchange B (Long): pays -0.04%/day
- Net Spread: +0.21%/day (~76% Annualized APR)

### Math & Payback:
- Friction (4 entry/exit orders at 0.04%): 0.16%
- Payback period: ~18 hours.
- Market Delta: Net Zero. Complete indifference to asset price swings.

### Risk Controls:
- Keep leverage below 3x to prevent liquidation imbalances.
- Minimum 24h market depth > $1M.

Live scanner and open metrics: https://funding.up.railway.app