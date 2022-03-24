# Handcount

This is an (originally private) nodejs program that I created in order to automate the accounting and exporting of certain blockchain transactions of mine.

> _**Do NOT use this for production purposes.**_
> 
> _**Handcount** was and is a program specifically developed for my own personal use only and, as is, in its current state, I do not recommend that anyone rely on its output, nor make any decisions based thereupon, for any business or personal finance matters. This repo was made public for reference purposes only._

## Background

The primary focus was initially only centered around exporting non-custodial [Handshake](https://handshake.org) transactions into a CSV format which I could then import into the Delta portfolio tracking app (they don’t support Handshake wallet tracking and I don’t suspect any similar apps do either).

I ended up expanding it to also pull HNS-BTC exchange transactions & transfers from Bittrex, as well as process non-custodial Bitcoin wallet transactions in order to reconcile and account for all that related activity together.

To take it to the next level, I started to implement processing of Ethereum txs, but at this stage of complexity, I’m gonna have to un-spaghettify and refactor all the ad-hoc code if I’m to continue pushing it any further.

## Overview

### Handshake
Requires connecting to an [hsw](https://github.com/handshake-org/hsd) server using the configured URL and API keys. In practice this just means keeping the [Bob Wallet](https://github.com/kyokan/bob-wallet) application open and copying the generated API keys it provides into `config.json` along with setting the URL to `localhost`.

HD wallet name and (sub)account name from which to pull tx history should also be specified in `config.json`.

### Everything else
All additional tx data is sourced from either centralized entities and/or via third-party APIs rather than directly from a blockchain. Non-custodial Bitcoin wallet txs, for example, are pulled indirectly using Blockchain.info’s explorer API for any given wallet address(es).

### Architecture
What architecture?

It incorporates no more and no less functionality than what I need personally and it executes in a beeline towards that end (e.g. don’t want to pull exchange txs? gonna have to untangle all that code and see if the rest of the logic still works).

## License
Copyright © 2021 [Neel Yadav](https://neelyadav.com/) <br>All rights reserved.

This project is unlicensed.
